"""
Main Pipeline Module
Orchestrates the complete summarization workflow:
Extract -> Clean -> Summarize -> Text-to-Speech

Supports four summarization methods:
    tfidf         – Fast extractive (TF-IDF)
    mt5_base      – Abstractive, public multilingual mT5
    mt5_finetuned – Abstractive, fine-tuned on Telugu news (manual only)
    auto          – Adaptive hybrid router (routes between tfidf and mt5_base
                    only; fine-tuned is excluded from Auto until ablation
                    studies confirm its superiority over the base model)
"""
import logging
import time

from extract import extract_text
from clean import clean_text
from config import MAX_MT5_INPUT_CHARS, MAX_SUMMARIZATION_CHARS
from input_limits import apply_input_limit
from router import route as auto_route
from summarize_tfidf import tfidf_summarize
from summarize_mt5 import (
    clear_mt5_fallback_message,
    get_mt5_fallback_message,
    get_mt5_fallback_reason,
    mT5_base_summarize,
    mT5_finetuned_summarize,
)
from tts import text_to_speech


logger = logging.getLogger(__name__)

# Methods that use the transformer stack
_TRANSFORMER_METHODS = {"mt5_base", "mt5_finetuned"}


def run_pipeline(
    text_or_url: str,
    method: str = "tfidf",
    generate_audio: bool = False,
) -> dict:
    """
    Run complete summarization pipeline.

    Args:
        text_or_url: Raw Telugu text or a URL to extract from.
        method: One of 'tfidf', 'mt5_base', 'mt5_finetuned', 'auto'.
        generate_audio: Whether to run TTS on the summary.

    Returns:
        Dict with keys:
            original_text, summary, method, requested_method, executed_method,
            audio_path, status, message, fallback_reason,
            latency_seconds, routing_latency_seconds, inference_latency_seconds,
            routing_reason, routing_features, auto_routed,
            input_truncated, input_limit,
            original_input_length, processed_input_length.

    Latency breakdown:
        routing_latency_seconds  – time spent in router.route() only
                                   (feature extraction + decision logic).
                                   0.0 when method is not 'auto'.
        inference_latency_seconds – time spent in the summarization model
                                    call only (excludes extract/clean/TTS).
        latency_seconds           – total wall-clock time for the full
                                    pipeline (extract + clean + route +
                                    summarize + optional TTS).
    """
    pipeline_start = time.perf_counter()

    # ── Step 1: Extract ──────────────────────────────────────────────────────
    extracted_text = extract_text(text_or_url)

    # ── Step 2: Clean + truncate ─────────────────────────────────────────────
    m = method.lower()
    cleaned_text = clean_text(extracted_text)

    # For auto mode, apply the mT5 char limit conservatively (router may
    # ultimately pick tfidf, which would accept more, but we don't know yet).
    if m == "auto":
        input_limit = MAX_MT5_INPUT_CHARS
    elif m.startswith("mt5_"):
        input_limit = MAX_MT5_INPUT_CHARS
    else:
        input_limit = MAX_SUMMARIZATION_CHARS

    cleaned_text, truncation_info = apply_input_limit(cleaned_text, max_chars=input_limit)
    if not cleaned_text:
        raise ValueError("No valid text found after cleaning")
    if truncation_info.input_truncated:
        logger.info(
            "pipeline_input_truncated original_length=%d processed_length=%d limit=%d",
            truncation_info.original_input_length,
            truncation_info.processed_input_length,
            truncation_info.input_limit,
        )

    # ── Step 3: Route (auto) or accept user choice ───────────────────────────
    requested_method = m
    auto_routed = False
    routing_reason: str | None = None
    routing_features: dict | None = None
    routing_latency_seconds: float = 0.0

    if m == "auto":
        _route_start = time.perf_counter()
        routed_method, routing_reason, routing_features = auto_route(cleaned_text)
        routing_latency_seconds = time.perf_counter() - _route_start
        m = routed_method
        auto_routed = True
        logger.info(
            "pipeline_auto_route requested=auto routed=%s "
            "routing_latency=%.4fs reason=%r",
            m, routing_latency_seconds, routing_reason,
        )
    else:
        routing_features = None

    # ── Step 4: Summarize ────────────────────────────────────────────────────
    status = "ok"
    message = None
    fallback_reason = None
    executed_method = m
    _inference_start = time.perf_counter()
    logger.info(
        "pipeline_start requested_method=%s executed_method=%s generate_audio=%s",
        requested_method, executed_method, generate_audio,
    )

    if m == "tfidf":
        summary = tfidf_summarize(cleaned_text)
    elif m == "mt5_base":
        clear_mt5_fallback_message()
        summary = mT5_base_summarize(cleaned_text)
        message = get_mt5_fallback_message()
        fallback_reason = get_mt5_fallback_reason()
    elif m == "mt5_finetuned":
        clear_mt5_fallback_message()
        summary = mT5_finetuned_summarize(cleaned_text)
        message = get_mt5_fallback_message()
        fallback_reason = get_mt5_fallback_reason()
    else:
        raise ValueError(
            f"Invalid method: {method!r}. "
            "Choose 'tfidf', 'mt5_base', 'mt5_finetuned', or 'auto'."
        )

    inference_latency_seconds: float = time.perf_counter() - _inference_start

    if message:
        status = "fallback"
        executed_method = "tfidf"
        # If the router routed to a transformer that fell back, annotate reason.
        if auto_routed and routing_reason:
            routing_reason = (
                f"{routing_reason} "
                f"[transformer unavailable — fell back to TF-IDF]"
            )

    logger.info(
        "pipeline_summary_complete requested_method=%s executed_method=%s "
        "status=%s auto_routed=%s inference_latency=%.4fs "
        "routing_latency=%.4fs fallback_reason=%s",
        requested_method, executed_method, status,
        auto_routed, inference_latency_seconds, routing_latency_seconds,
        fallback_reason,
    )

    # ── Step 5: TTS ──────────────────────────────────────────────────────────
    audio_path = None
    if generate_audio and summary:
        audio_path = text_to_speech(summary)  # returns full path

    total_latency = time.perf_counter() - pipeline_start

    return {
        "original_text": cleaned_text,
        "summary": summary,
        "method": executed_method,
        "requested_method": requested_method,
        "executed_method": executed_method,
        "audio_path": audio_path,
        "status": status,
        "message": message,
        "fallback_reason": fallback_reason,
        # Routing metadata (populated for 'auto' mode; None for manual)
        "auto_routed": auto_routed,
        "routing_reason": routing_reason,
        "routing_features": routing_features,
        # Latency breakdown
        "routing_latency_seconds": round(routing_latency_seconds, 4),
        "inference_latency_seconds": round(inference_latency_seconds, 4),
        "latency_seconds": round(total_latency, 4),
        **truncation_info.to_dict(),
    }


if __name__ == "__main__":
    test_text = "తెలంగాణ రాష్ట్రంలో వ్యవసాయ రంగం అభివృద్ధికి ప్రభుత్వం కొత్త పథకాలు ప్రకటించింది."
    for m in ("tfidf", "mt5_base", "mt5_finetuned", "auto"):
        result = run_pipeline(test_text, method=m, generate_audio=False)
        print(f"[{m}] executed={result['executed_method']} latency={result['latency_seconds']}s")
        print(f"      routing_reason={result.get('routing_reason')}")
        print(f"      summary={result['summary'][:80]}")
