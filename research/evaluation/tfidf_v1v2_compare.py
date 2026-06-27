"""
TF-IDF V1 vs V2 Comparison Benchmark
======================================
Demonstrates the qualitative and quantitative difference between:
  V1 – Original word-level TF-IDF (generic, no position weighting)
  V2 – Character n-gram TF-IDF with lead-bias position weighting (Phase 2)

Run:
    source ../myenv/bin/activate
    python3 tfidf_v1v2_compare.py
"""

import re
import numpy as np
import textwrap
import sys
from pathlib import Path

# Add backend directory to path to allow importing modules when run directly
ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT_DIR / "backend"))

from sklearn.feature_extraction.text import TfidfVectorizer
from summarize_tfidf import (
    tfidf_summarize,
    tfidf_summarize_scored,
    CHAR_NGRAM_RANGE,
    POSITION_WEIGHT,
)

# ---------------------------------------------------------------------------
# Inline V1 implementation (frozen baseline for comparison)
# ---------------------------------------------------------------------------

def _split_v1(text: str) -> list[str]:
    parts = re.split(r"[\u0964\u0965.]", text)
    return [s.strip() for s in parts if len(s.strip()) > 0]


def tfidf_summarize_v1(text: str, num_sentences: int = 3) -> str:
    """Original word-level TF-IDF — exact copy of pre-Phase-2 code."""
    sentences = _split_v1(text)
    if len(sentences) <= num_sentences:
        return text
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform(sentences)
    sentence_scores = tfidf_matrix.sum(axis=1).A1
    top_indices = np.argsort(sentence_scores)[::-1][:num_sentences]
    return " ".join(sentences[i] for i in sorted(top_indices))


# ---------------------------------------------------------------------------
# Test articles
# ---------------------------------------------------------------------------

ARTICLES = {
    "News — morphological richness": """
        తెలంగాణ రాష్ట్రంలో వ్యవసాయ రంగం అభివృద్ధికి ప్రభుత్వం కొత్త పథకాలు ప్రకటించింది.
        రాష్ట్రానికి చెందిన రైతులకు సాగునీటి సౌకర్యాలు కల్పించేందుకు భారీ పెట్టుబడులు జరగనున్నాయి.
        రాష్ట్రంలోని అన్ని జిల్లాల్లో నీటి నిర్వహణ వ్యవస్థలు మెరుగుపరచనున్నారు.
        ఈ పథకానికి కేంద్ర ప్రభుత్వం కూడా నిధులు అందించనున్నట్లు అధికారులు తెలిపారు.
        రైతులు ఈ పథకం వల్ల లబ్ధి పొందాలంటే ఆన్‌లైన్‌లో నమోదు చేసుకోవాలని ప్రభుత్వం కోరింది.
        వ్యవసాయ శాఖ మంత్రి ఈ విషయంలో రైతు సంఘాలతో సమావేశాలు నిర్వహిస్తారు.
        ఈ పథకం అమలుకు వచ్చే ఆర్థిక సంవత్సరం నుండి నిధులు విడుదల చేయనున్నారు.
        రాష్ట్ర ప్రభుత్వం ఈ నిర్ణయాన్ని స్వాగతిస్తున్నట్లు వ్యవసాయ మంత్రి తెలిపారు.
    """.strip(),

    "News — lead sentence importance": """
        హైదరాబాద్‌లో పెద్ద ప్రమాదం సంభవించింది, ఐదుగురు మృతి చెందారు.
        సిటీ బస్సు నియంత్రణ తప్పి నదిలో పడటంతో ఈ దుర్ఘటన జరిగింది.
        పోలీసు అధికారులు సంఘటనా స్థలానికి చేరుకుని రక్షణ కార్యక్రమాలు ప్రారంభించారు.
        స్థానికులు కూడా రక్షణ కార్యక్రమాల్లో పాల్గొన్నారు.
        వైద్య బృందాలు గాయపడిన వారికి చికిత్స అందిస్తున్నాయి.
        ఘటన వివరాలను పోలీసులు దర్యాప్తు చేస్తున్నారు.
        బస్సు డ్రైవర్ నిద్రపోవడం వల్ల ఈ ప్రమాదం జరిగిందని ప్రాథమిక నివేదికలు తెలుపుతున్నాయి.
        ప్రభుత్వం మృతుల కుటుంబాలకు పరిహారం ప్రకటించింది.
    """.strip(),
}


# ---------------------------------------------------------------------------
# Comparison runner
# ---------------------------------------------------------------------------

def run_comparison(label: str, text: str, num_sentences: int = 3) -> None:
    hr = "─" * 72
    print(f"\n{'═' * 72}")
    print(f"  {label}")
    print(f"{'═' * 72}")

    v2_meta = tfidf_summarize_scored(text, num_sentences)
    v1_summary = tfidf_summarize_v1(text, num_sentences)
    v2_summary = tfidf_summarize(text, num_sentences)

    sentences = v2_meta["sentences"]
    n = len(sentences)

    # Score table
    print(f"\n  Input sentences: {n}   →   Summary sentences: {num_sentences}")
    print(f"  Config: char_wb n-gram={CHAR_NGRAM_RANGE}, "
          f"position_weight={POSITION_WEIGHT}, "
          f"score_variance={v2_meta['score_variance']:.5f}")

    print(f"\n  {'#':<4} {'TF-IDF(V2)':<12} {'Position':<12} {'Final':<12} "
          f"{'Selected':<9} {'Sentence[:50]'}")
    print(f"  {hr}")
    selected_set = set(v2_meta["selected_indices"])
    for i, s in enumerate(sentences):
        mark = "✓" if i in selected_set else " "
        ts = v2_meta["tfidf_scores"][i]
        ps = v2_meta["position_scores"][i]
        fs = v2_meta["final_scores"][i]
        preview = s[:50] + ("…" if len(s) > 50 else "")
        print(f"  {i:<4} {ts:<12.4f} {ps:<12.4f} {fs:<12.4f} {mark:<9} {preview}")

    print(f"\n  {hr}")
    print(f"\n  V1 Summary (word TF-IDF, no position):")
    print(textwrap.fill("  " + v1_summary, width=72, subsequent_indent="  "))

    print(f"\n  V2 Summary (char n-gram TF-IDF + position weighting):")
    print(textwrap.fill("  " + v2_summary, width=72, subsequent_indent="  "))

    # Show differences
    v1_sents = set(_split_v1(v1_summary))
    v2_sents = set(sentences[i] for i in v2_meta["selected_indices"])
    changed = v1_sents.symmetric_difference(v2_sents)
    if changed:
        print(f"\n  ⚡ Selection changed: V1 and V2 picked different sentences.")
    else:
        print(f"\n  ✓  V1 and V2 selected the same sentences (consistent result).")


# ---------------------------------------------------------------------------
# Also show the lead-sentence test explicitly
# ---------------------------------------------------------------------------

def run_lead_sentence_test() -> None:
    """
    Show position weighting effect: given two sentences with identical TF-IDF
    content scores, the earlier one should win in V2 but not in V1.
    """
    print(f"\n{'═' * 72}")
    print("  LEAD SENTENCE BIAS TEST")
    print(f"{'═' * 72}")
    # Construct two sentences with deliberately similar TF-IDF scores
    # by repeating the same rare word at different positions
    test = (
        "ముఖ్యమంత్రి విలేకరుల సమావేశంలో ప్రధాన నిర్ణయాన్ని ప్రకటించారు. "
        "సమావేశంలో పాల్గొన్న నేతలు సంతృప్తి వ్యక్తం చేశారు. "
        "ఈ నిర్ణయం రాష్ట్ర ఆర్థిక వ్యవస్థను బలోపేతం చేయడంలో సహాయకరంగా ఉంటుందని అధికారులు తెలిపారు. "
        "ప్రతిపక్ష నేతలు ఈ నిర్ణయాన్ని వ్యతిరేకిస్తున్నారు. "
        "ముఖ్యమంత్రి మాట్లాడుతూ, ఇది రాష్ట్ర ప్రజలకు లాభదాయకం అని చెప్పారు."
    )
    v1 = tfidf_summarize_v1(test, num_sentences=2)
    v2 = tfidf_summarize(test, num_sentences=2)
    scored = tfidf_summarize_scored(test, num_sentences=2)

    print("\n  Per-sentence final scores (V2 = 80% TF-IDF + 20% position):")
    for i, (s, fs, ps) in enumerate(
        zip(scored["sentences"], scored["final_scores"], scored["position_scores"])
    ):
        mark = "✓" if i in scored["selected_indices"] else " "
        print(f"    [{i}] {mark} score={fs:.4f}  pos={ps:.4f}  "
              f"sentence={s[:60]}…")

    print(f"\n  V1 (no position):           {v1[:100]}")
    print(f"  V2 (with position bias):    {v2[:100]}")


if __name__ == "__main__":
    print("\n" + "=" * 72)
    print("  TF-IDF V1 → V2 Comparison  |  Phase 2  |  Telugu NLP")
    print("=" * 72)
    print(f"\n  V2 settings:")
    print(f"    analyzer      = char_wb")
    print(f"    ngram_range   = {CHAR_NGRAM_RANGE}")
    print(f"    position_weight = {POSITION_WEIGHT}")
    print(f"    sublinear_tf  = True")

    for label, article in ARTICLES.items():
        run_comparison(label, article, num_sentences=3)

    run_lead_sentence_test()

    print("\n" + "=" * 72)
    print("  Benchmark complete.")
    print("=" * 72 + "\n")
