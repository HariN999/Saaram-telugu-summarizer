"""
mT5 Telugu Summarizer - Lazy Loaded Version
Supports separate base and finetuned model slots.
"""

import os
import logging
from contextvars import ContextVar
from typing import Optional
import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from summarize_tfidf import tfidf_summarize

logger = logging.getLogger(__name__)
_MT5_FALLBACK_MESSAGE: ContextVar[Optional[str]] = ContextVar("_MT5_FALLBACK_MESSAGE", default=None)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model", "mt5-telugu-news-finetuned")

BASE_MODEL_NAME = "csebuetnlp/mT5_multilingual_XLSum"
FINETUNED_MODEL = MODEL_PATH if os.path.exists(MODEL_PATH) else BASE_MODEL_NAME
FINETUNED_LOCAL_ONLY = os.path.exists(MODEL_PATH)

_base_tokenizer = None
_base_model = None
_finetuned_tokenizer = None
_finetuned_model = None


def clear_mt5_fallback_message() -> None:
    _MT5_FALLBACK_MESSAGE.set(None)


def get_mt5_fallback_message() -> Optional[str]:
    return _MT5_FALLBACK_MESSAGE.get()


def _fallback_to_tfidf(text: str, model_label: str, exc: Exception) -> str:
    print("mT5 failed:", exc)
    logger.warning("%s summarization failed; falling back to TF-IDF: %s", model_label, exc)
    _MT5_FALLBACK_MESSAGE.set("Transformer model unavailable, using TF-IDF")
    return tfidf_summarize(text)


def _load_base_model():
    global _base_tokenizer, _base_model
    if _base_tokenizer is not None:
        return
    print("Loading mT5 BASE model...")
    _base_tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_NAME, use_fast=False)
    _base_model = AutoModelForSeq2SeqLM.from_pretrained(BASE_MODEL_NAME)
    _base_model.eval()


def _load_finetuned_model():
    global _finetuned_tokenizer, _finetuned_model
    if _finetuned_tokenizer is not None:
        return
    print(f"Loading mT5 FINETUNED model from: {FINETUNED_MODEL}")
    _finetuned_tokenizer = AutoTokenizer.from_pretrained(
        FINETUNED_MODEL, local_files_only=FINETUNED_LOCAL_ONLY, use_fast=False
    )
    _finetuned_model = AutoModelForSeq2SeqLM.from_pretrained(
        FINETUNED_MODEL, local_files_only=FINETUNED_LOCAL_ONLY
    )
    _finetuned_model.eval()


def _run_summarize(tokenizer, model, text, max_length=128, min_length=30,
                   num_beams=4, length_penalty=2.0, no_repeat_ngram_size=3):
    if not text or not text.strip():
        return ""
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_length=max_length,
            min_length=min_length,
            num_beams=num_beams,
            length_penalty=length_penalty,
            no_repeat_ngram_size=no_repeat_ngram_size,
            early_stopping=True,
        )
    return tokenizer.decode(
        outputs[0],
        skip_special_tokens=True,
        clean_up_tokenization_spaces=True
    ).strip()


def mT5_base_summarize(text: str) -> str:
    """Summarize using the public mT5 multilingual XLSum base model."""
    try:
        _load_base_model()
        summary = _run_summarize(_base_tokenizer, _base_model, text)
        _MT5_FALLBACK_MESSAGE.set(None)
        return summary
    except Exception as exc:
        return _fallback_to_tfidf(text, "mT5 base", exc)


def mT5_finetuned_summarize(text: str) -> str:
    """Summarize using finetuned mT5 (falls back to base if local model not found)."""
    try:
        _load_finetuned_model()
        summary = _run_summarize(_finetuned_tokenizer, _finetuned_model, text)
        _MT5_FALLBACK_MESSAGE.set(None)
        return summary
    except Exception as exc:
        return _fallback_to_tfidf(text, "mT5 fine-tuned", exc)


# Legacy alias — kept for backwards compatibility with older pipeline versions
def mT5_summarize(text: str) -> str:
    return mT5_finetuned_summarize(text)
