# ============================================================
# FINAL PRODUCTION EVALUATION (IEEE READY)
# Telugu News Summarization
# ============================================================

import json
import os
import re

from rouge_score import rouge_scorer
from bert_score import score as bertscore

from summarize_tfidf import tfidf_summarize
from summarize_mt5 import mT5_base_summarize, mT5_finetuned_summarize


# ============================================================
# PATH
# ============================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "telugu_test.jsonl")

LIMIT = 5   # CPU safe (increase later)


# ============================================================
# TELUGU NORMALIZATION
# ============================================================

_SP_WHITESPACE = "\u2581"  # ▁ SentencePiece artifact from mT5 decoder

def normalize_telugu(text):
    if not text:
        return ""

    # Remove SentencePiece word-boundary artifact
    text = text.replace(_SP_WHITESPACE, " ")

    # Remove BBC Telugu social media footer: "ఇవి కూడా చదవండి"
    text = re.sub("ఇవి కూడా చదవండి.*", "", text, flags=re.DOTALL)

    # Fix smart quotes / dashes
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    text = text.replace("\u2013", "-").replace("\u2014", "-")

    # Fix double periods
    text = text.replace("..", ".")

    # Normalize whitespace
    text = re.sub(r"\s+", " ", text)

    return text.strip()


# ============================================================
# TELUGU-AWARE ROUGE TOKENIZER
# ============================================================

class TeluguTokenizer:
    """
    Word-level tokenizer safe for Telugu Unicode.
    Splits on whitespace only; does NOT lowercase or strip non-ASCII chars.
    """
    def tokenize(self, text: str):
        return [t for t in text.split() if t]


def _make_scorer():
    return rouge_scorer.RougeScorer(
        ["rouge1", "rouge2", "rougeL"],
        use_stemmer=False,
        tokenizer=TeluguTokenizer(),
    )


# ============================================================
# TFIDF BOOST
# ============================================================
def tfidf_boost(article):
    boosted = article.replace("\n", ". ").replace(",", ". ")
    boosted = re.sub(r"\s+", " ", boosted)
    return tfidf_summarize(boosted)


def mt5_base_strict(article):
    return mT5_base_summarize(article, allow_fallback=False)


def mt5_finetuned_strict(article):
    return mT5_finetuned_summarize(article, allow_fallback=False)


# ============================================================
# LOAD DATASET
# ============================================================
def load_dataset(path, limit=None):
    data = []
    with open(path, "r", encoding="utf-8") as f:
        for i, line in enumerate(f):
            if limit and i >= limit:
                break
            obj = json.loads(line.strip())
            data.append((obj["text"], obj["summary"]))
    return data


dataset = load_dataset(DATA_PATH, LIMIT)
print(f"Loaded {len(dataset)} samples.")


# ============================================================
# EVALUATION FUNCTION
# ============================================================
def evaluate(model_name, fn, debug=True):
    scorer = _make_scorer()
    totals = {"rouge1": 0, "rouge2": 0, "rougeL": 0}
    preds = []
    refs = []
    empty_preds = 0

    for i, (article, reference) in enumerate(dataset, 1):
        print(f"  {model_name} [{i}/{len(dataset)}]", end="\r")

        try:
            pred = normalize_telugu(fn(article) or "")
        except Exception as exc:
            print(f"\n  ERROR: {model_name} failed on sample {i}; benchmark stopped.")
            print(f"  Root cause: {type(exc).__name__}: {exc}")
            raise
        ref  = normalize_telugu(reference)

        if debug and i == 1:
            print(f"\n[DEBUG] {model_name} — sample 1")
            print(f"  REF  (first 120 chars): {ref[:120]!r}")
            print(f"  PRED (first 120 chars): {pred[:120]!r}")
            print(f"  PRED token count: {len(pred.split())}")
            print(f"  REF  token count: {len(ref.split())}")

        if not pred.strip():
            empty_preds += 1

        preds.append(pred)
        refs.append(ref)

        scores = scorer.score(ref, pred)
        totals["rouge1"] += scores["rouge1"].fmeasure
        totals["rouge2"] += scores["rouge2"].fmeasure
        totals["rougeL"] += scores["rougeL"].fmeasure

    if empty_preds:
        print(f"\n  WARNING: {empty_preds}/{len(dataset)} predictions were empty for {model_name}!")

    n = len(dataset)
    r1 = round(totals["rouge1"] / n, 3)
    r2 = round(totals["rouge2"] / n, 3)
    rL = round(totals["rougeL"] / n, 3)

    print(f"\n  Calculating BERTScore for {model_name}...")
    P, R, F1 = bertscore(preds, refs, lang="te", verbose=False)
    bert_f1 = round(F1.mean().item(), 3)

    print(f"\n===== {model_name} =====")
    print(f"ROUGE-1  : {r1}")
    print(f"ROUGE-2  : {r2}")
    print(f"ROUGE-L  : {rL}")
    print(f"BERTScore: {bert_f1}")

    return (model_name, r1, r2, rL, bert_f1)


# ============================================================
# RUN ALL MODELS
# ============================================================
if __name__ == "__main__":
    RESULTS = []
    RESULTS.append(evaluate("TFIDF (BOOSTED)", tfidf_boost))
    RESULTS.append(evaluate("mT5 BASE",        mt5_base_strict))
    RESULTS.append(evaluate("mT5 FINETUNED",   mt5_finetuned_strict))

    print("\n===== IEEE LATEX TABLE =====")
    print("\\begin{tabular}{lcccc}")
    print("\\toprule")
    print("Model & ROUGE-1 & ROUGE-2 & ROUGE-L & BERTScore \\\\")
    print("\\midrule")
    for name, r1, r2, rL, bert in RESULTS:
        print(f"{name} & {r1} & {r2} & {rL} & {bert} \\\\")
    print("\\bottomrule")
    print("\\end{tabular}")
