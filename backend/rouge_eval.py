"""
Full-Scale Evaluation Pipeline
================================
Evaluates all summarization models on the complete XL-Sum Telugu test set
(1,302 samples) using ROUGE-1/2/L and BERTScore.

Models evaluated:
    1. TF-IDF V1  — word-level TF-IDF (frozen baseline, reproduced inline)
    2. TF-IDF V2  — character n-gram TF-IDF + position weighting (Phase 2)
    3. mT5 Base   — csebuetnlp/mT5_multilingual_XLSum (no fine-tuning)
    4. mT5 Fine-tuned — locally fine-tuned checkpoint (if available)

Features:
    - Full 1,302-sample evaluation (LIMIT removed)
    - Checkpoint/resume: partial results saved to CHECKPOINT_DIR every
      CHECKPOINT_EVERY samples so a crash never loses progress
    - Per-sample CSV output: enables failure analysis and score distributions
    - Per-model wall-clock timing (mean, median, P95, P99)
    - IEEE-ready LaTeX table at the end
    - Structured JSON results for downstream analysis

Usage:
    # Full evaluation (all models):
    python3 rouge_eval.py

    # Single model (faster iteration):
    python3 rouge_eval.py --model tfidf_v2

    # Resume from checkpoint after a crash:
    python3 rouge_eval.py --model mt5_base --resume

    # Limit samples (debug/smoke-test):
    python3 rouge_eval.py --limit 20
"""

import argparse
import csv
import json
import logging
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path

import numpy as np
from bert_score import score as bertscore
from rouge_score import rouge_scorer

from summarize_mt5 import mT5_base_summarize, mT5_finetuned_summarize, device, _run_summarize
from summarize_tfidf import tfidf_summarize  # V2 (Phase 2)

# ─────────────────────────────────────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    level=logging.INFO,
    stream=sys.stdout,
)
logger = logging.getLogger("rouge_eval")

# ─────────────────────────────────────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).parent
DATA_PATH = BASE_DIR / "data" / "telugu_test.jsonl"
RESULTS_DIR = BASE_DIR / "eval_results"
CHECKPOINT_DIR = RESULTS_DIR / "checkpoints"

RESULTS_DIR.mkdir(exist_ok=True)
CHECKPOINT_DIR.mkdir(exist_ok=True)

# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────

# Save incremental checkpoint every N samples (avoid losing progress on crash)
CHECKPOINT_EVERY = 50

# BERTScore batch size — reduce if OOM on your machine
BERTSCORE_BATCH = 64


# ─────────────────────────────────────────────────────────────────────────────
# V1 baseline (frozen — exact copy of pre-Phase-2 word-level TF-IDF)
# ─────────────────────────────────────────────────────────────────────────────

def _tfidf_v1_summarize(text: str, num_sentences: int = 3) -> str:
    """
    Frozen V1 TF-IDF baseline for evaluation comparison.
    Identical to the original summarize_tfidf.py before Phase 2.
    """
    import re as _re
    import numpy as _np
    from sklearn.feature_extraction.text import TfidfVectorizer as _TV

    def _split(t):
        parts = _re.split(r"[\u0964\u0965.]", t)
        return [s.strip() for s in parts if len(s.strip()) > 0]

    sentences = _split(text)
    if len(sentences) <= num_sentences:
        return text
    vec = _TV()
    mat = vec.fit_transform(sentences)
    scores = mat.sum(axis=1).A1
    top = _np.argsort(scores)[::-1][:num_sentences]
    return " ".join(sentences[i] for i in sorted(top))


# ─────────────────────────────────────────────────────────────────────────────
# Telugu normalisation (kept from original)
# ─────────────────────────────────────────────────────────────────────────────

_SP_WHITESPACE = "\u2581"  # ▁ SentencePiece boundary artifact


def normalize_telugu(text: str) -> str:
    if not text:
        return ""
    text = text.replace(_SP_WHITESPACE, " ")
    # Remove BBC Telugu social media footer
    text = re.sub("ఇవి కూడా చదవండి.*", "", text, flags=re.DOTALL)
    # Normalise smart quotes and dashes
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    text = text.replace("\u2013", "-").replace("\u2014", "-")
    text = text.replace("..", ".")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


# ─────────────────────────────────────────────────────────────────────────────
# Telugu-aware ROUGE tokenizer
# ─────────────────────────────────────────────────────────────────────────────

class TeluguTokenizer:
    """
    Whitespace tokenizer for Telugu.
    Does NOT lowercase or strip Unicode — essential for Indic script.
    """
    def tokenize(self, text: str) -> list[str]:
        return [t for t in text.split() if t]


def _make_rouge_scorer():
    return rouge_scorer.RougeScorer(
        ["rouge1", "rouge2", "rougeL"],
        use_stemmer=False,
        tokenizer=TeluguTokenizer(),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Model registry
# ─────────────────────────────────────────────────────────────────────────────

def _tfidf_v2_summarize(text: str) -> str:
    """V2 TF-IDF — char n-gram + position weighting (Phase 2)."""
    return tfidf_summarize(text)


def _mt5_base_strict(text: str) -> str:
    return mT5_base_summarize(text, allow_fallback=False)


def _mt5_finetuned_strict(text: str) -> str:
    return mT5_finetuned_summarize(text, allow_fallback=False)


_kaggle_tokenizer = None
_kaggle_model = None


def _mt5_kaggle_strict(text: str) -> str:
    global _kaggle_tokenizer, _kaggle_model
    if _kaggle_model is None:
        from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
        logger.info("Loading Kaggle fine-tuned model...")
        new_model_path = Path(__file__).parent / "model" / "kaggle_mt5_finetuned"
        _kaggle_tokenizer = AutoTokenizer.from_pretrained("csebuetnlp/mT5_multilingual_XLSum", use_fast=False)
        _kaggle_model = AutoModelForSeq2SeqLM.from_pretrained(str(new_model_path)).to(device)
        _kaggle_model.eval()
        logger.info("Kaggle fine-tuned model loaded successfully")
    return _run_summarize(_kaggle_tokenizer, _kaggle_model, text)


def _auto_router_strict(text: str) -> str:
    from pipeline import run_pipeline
    res = run_pipeline(text, method="auto", generate_audio=False)
    return res["summary"]


MODEL_REGISTRY: dict[str, dict] = {
    "tfidf_v1": {
        "fn": _tfidf_v1_summarize,
        "label": "TF-IDF V1 (word-level, no position)",
        "needs_gpu": False,
    },
    "tfidf_v2": {
        "fn": _tfidf_v2_summarize,
        "label": "TF-IDF V2 (char n-gram + position bias)",
        "needs_gpu": False,
    },
    "mt5_base": {
        "fn": _mt5_base_strict,
        "label": "mT5 Base (csebuetnlp/mT5_multilingual_XLSum)",
        "needs_gpu": False,
    },
    "mt5_finetuned": {
        "fn": _mt5_finetuned_strict,
        "label": "mT5 Fine-tuned (Telugu news)",
        "needs_gpu": False,
    },
    "mt5_kaggle_finetuned": {
        "fn": _mt5_kaggle_strict,
        "label": "mT5 Kaggle Fine-tuned (Telugu news)",
        "needs_gpu": False,
    },
    "auto": {
        "fn": _auto_router_strict,
        "label": "Auto Router (tfidf_v2 / mt5_base)",
        "needs_gpu": False,
    },
}


# ─────────────────────────────────────────────────────────────────────────────
# Dataset loader
# ─────────────────────────────────────────────────────────────────────────────

def load_dataset(path: Path, limit: int | None = None) -> list[dict]:
    """
    Load XL-Sum Telugu test set.  Returns list of dicts with keys:
    id, url, title, text, summary.
    """
    data = []
    with open(path, encoding="utf-8") as fh:
        for i, line in enumerate(fh):
            if limit is not None and i >= limit:
                break
            obj = json.loads(line.strip())
            data.append(obj)
    return data


# ─────────────────────────────────────────────────────────────────────────────
# Checkpoint helpers
# ─────────────────────────────────────────────────────────────────────────────

def _checkpoint_path(model_key: str) -> Path:
    return CHECKPOINT_DIR / f"{model_key}_checkpoint.jsonl"


def _load_checkpoint(model_key: str) -> dict[int, dict]:
    """Load previously computed per-sample results (keyed by sample index)."""
    cp = _checkpoint_path(model_key)
    results: dict[int, dict] = {}
    if not cp.exists():
        return results
    with open(cp, encoding="utf-8") as fh:
        for line in fh:
            row = json.loads(line.strip())
            results[row["sample_idx"]] = row
    logger.info("checkpoint_loaded model=%s samples=%d", model_key, len(results))
    return results


def _save_checkpoint(model_key: str, row: dict) -> None:
    """Append a single sample result to the checkpoint file."""
    cp = _checkpoint_path(model_key)
    with open(cp, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(row, ensure_ascii=False) + "\n")


# ─────────────────────────────────────────────────────────────────────────────
# Core evaluation
# ─────────────────────────────────────────────────────────────────────────────

def evaluate_model(
    model_key: str,
    dataset: list[dict],
    resume: bool = False,
) -> dict:
    """
    Run ROUGE + BERTScore evaluation for one model on the full dataset.

    Args:
        model_key:  Key in MODEL_REGISTRY (e.g. 'tfidf_v2', 'mt5_base').
        dataset:    List of sample dicts from load_dataset().
        resume:     If True, skip samples already in checkpoint.

    Returns:
        Dict with aggregate metrics and per-model timing stats.
    """
    cfg = MODEL_REGISTRY[model_key]
    fn = cfg["fn"]
    label = cfg["label"]
    n_total = len(dataset)

    logger.info("eval_start model=%s label=%r n=%d resume=%s", model_key, label, n_total, resume)

    # Load checkpoint if resuming
    cached: dict[int, dict] = {}
    if resume:
        cached = _load_checkpoint(model_key)
        if cached:
            logger.info("eval_resume model=%s skipping=%d", model_key, len(cached))
    else:
        # Clear stale checkpoint for a fresh run
        cp = _checkpoint_path(model_key)
        if cp.exists():
            cp.unlink()

    scorer = _make_rouge_scorer()
    preds: list[str] = []
    refs: list[str] = []
    timings: list[float] = []       # per-sample inference time (seconds)
    per_sample_rows: list[dict] = []
    empty_preds = 0
    errors = 0

    for idx, sample in enumerate(dataset):
        article = sample["text"]
        reference = sample["summary"]

        # Use cached result if available
        if idx in cached:
            row = cached[idx]
            preds.append(row["pred"])
            refs.append(row["ref"])
            timings.append(row["inference_s"])
            per_sample_rows.append(row)
            continue

        # Run inference with timing
        t_start = time.perf_counter()
        try:
            pred_raw = fn(article) or ""
        except Exception as exc:
            logger.error(
                "eval_inference_error model=%s sample_idx=%d error=%s",
                model_key, idx, exc, exc_info=True,
            )
            pred_raw = ""
            errors += 1

        inference_s = time.perf_counter() - t_start
        pred = normalize_telugu(pred_raw)
        ref = normalize_telugu(reference)

        if not pred.strip():
            empty_preds += 1

        # ROUGE per sample
        rouge_scores = scorer.score(ref, pred)
        r1 = rouge_scores["rouge1"].fmeasure
        r2 = rouge_scores["rouge2"].fmeasure
        rL = rouge_scores["rougeL"].fmeasure

        row = {
            "sample_idx": idx,
            "sample_id": sample.get("id", str(idx)),
            "pred": pred,
            "ref": ref,
            "rouge1": round(r1, 6),
            "rouge2": round(r2, 6),
            "rougeL": round(rL, 6),
            "inference_s": round(inference_s, 4),
            "pred_tokens": len(pred.split()),
            "ref_tokens": len(ref.split()),
        }

        preds.append(pred)
        refs.append(ref)
        timings.append(inference_s)
        per_sample_rows.append(row)

        # Checkpoint
        _save_checkpoint(model_key, row)

        # Progress
        if (idx + 1) % CHECKPOINT_EVERY == 0 or (idx + 1) == n_total:
            elapsed_so_far = sum(r["inference_s"] for r in per_sample_rows)
            logger.info(
                "eval_progress model=%s %d/%d  elapsed_inference=%.1fs",
                model_key, idx + 1, n_total, elapsed_so_far,
            )

    # Aggregate ROUGE
    r1_mean = float(np.mean([r["rouge1"] for r in per_sample_rows]))
    r2_mean = float(np.mean([r["rouge2"] for r in per_sample_rows]))
    rL_mean = float(np.mean([r["rougeL"] for r in per_sample_rows]))

    # BERTScore — run on full list in one batch call
    logger.info("eval_bertscore_start model=%s n=%d", model_key, len(preds))
    bs_start = time.perf_counter()
    P, R, F1 = bertscore(
        preds, refs,
        lang="te",
        verbose=False,
        batch_size=BERTSCORE_BATCH,
    )
    bs_elapsed = time.perf_counter() - bs_start
    bert_f1 = float(F1.mean().item())
    logger.info(
        "eval_bertscore_done model=%s bert_f1=%.4f elapsed=%.1fs",
        model_key, bert_f1, bs_elapsed,
    )

    # Timing statistics
    t_arr = np.array(timings)
    timing_stats = {
        "mean_s":   round(float(t_arr.mean()), 4),
        "median_s": round(float(np.median(t_arr)), 4),
        "p95_s":    round(float(np.percentile(t_arr, 95)), 4),
        "p99_s":    round(float(np.percentile(t_arr, 99)), 4),
        "total_s":  round(float(t_arr.sum()), 2),
    }

    result = {
        "model_key":   model_key,
        "label":       label,
        "n_samples":   n_total,
        "n_errors":    errors,
        "n_empty_preds": empty_preds,
        "rouge1":      round(r1_mean, 4),
        "rouge2":      round(r2_mean, 4),
        "rougeL":      round(rL_mean, 4),
        "bert_f1":     round(bert_f1, 4),
        "timing":      timing_stats,
        "per_sample":  per_sample_rows,
    }

    # Print summary
    print(f"\n{'─' * 60}")
    print(f"  {label}")
    print(f"{'─' * 60}")
    print(f"  Samples   : {n_total}  |  Errors: {errors}  |  Empty: {empty_preds}")
    print(f"  ROUGE-1   : {result['rouge1']:.4f}")
    print(f"  ROUGE-2   : {result['rouge2']:.4f}")
    print(f"  ROUGE-L   : {result['rougeL']:.4f}")
    print(f"  BERTScore : {result['bert_f1']:.4f}")
    print(f"  Latency   : mean={timing_stats['mean_s']}s  "
          f"p95={timing_stats['p95_s']}s  p99={timing_stats['p99_s']}s")

    return result


# ─────────────────────────────────────────────────────────────────────────────
# Output writers
# ─────────────────────────────────────────────────────────────────────────────

def save_results(all_results: list[dict], run_id: str) -> None:
    """Write JSON summary, per-sample CSV, and print LaTeX table."""

    # 1. JSON summary (no per_sample to keep it small)
    summary = []
    for r in all_results:
        s = {k: v for k, v in r.items() if k != "per_sample"}
        summary.append(s)

    json_path = RESULTS_DIR / f"eval_summary_{run_id}.json"
    with open(json_path, "w", encoding="utf-8") as fh:
        json.dump(summary, fh, ensure_ascii=False, indent=2)
    logger.info("eval_summary_saved path=%s", json_path)

    # 2. Per-sample CSV (all models, all samples)
    csv_path = RESULTS_DIR / f"eval_per_sample_{run_id}.csv"
    fieldnames = ["model_key", "sample_idx", "sample_id",
                  "rouge1", "rouge2", "rougeL", "inference_s",
                  "pred_tokens", "ref_tokens", "pred", "ref"]
    with open(csv_path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for r in all_results:
            for row in r.get("per_sample", []):
                writer.writerow({"model_key": r["model_key"], **row})
    logger.info("eval_per_sample_saved path=%s", csv_path)

    # 3. IEEE LaTeX table
    print(f"\n{'═' * 60}")
    print("  IEEE LaTeX Table")
    print(f"{'═' * 60}")
    print("\\begin{table}[h]")
    print("\\centering")
    print("\\caption{Evaluation Results on XL-Sum Telugu Test Set (n=" +
          str(all_results[0]['n_samples'] if all_results else 0) + ")}")
    print("\\begin{tabular}{lcccccc}")
    print("\\toprule")
    print("Model & ROUGE-1 & ROUGE-2 & ROUGE-L & BERTScore"
          " & Latency (mean) & Latency (P95) \\\\")
    print("\\midrule")
    for r in all_results:
        t = r["timing"]
        print(f"{r['label']} & {r['rouge1']:.4f} & {r['rouge2']:.4f} & "
              f"{r['rougeL']:.4f} & {r['bert_f1']:.4f} & "
              f"{t['mean_s']:.3f}s & {t['p95_s']:.3f}s \\\\")
    print("\\bottomrule")
    print("\\end{tabular}")
    print("\\end{table}")
    print()

    print(f"Results saved:")
    print(f"  Summary JSON : {json_path}")
    print(f"  Per-sample CSV: {csv_path}")


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Full-scale evaluation of Telugu summarization models."
    )
    parser.add_argument(
        "--model",
        choices=list(MODEL_REGISTRY.keys()) + ["all"],
        default="all",
        help="Which model(s) to evaluate. Default: all",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Evaluate only the first N samples (for debugging). Default: all 1302",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume from checkpoint (skip already-evaluated samples)",
    )
    parser.add_argument(
        "--skip-transformer",
        action="store_true",
        dest="skip_transformer",
        help="Skip mT5 models (run only TF-IDF variants — fast, no GPU needed)",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    run_id = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Dataset
    logger.info("dataset_load path=%s limit=%s", DATA_PATH, args.limit)
    dataset = load_dataset(DATA_PATH, limit=args.limit)
    logger.info("dataset_loaded n=%d", len(dataset))
    print(f"\nLoaded {len(dataset)} samples from XL-Sum Telugu test set.")

    # Determine which models to run
    if args.model == "all":
        model_keys = list(MODEL_REGISTRY.keys())
    else:
        model_keys = [args.model]

    if args.skip_transformer:
        model_keys = [k for k in model_keys if not k.startswith("mt5")]
        print(f"  --skip-transformer: running TF-IDF only: {model_keys}")

    print(f"  Models: {model_keys}")
    print(f"  Resume: {args.resume}")
    print(f"  Run ID: {run_id}\n")

    all_results: list[dict] = []
    eval_start = time.perf_counter()

    for key in model_keys:
        result = evaluate_model(key, dataset, resume=args.resume)
        all_results.append(result)

    total_elapsed = time.perf_counter() - eval_start
    logger.info("eval_complete total_elapsed=%.1fs", total_elapsed)

    # Save and print tables
    save_results(all_results, run_id)

    print(f"\nTotal wall-clock time: {total_elapsed/60:.1f} minutes")
