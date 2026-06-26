"""
Adaptive Hybrid Router
======================
Intelligently selects the best summarization method for a given Telugu text
based on input characteristics and live system resource constraints.

Research contribution:
    This module implements a resource-aware adaptive routing framework for
    low-resource NLP inference on constrained infrastructure.  Instead of
    static user selection, the system automatically determines the optimal
    model using a rule-based decision policy derived from:

    1. Article length   – word count and sentence count
    2. Lexical variance – TF-IDF sentence score spread (discriminability)
    3. Available RAM    – degrade gracefully under memory pressure

Design decision — Auto routes only between TF-IDF and mT5 Base:
    The fine-tuned mT5 model is intentionally excluded from Auto mode.
    Empirically, the fine-tuned checkpoint achieved a lower BERTScore
    (0.7272) than mT5 Base (0.7273) on the XL-Sum Telugu test set with
    1,302 samples, suggesting the base model already covers the BBC Telugu
    distribution well and fine-tuning on this dataset size does not provide
    reliable improvements.  Until ablation studies (data-size sensitivity)
    demonstrate a consistent advantage, the fine-tuned model remains a
    manual expert option only.

Routing decision table (Auto mode):
    available_ram_mb < LOW_RAM_MB                      → tfidf  (forced)
    word_count ≤ WORD_COUNT_SHORT                      → tfidf
    word_count ≤ WORD_COUNT_LONG
        AND tfidf_variance ≥ TFIDF_HIGH_CONFIDENCE     → tfidf
    tfidf_variance < TFIDF_LOW_CONFIDENCE              → mt5_base
    word_count > WORD_COUNT_LONG                       → mt5_base
    default (medium, moderate variance)                → mt5_base

Threshold tuning:
    All thresholds are configurable via environment variables so they can be
    adjusted without code changes (e.g., for GPU-backed deployments that can
    afford the transformer more liberally).  See RouterConfig for details.
"""

import logging
import os
import re
from dataclasses import dataclass, field, asdict

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# RouterConfig – all thresholds in one place, env-var overrideable
# ---------------------------------------------------------------------------

def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ[name])
    except (KeyError, ValueError):
        return default


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.environ[name])
    except (KeyError, ValueError):
        return default


@dataclass
class RouterConfig:
    """
    All routing thresholds in a single, inspectable object.

    Environment variable overrides (set before process start):

    ================================  =========  ========================================
    Variable                          Default    Meaning
    ================================  =========  ========================================
    ROUTER_WORD_COUNT_SHORT           75         Words ≤ this → always TF-IDF
    ROUTER_WORD_COUNT_LONG            200        Words >  this → always mT5 Base
    ROUTER_LOW_RAM_MB                 400        Available MB < this → force TF-IDF
    ROUTER_TFIDF_HIGH_CONFIDENCE      0.04       Variance ≥ this → TF-IDF sufficient
    ROUTER_TFIDF_LOW_CONFIDENCE       0.008      Variance < this → definitely need mT5
    ================================  =========  ========================================
    """

    #: Articles with ≤ this many words are safely handled by extractive.
    word_count_short: int = field(
        default_factory=lambda: _env_int("ROUTER_WORD_COUNT_SHORT", 75)
    )

    #: Articles with > this many words always escalate to the transformer.
    word_count_long: int = field(
        default_factory=lambda: _env_int("ROUTER_WORD_COUNT_LONG", 200)
    )

    #: Available RAM (MB) below which the transformer is skipped entirely.
    #: HF Spaces free tier: ~2 GB total; conservative floor at 400 MB.
    low_ram_mb: float = field(
        default_factory=lambda: _env_float("ROUTER_LOW_RAM_MB", 400.0)
    )

    #: Sentence-score variance above this → TF-IDF sentences are discriminative.
    tfidf_high_confidence: float = field(
        default_factory=lambda: _env_float("ROUTER_TFIDF_HIGH_CONFIDENCE", 0.04)
    )

    #: Sentence-score variance below this → text is homogeneous, need abstractive.
    tfidf_low_confidence: float = field(
        default_factory=lambda: _env_float("ROUTER_TFIDF_LOW_CONFIDENCE", 0.008)
    )

    def as_dict(self) -> dict:
        """Return config as a plain dict (for API exposure and logging)."""
        return asdict(self)


# Module-level singleton — loaded once at import time, respects env vars.
_CONFIG: RouterConfig = RouterConfig()


def get_router_config() -> dict:
    """
    Return the active routing thresholds as a plain dict.

    Exposed by ``GET /router/config`` so the current policy is always
    inspectable without reading source code.
    """
    return {
        **_CONFIG.as_dict(),
        # Annotate which methods Auto can select (for documentation clarity)
        "auto_candidate_methods": ["tfidf", "mt5_base"],
        "manual_only_methods": ["mt5_finetuned"],
        "manual_only_reason": (
            "mT5 fine-tuned is excluded from Auto mode: empirical evaluation "
            "(XL-Sum Telugu, n=1302) shows mT5 Base BERTScore (0.7273) ≥ "
            "fine-tuned BERTScore (0.7272).  Fine-tuned remains available as "
            "a manual expert option pending ablation on larger datasets."
        ),
    }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _split_sentences(text: str) -> list[str]:
    """Split Telugu text on dandas (U+0964, U+0965) and ASCII full stops."""
    parts = re.split(r"[\u0964\u0965.]", text)
    return [p.strip() for p in parts if len(p.strip()) > 8]


def _compute_tfidf_variance(text: str) -> float:
    """
    Compute the variance of per-sentence TF-IDF sum-scores (word-level).

    High variance → sentences are lexically discriminative → extractive works.
    Low variance  → sentences are homogeneous → abstractive is preferred.

    Returns 0.0 on any failure (safe default → router picks transformer).
    """
    sentences = _split_sentences(text)
    if len(sentences) < 2:
        return 0.0

    try:
        vectorizer = TfidfVectorizer(analyzer="word", min_df=1, sublinear_tf=True)
        matrix = vectorizer.fit_transform(sentences)
        scores = np.asarray(matrix.sum(axis=1)).ravel()
        if scores.max() == 0:
            return 0.0
        # Normalise before computing variance so score magnitude does not dominate
        normalized = scores / scores.max()
        return float(np.var(normalized))
    except Exception:
        logger.debug("tfidf_variance_computation_failed", exc_info=True)
        return 0.0


def _get_available_ram_mb() -> float:
    """
    Return available system RAM in MB without requiring psutil.

    Reads /proc/meminfo on Linux (Hugging Face Spaces).
    Falls back to inf on macOS/Windows — the RAM guard never
    incorrectly fires during local development.
    """
    try:
        if os.path.exists("/proc/meminfo"):
            with open("/proc/meminfo") as fh:
                for line in fh:
                    if line.startswith("MemAvailable:"):
                        kb = int(line.split()[1])
                        return kb / 1024.0
    except Exception:
        logger.debug("ram_check_failed", exc_info=True)
    return float("inf")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def extract_routing_features(text: str) -> dict:
    """
    Extract all features used by :func:`route` to make its decision.

    Returns a dictionary with the following keys:

    - ``word_count``        – number of whitespace-separated tokens
    - ``sentence_count``    – number of Telugu sentences (split on danda/period)
    - ``char_count``        – total character count
    - ``avg_sentence_len``  – average words per sentence
    - ``tfidf_variance``    – normalised sentence-score variance (0.0–1.0)
    - ``available_ram_mb``  – available system RAM in megabytes
    """
    sentences = _split_sentences(text)
    words = text.split()
    word_count = len(words)
    sentence_count = max(len(sentences), 1)

    tfidf_variance = _compute_tfidf_variance(text)
    available_ram_mb = _get_available_ram_mb()

    return {
        "word_count": word_count,
        "sentence_count": sentence_count,
        "char_count": len(text),
        "avg_sentence_len": round(word_count / sentence_count, 2),
        "tfidf_variance": round(tfidf_variance, 6),
        "available_ram_mb": round(available_ram_mb, 1),
    }


def route(text: str) -> tuple[str, str, dict]:
    """
    Determine the best summarization method for the given Telugu text.

    Auto mode routes only between ``'tfidf'`` and ``'mt5_base'``.
    The fine-tuned model (``'mt5_finetuned'``) is intentionally excluded
    from automatic routing until empirical ablation confirms its superiority.
    Users can still select it manually via the explicit method parameter.

    Parameters
    ----------
    text : str
        Cleaned Telugu article text (after :func:`clean.clean_text`).

    Returns
    -------
    method : str
        One of ``'tfidf'`` or ``'mt5_base'``.
    reason : str
        Human-readable explanation of the routing decision (shown in UI
        and returned in API response for transparency).
    features : dict
        The feature dictionary from :func:`extract_routing_features`,
        including the thresholds that were active at decision time.
    """
    cfg = _CONFIG
    features = extract_routing_features(text)
    wc: int = features["word_count"]
    variance: float = features["tfidf_variance"]
    ram_mb: float = features["available_ram_mb"]

    # Embed the active thresholds in the feature dict so callers can log them
    features["thresholds"] = {
        "word_count_short": cfg.word_count_short,
        "word_count_long": cfg.word_count_long,
        "low_ram_mb": cfg.low_ram_mb,
        "tfidf_high_confidence": cfg.tfidf_high_confidence,
        "tfidf_low_confidence": cfg.tfidf_low_confidence,
    }

    # ── Rule 1: Memory pressure ──────────────────────────────────────────────
    # Checked first — the system must remain responsive under any RAM condition.
    if ram_mb < cfg.low_ram_mb:
        reason = (
            f"Memory pressure: {ram_mb:.0f} MB available "
            f"< {cfg.low_ram_mb:.0f} MB threshold — forced TF-IDF to avoid OOM"
        )
        logger.info(
            "router_decision method=tfidf trigger=memory_pressure "
            "ram_mb=%.0f threshold=%.0f",
            ram_mb, cfg.low_ram_mb,
        )
        return "tfidf", reason, features

    # ── Rule 2: Short article ────────────────────────────────────────────────
    # Transformer overhead is unjustified for texts this short.
    if wc <= cfg.word_count_short:
        reason = (
            f"Short article ({wc} words ≤ {cfg.word_count_short} word threshold) "
            f"— TF-IDF extractive is sufficient"
        )
        logger.info(
            "router_decision method=tfidf trigger=short_article word_count=%d", wc,
        )
        return "tfidf", reason, features

    # ── Rule 3: Medium article with high TF-IDF discriminability ────────────
    # Sentences are lexically distinct → top-N extractive captures key content.
    if wc <= cfg.word_count_long and variance >= cfg.tfidf_high_confidence:
        reason = (
            f"Medium article ({wc} words) with high TF-IDF discriminability "
            f"(variance={variance:.5f} ≥ {cfg.tfidf_high_confidence}) "
            f"— extractive is sufficient"
        )
        logger.info(
            "router_decision method=tfidf trigger=high_confidence "
            "word_count=%d variance=%.5f",
            wc, variance,
        )
        return "tfidf", reason, features

    # ── Rule 4: Homogeneous text (low variance) ──────────────────────────────
    # All sentences score similarly — extractive cannot select meaningfully.
    if variance < cfg.tfidf_low_confidence:
        reason = (
            f"Homogeneous text (TF-IDF variance={variance:.5f} "
            f"< {cfg.tfidf_low_confidence}) — abstractive generation "
            f"required; routing to mT5 Base"
        )
        logger.info(
            "router_decision method=mt5_base trigger=low_variance "
            "word_count=%d variance=%.5f",
            wc, variance,
        )
        return "mt5_base", reason, features

    # ── Rule 5: Long article ─────────────────────────────────────────────────
    if wc > cfg.word_count_long:
        reason = (
            f"Long article ({wc} words > {cfg.word_count_long} word threshold) "
            f"— mT5 Base for abstractive quality "
            f"(TF-IDF variance={variance:.5f})"
        )
        logger.info(
            "router_decision method=mt5_base trigger=long_article "
            "word_count=%d variance=%.5f",
            wc, variance,
        )
        return "mt5_base", reason, features

    # ── Rule 6: Default (medium article, moderate variance) ──────────────────
    # Moderate variance means TF-IDF is not clearly sufficient.
    # mT5 Base is preferred for quality without fine-tuning cost uncertainty.
    reason = (
        f"Medium article ({wc} words, TF-IDF variance={variance:.5f}) "
        f"with moderate discriminability — mT5 Base for improved abstractive quality"
    )
    logger.info(
        "router_decision method=mt5_base trigger=default_medium "
        "word_count=%d variance=%.5f",
        wc, variance,
    )
    return "mt5_base", reason, features
