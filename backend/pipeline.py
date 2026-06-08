"""
Main Pipeline Module
Orchestrates the complete summarization workflow:
Extract -> Clean -> Summarize -> Text-to-Speech
"""
import logging
import time

from extract import extract_text
from clean import clean_text
from config import MAX_MT5_INPUT_CHARS, MAX_SUMMARIZATION_CHARS
from input_limits import apply_input_limit
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


def run_pipeline(
    text_or_url: str,
    method: str = "tfidf",
    generate_audio: bool = False,
) -> dict:
    """
    Run complete summarization pipeline.

    Args:
        text_or_url: Raw Telugu text or a URL to extract from.
        method: One of 'tfidf', 'mt5_base', 'mt5_finetuned'.
        generate_audio: Whether to run TTS on the summary.

    Returns:
        Dict with keys: original_text, summary, method, audio_path (full path or None).
    """

    # Step 1: Extract
    extracted_text = extract_text(text_or_url)

    # Step 2: Clean
    m = method.lower()
    cleaned_text = clean_text(extracted_text)
    input_limit = MAX_MT5_INPUT_CHARS if m.startswith("mt5_") else MAX_SUMMARIZATION_CHARS
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

    # Step 3: Summarize
    status = "ok"
    message = None
    fallback_reason = None
    requested_method = m
    executed_method = m
    summarize_start = time.perf_counter()
    logger.info("pipeline_start requested_method=%s generate_audio=%s", requested_method, generate_audio)

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
            f"Invalid method: {method!r}. Choose 'tfidf', 'mt5_base', or 'mt5_finetuned'."
        )

    if message:
        status = "fallback"
        executed_method = "tfidf"

    logger.info(
        "pipeline_summary_complete requested_method=%s executed_method=%s status=%s elapsed=%.2fs fallback_reason=%s",
        requested_method,
        executed_method,
        status,
        time.perf_counter() - summarize_start,
        fallback_reason,
    )

    # Step 4: TTS
    audio_path = None
    if generate_audio and summary:
        audio_path = text_to_speech(summary)  # returns full path

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
        **truncation_info.to_dict(),
    }


if __name__ == "__main__":
    test_text = "తెలంగాణ రాష్ట్రంలో వ్యవసాయ రంగం అభివృద్ధికి ప్రభుత్వం కొత్త పథకాలు ప్రకటించింది."
    for m in ("tfidf", "mt5_base", "mt5_finetuned"):
        result = run_pipeline(test_text, method=m, generate_audio=False)
        print(f"[{m}] {result['summary'][:80]}")
