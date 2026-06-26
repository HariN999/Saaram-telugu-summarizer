"""
mT5 Telugu Summarizer - Lazy Loaded Version
Supports separate base and finetuned model slots.
"""

import os
import logging
import time
from contextvars import ContextVar
from threading import Lock
from typing import Optional
import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from summarize_tfidf import tfidf_summarize

device = torch.device("cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu"))

logger = logging.getLogger(__name__)
_MT5_FALLBACK_MESSAGE: ContextVar[Optional[str]] = ContextVar("_MT5_FALLBACK_MESSAGE", default=None)
_MT5_FALLBACK_REASON: ContextVar[Optional[str]] = ContextVar("_MT5_FALLBACK_REASON", default=None)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model", "mt5-telugu-news-finetuned")

BASE_MODEL_NAME = "csebuetnlp/mT5_multilingual_XLSum"
FINETUNED_MODEL = MODEL_PATH if os.path.exists(MODEL_PATH) else BASE_MODEL_NAME
FINETUNED_LOCAL_ONLY = os.path.exists(MODEL_PATH)

_base_tokenizer = None
_base_model = None
_finetuned_tokenizer = None
_finetuned_model = None
_base_load_error: Optional[str] = None
_finetuned_load_error: Optional[str] = None
_base_lock = Lock()
_finetuned_lock = Lock()


def clear_mt5_fallback_message() -> None:
    _MT5_FALLBACK_MESSAGE.set(None)
    _MT5_FALLBACK_REASON.set(None)


def get_mt5_fallback_message() -> Optional[str]:
    return _MT5_FALLBACK_MESSAGE.get()


def get_mt5_fallback_reason() -> Optional[str]:
    return _MT5_FALLBACK_REASON.get()


def _classify_transformer_error(exc: Exception) -> str:
    exc_text = str(exc)
    lowered = exc_text.lower()
    if isinstance(exc, ModuleNotFoundError) or "protobuf" in lowered:
        return f"Dependency failure: {exc_text}"
    if isinstance(exc, FileNotFoundError) or "no such file" in lowered or "not found" in lowered:
        return f"Missing model files: {exc_text}"
    if "connecterror" in lowered or "name resolution" in lowered or "nodename nor servname" in lowered:
        return f"Network/model download failure: {exc_text}"
    if isinstance(exc, (TimeoutError, MemoryError)) or "out of memory" in lowered or "oom" in lowered:
        return f"Timeout or memory failure: {exc_text}"
    if "tokenizer" in lowered or "sentencepiece" in lowered or "spiece" in lowered:
        return f"Tokenizer initialization failure: {exc_text}"
    return f"Transformer execution failure: {exc_text}"


def _fallback_to_tfidf(text: str, model_label: str, exc: Exception, allow_fallback: bool) -> str:
    reason = _classify_transformer_error(exc)
    logger.warning(
        "transformer_fallback requested_model=%s executed_model=tfidf reason=%s",
        model_label,
        reason,
        exc_info=True,
    )
    if not allow_fallback:
        raise RuntimeError(f"{model_label} failed without fallback: {reason}") from exc
    _MT5_FALLBACK_MESSAGE.set("Transformer model unavailable, using TF-IDF")
    _MT5_FALLBACK_REASON.set(reason)
    return tfidf_summarize(text)


def _load_base_model():
    global _base_tokenizer, _base_model, _base_load_error
    if _base_tokenizer is not None:
        return
    with _base_lock:
        if _base_tokenizer is not None:
            return
        start = time.perf_counter()
        logger.info("transformer_load_start model=mt5_base source=%s", BASE_MODEL_NAME)
        try:
            _base_tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_NAME, use_fast=False)
            _base_model = AutoModelForSeq2SeqLM.from_pretrained(BASE_MODEL_NAME).to(device)
            _base_model.eval()
            _base_load_error = None
            elapsed = time.perf_counter() - start
            logger.info("transformer_load_success model=mt5_base elapsed=%.2fs", elapsed)
        except Exception as exc:
            _base_tokenizer = None
            _base_model = None
            _base_load_error = _classify_transformer_error(exc)
            logger.warning("transformer_load_failed model=mt5_base error=%s", _base_load_error, exc_info=True)
            raise


def _load_finetuned_model():
    global _finetuned_tokenizer, _finetuned_model, _finetuned_load_error
    if _finetuned_tokenizer is not None:
        return
    with _finetuned_lock:
        if _finetuned_tokenizer is not None:
            return
        start = time.perf_counter()
        logger.info(
            "transformer_load_start model=mt5_finetuned source=%s local_only=%s",
            FINETUNED_MODEL,
            FINETUNED_LOCAL_ONLY,
        )
        try:
            _finetuned_tokenizer = AutoTokenizer.from_pretrained(
                FINETUNED_MODEL, local_files_only=FINETUNED_LOCAL_ONLY, use_fast=False
            )
            _finetuned_model = AutoModelForSeq2SeqLM.from_pretrained(
                FINETUNED_MODEL, local_files_only=FINETUNED_LOCAL_ONLY
            ).to(device)
            _finetuned_model.eval()
            _finetuned_load_error = None
            elapsed = time.perf_counter() - start
            logger.info("transformer_load_success model=mt5_finetuned elapsed=%.2fs", elapsed)
        except Exception as exc:
            _finetuned_tokenizer = None
            _finetuned_model = None
            _finetuned_load_error = _classify_transformer_error(exc)
            logger.warning("transformer_load_failed model=mt5_finetuned error=%s", _finetuned_load_error, exc_info=True)
            raise


def _run_summarize(tokenizer, model, text, max_length=128, min_length=30,
                   num_beams=4, length_penalty=2.0, no_repeat_ngram_size=3):
    if not text or not text.strip():
        return ""
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
    inputs = {k: v.to(device) for k, v in inputs.items()}
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


def mT5_base_summarize(text: str, allow_fallback: bool = True) -> str:
    """Summarize using the public mT5 multilingual XLSum base model."""
    try:
        _load_base_model()
        start = time.perf_counter()
        summary = _run_summarize(_base_tokenizer, _base_model, text)
        _MT5_FALLBACK_MESSAGE.set(None)
        _MT5_FALLBACK_REASON.set(None)
        logger.info("transformer_inference_success model=mt5_base elapsed=%.2fs", time.perf_counter() - start)
        return summary
    except Exception as exc:
        return _fallback_to_tfidf(text, "mt5_base", exc, allow_fallback)


def mT5_finetuned_summarize(text: str, allow_fallback: bool = True) -> str:
    """Summarize using finetuned mT5 (falls back to base if local model not found)."""
    try:
        _load_finetuned_model()
        start = time.perf_counter()
        summary = _run_summarize(_finetuned_tokenizer, _finetuned_model, text)
        _MT5_FALLBACK_MESSAGE.set(None)
        _MT5_FALLBACK_REASON.set(None)
        logger.info("transformer_inference_success model=mt5_finetuned elapsed=%.2fs", time.perf_counter() - start)
        return summary
    except Exception as exc:
        return _fallback_to_tfidf(text, "mt5_finetuned", exc, allow_fallback)


def get_model_status() -> dict[str, dict[str, Optional[str] | bool]]:
    return {
        "mt5_base": {
            "loaded": _base_tokenizer is not None and _base_model is not None,
            "available": _base_load_error is None,
            "last_error": _base_load_error,
        },
        "mt5_finetuned": {
            "loaded": _finetuned_tokenizer is not None and _finetuned_model is not None,
            "available": _finetuned_load_error is None,
            "last_error": _finetuned_load_error,
        },
    }


def preload_models(methods: tuple[str, ...] = ("mt5_finetuned",)) -> dict[str, bool]:
    results: dict[str, bool] = {}
    for method in methods:
        try:
            if method == "mt5_base":
                _load_base_model()
            elif method == "mt5_finetuned":
                _load_finetuned_model()
            else:
                continue
            results[method] = True
        except Exception:
            logger.warning("transformer_preload_failed model=%s", method, exc_info=True)
            results[method] = False
    return results


# Legacy alias — kept for backwards compatibility with older pipeline versions
def mT5_summarize(text: str) -> str:
    return mT5_finetuned_summarize(text)
