"""
TF-IDF Based Extractive Summarization (Telugu-aware)
=====================================================
Upgraded from a generic word-level TF-IDF baseline to a Telugu-specific
extractive summarizer using character n-gram TF-IDF and lead-bias position
weighting.

Research contribution:
    Two language-specific adaptations are implemented and measurable:

    1. Character n-gram TF-IDF  (analyzer="char_wb", ngram_range=(2, 4))
    -------------------------------------------------------------------
    Telugu is a highly agglutinative Dravidian language. A single root
    produces many surface forms through suffix attachment:

        రాష్ట్రం   (state, nominative)
        రాష్ట్రంలో (state, locative  – "in the state")
        రాష్ట్రానికి (state, dative  – "to the state")

    Word-level TF-IDF treats these as three completely unrelated tokens.
    Character n-grams of width 2–4 capture the shared root "రాష్ట్ర" and
    connect the three forms in the feature space, giving a more accurate
    sentence importance score.

    The "char_wb" analyzer respects word boundaries (does not form n-grams
    across spaces), which is appropriate for agglutinative morphology.

    2. Lead-bias position weighting
    --------------------------------
    Telugu news follows the inverted-pyramid convention: the most important
    facts appear in the first 1–3 sentences (the lede), with background and
    context appearing later.  A position-decay weight is blended with the
    TF-IDF score to implement this domain-specific prior:

        position_score[i] = 1 / (1 + POSITION_DECAY × i)

    The final per-sentence score is a convex combination:
        final[i] = (1 − POSITION_WEIGHT) × tfidf_norm[i]
                 + POSITION_WEIGHT       × position_norm[i]

    Both scores are independently normalised to [0, 1] before blending
    so that neither can dominate purely due to scale.

Backward compatibility:
    The public function signature `tfidf_summarize(text, num_sentences=3)`
    is unchanged.  All existing callers (pipeline.py, summarize_mt5.py
    fallback path, rouge_eval.py) continue to work without modification.

    A new `tfidf_summarize_scored(text, num_sentences)` function is also
    provided for evaluation scripts that need per-sentence scoring metadata.
"""

import re
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

# ---------------------------------------------------------------------------
# Tunable constants
# ---------------------------------------------------------------------------

#: Character n-gram range fed to TfidfVectorizer.
#: (2, 4) means bigrams, trigrams, and 4-grams of characters.
CHAR_NGRAM_RANGE: tuple[int, int] = (2, 4)

#: Fraction of the final sentence score contributed by position weighting.
#: 0.20 = 80% TF-IDF quality + 20% lead-bias position bonus.
POSITION_WEIGHT: float = 0.20

#: Position decay rate.  Score for sentence i = 1 / (1 + DECAY × i).
#: Larger values give stronger preference to earlier sentences.
POSITION_DECAY: float = 0.15

#: Minimum sentence length (characters) to keep after splitting.
#: Removes single-word fragments and dangling punctuation.
MIN_SENTENCE_CHARS: int = 12


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _split_sentences(text: str) -> list[str]:
    """
    Split Telugu text into sentences on dandas (U+0964, U+0965) and full stops.

    Filters out fragments shorter than MIN_SENTENCE_CHARS to remove
    punctuation artifacts that poison the TF-IDF vocabulary.
    """
    # U+0964 = danda (।), U+0965 = double danda (॥)
    parts = re.split(r"[\u0964\u0965.]", text)
    return [p.strip() for p in parts if len(p.strip()) >= MIN_SENTENCE_CHARS]


def _char_ngram_tfidf_scores(sentences: list[str]) -> np.ndarray:
    """
    Score each sentence by summing its character n-gram TF-IDF feature values.

    Uses ``analyzer="char_wb"`` which forms n-grams within word boundaries.
    This is better than ``analyzer="char"`` for Telugu because it does not
    create spurious n-grams that span across word boundaries (spaces).

    Scores are L-infinity normalised to [0, 1] so they can be blended
    with the position scores on a common scale.

    Returns a uniform array of ones if computation fails (safe fallback).
    """
    if len(sentences) < 2:
        return np.ones(len(sentences))

    try:
        vectorizer = TfidfVectorizer(
            analyzer="char_wb",
            ngram_range=CHAR_NGRAM_RANGE,
            min_df=1,
            sublinear_tf=True,   # log(1 + tf) instead of raw tf – dampens frequency
        )
        matrix = vectorizer.fit_transform(sentences)
        scores = np.asarray(matrix.sum(axis=1)).ravel()
        max_score = scores.max()
        if max_score == 0:
            return np.ones(len(sentences))
        return scores / max_score
    except Exception:
        return np.ones(len(sentences))


def _position_scores(n: int) -> np.ndarray:
    """
    Compute lead-bias position scores for ``n`` sentences.

    Implements the inverted-pyramid prior for news text:
    earlier sentences are more likely to contain the most newsworthy content.

    score[i] = 1 / (1 + POSITION_DECAY × i)

    Scores are normalised so that the first sentence scores 1.0 and later
    sentences decay toward zero.

    Args:
        n: Total number of sentences.

    Returns:
        Array of shape (n,) with values in (0, 1].
    """
    scores = np.array([1.0 / (1.0 + POSITION_DECAY * i) for i in range(n)])
    return scores / scores[0]   # sentence 0 always = 1.0


def _select_sentences(
    sentences: list[str],
    num_sentences: int,
    tfidf_scores: np.ndarray,
    pos_scores: np.ndarray,
) -> tuple[list[int], np.ndarray]:
    """
    Blend TF-IDF and position scores, select top-N, preserve original order.

    Returns:
        (selected_indices_sorted, final_scores_array)
    """
    final_scores = (
        (1.0 - POSITION_WEIGHT) * tfidf_scores
        + POSITION_WEIGHT * pos_scores
    )
    top_indices = np.argsort(final_scores)[::-1][:num_sentences]
    return sorted(top_indices.tolist()), final_scores


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def tfidf_summarize(text: str, num_sentences: int = 3) -> str:
    """
    Generate an extractive summary using position-weighted character n-gram TF-IDF.

    Backward-compatible replacement for the previous word-level TF-IDF summarizer.
    Existing callers (pipeline.py, fallback path in summarize_mt5.py, rouge_eval.py)
    require no changes.

    Improvements over the V1 baseline:
    - Character n-gram TF-IDF (char_wb, 2–4-grams) for Telugu morphology.
    - Lead-bias position weighting (20% blended weight).
    - Minimum sentence filter (fragments < 12 chars are discarded).

    Args:
        text:          Input Telugu text (should already be cleaned).
        num_sentences: Number of sentences to include.  Default 3.

    Returns:
        Extractive summary string (sentences in original document order).
    """
    sentences = _split_sentences(text)

    if not sentences:
        return text

    # Short texts: extractive compression is meaningless
    if len(sentences) <= num_sentences:
        return text

    tfidf_scores = _char_ngram_tfidf_scores(sentences)
    pos_scores = _position_scores(len(sentences))
    selected_indices, _ = _select_sentences(sentences, num_sentences, tfidf_scores, pos_scores)

    return " ".join(sentences[i] for i in selected_indices)


def tfidf_summarize_scored(text: str, num_sentences: int = 3) -> dict:
    """
    Like :func:`tfidf_summarize` but returns full scoring metadata.

    Used by evaluation scripts (Phase 3) and the latency benchmark (Phase 4)
    to inspect the per-sentence scoring and measure the algorithmic improvement
    over the V1 baseline.

    Returns:
        dict with keys:
            summary              – the extractive summary string
            sentences            – list of all sentences after splitting
            tfidf_scores         – char n-gram TF-IDF score per sentence (normalised)
            position_scores      – lead-bias position score per sentence
            final_scores         – blended score per sentence
            selected_indices     – indices of selected sentences (original order)
            score_variance       – variance of final_scores (routing signal)
            num_input_sentences  – total sentences in input
            num_output_sentences – sentences in summary
            compression_ratio    – num_output / num_input
    """
    sentences = _split_sentences(text)

    if not sentences:
        return {
            "summary": text,
            "sentences": [],
            "tfidf_scores": [],
            "position_scores": [],
            "final_scores": [],
            "selected_indices": [],
            "score_variance": 0.0,
            "num_input_sentences": 0,
            "num_output_sentences": 0,
            "compression_ratio": 1.0,
        }

    if len(sentences) <= num_sentences:
        n = len(sentences)
        return {
            "summary": text,
            "sentences": sentences,
            "tfidf_scores": [1.0] * n,
            "position_scores": [1.0] * n,
            "final_scores": [1.0] * n,
            "selected_indices": list(range(n)),
            "score_variance": 0.0,
            "num_input_sentences": n,
            "num_output_sentences": n,
            "compression_ratio": 1.0,
        }

    tfidf_scores = _char_ngram_tfidf_scores(sentences)
    pos_scores = _position_scores(len(sentences))
    selected_indices, final_scores = _select_sentences(
        sentences, num_sentences, tfidf_scores, pos_scores
    )
    summary = " ".join(sentences[i] for i in selected_indices)

    n_in = len(sentences)
    n_out = len(selected_indices)

    return {
        "summary": summary,
        "sentences": sentences,
        "tfidf_scores": tfidf_scores.tolist(),
        "position_scores": pos_scores.tolist(),
        "final_scores": final_scores.tolist(),
        "selected_indices": selected_indices,
        "score_variance": round(float(np.var(final_scores)), 6),
        "num_input_sentences": n_in,
        "num_output_sentences": n_out,
        "compression_ratio": round(n_out / n_in, 3),
    }