"""
Main Pipeline Module
Orchestrates the complete summarization workflow:
Extract -> Clean -> Summarize -> Text-to-Speech
"""

from extract import extract_text
from clean import clean_text
from summarize_tfidf import tfidf_summarize
from summarize_mt5 import (
    clear_mt5_fallback_message,
    get_mt5_fallback_message,
    mT5_base_summarize,
    mT5_finetuned_summarize,
)
from tts import text_to_speech



def run_pipeline(
    text_or_url: str,
    method: str = "tfidf",
    generate_audio: bool = True,
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
    cleaned_text = clean_text(extracted_text)
    if not cleaned_text:
        raise ValueError("No valid text found after cleaning")

    # Step 3: Summarize
    m = method.lower()
    status = "ok"
    message = None
    effective_method = method

    if m == "tfidf":
        summary = tfidf_summarize(cleaned_text)
    elif m == "mt5_base":
        clear_mt5_fallback_message()
        summary = mT5_base_summarize(cleaned_text)
        message = get_mt5_fallback_message()
    elif m == "mt5_finetuned":
        clear_mt5_fallback_message()
        summary = mT5_finetuned_summarize(cleaned_text)
        message = get_mt5_fallback_message()
    else:
        raise ValueError(
            f"Invalid method: {method!r}. Choose 'tfidf', 'mt5_base', or 'mt5_finetuned'."
        )

    if message:
        status = "fallback"
        effective_method = "tfidf"

    # Step 4: TTS
    audio_path = None
    if generate_audio and summary:
        audio_path = text_to_speech(summary)  # returns full path

    return {
        "original_text": cleaned_text,
        "summary": summary,
        "method": effective_method,
        "audio_path": audio_path,
        "status": status,
        "message": message,
    }


if __name__ == "__main__":
    test_text = "తెలంగాణ రాష్ట్రంలో వ్యవసాయ రంగం అభివృద్ధికి ప్రభుత్వం కొత్త పథకాలు ప్రకటించింది."
    for m in ("tfidf", "mt5_base", "mt5_finetuned"):
        result = run_pipeline(test_text, method=m, generate_audio=False)
        print(f"[{m}] {result['summary'][:80]}")
