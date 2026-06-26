"""
Telugu News Summarization API
FastAPI application for text summarization with TTS
"""
import hashlib
import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Optional, Literal

from clean import clean_text
from config import (
    API_HOST,
    API_PORT,
    CORS_ORIGINS,
    CORS_ORIGIN_REGEX,
    DATA_DIR,
    DEBUG,
    MAX_RAW_TEXT_CHARS,
    PRELOAD_MT5_ON_STARTUP,
)
from input_limits import apply_input_limit
from pipeline import run_pipeline
from services.news_service import fetch_telugu_news
from summarize_mt5 import get_model_status, preload_models
from router import get_router_config
from tts import text_to_speech
from url_safety import URLSafetyError, validate_public_url

if not logging.getLogger().handlers:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Telugu News Summarization API",
    description="Extractive and abstractive summarization for Telugu text with TTS",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AUDIO_DIR = DATA_DIR
os.makedirs(AUDIO_DIR, exist_ok=True)
app.mount("/audio", StaticFiles(directory=AUDIO_DIR), name="audio")

SUMMARY_CACHE_TTL_SECONDS = 300
TTS_CACHE_TTL_SECONDS = 900

# Free-tier optimization: Bounded LRU-style caches to prevent unbounded memory growth
class BoundedCache:
    """
    Lightweight in-memory cache with max-size limit and TTL.
    Evicts oldest (by insertion) entry when max_size is exceeded.
    """
    def __init__(self, max_size: int):
        self.cache: dict[str, dict[str, object]] = {}
        self.max_size = max_size
        self.lock = Lock()
    
    def get(self, key: str) -> dict[str, object] | None:
        with self.lock:
            return self.cache.get(key)
    
    def set(self, key: str, value: dict[str, object]) -> None:
        with self.lock:
            self.cache[key] = value
            if len(self.cache) > self.max_size:
                # Remove oldest entry (Python 3.7+ dicts maintain insertion order)
                oldest_key = next(iter(self.cache))
                del self.cache[oldest_key]
                logger.debug(f"bounded_cache_evict key_count={len(self.cache)}")
    
    def size(self) -> int:
        with self.lock:
            return len(self.cache)

_SUMMARY_CACHE = BoundedCache(max_size=100)
_TTS_CACHE = BoundedCache(max_size=200)


# ============================================================================
# Request/Response Models
# ============================================================================

METHOD_TYPE = Literal["tfidf", "mt5_base", "mt5_finetuned", "auto"]
METHOD_DESCRIPTION = (
    "Summarization method: 'tfidf' (extractive), 'mt5_base' (abstractive base), "
    "'mt5_finetuned' (abstractive fine-tuned), or 'auto' (adaptive router selects "
    "the best method based on article characteristics and available resources)"
)


class SummarizeRequest(BaseModel):
    text: str = Field(..., description="Telugu text to summarize", min_length=10)
    method: METHOD_TYPE = Field(default="tfidf", description=METHOD_DESCRIPTION)
    generate_audio: bool = Field(default=False, description="Whether to generate audio output")


class URLRequest(BaseModel):
    url: str = Field(..., description="URL of Telugu news article")
    method: METHOD_TYPE = Field(default="tfidf", description=METHOD_DESCRIPTION)
    generate_audio: bool = Field(default=False, description="Whether to generate audio output")


class SummarizeResponse(BaseModel):
    status: Literal["ok", "fallback"] = Field(default="ok", description="Processing status")
    message: Optional[str] = Field(None, description="Fallback or informational message")
    requested_method: str = Field(..., description="Summarization method requested by the client")
    executed_method: str = Field(..., description="Summarization method that actually produced the summary")
    fallback_reason: Optional[str] = Field(None, description="Exact fallback reason when status is fallback")
    summary: str = Field(..., description="Generated summary")
    method: str = Field(..., description="Summarization method used")
    audio_url: Optional[str] = Field(None, description="URL to audio file")
    original_length: int = Field(..., description="Length of original text")
    summary_length: int = Field(..., description="Length of summary")
    input_truncated: bool = Field(default=False, description="Whether input was truncated before summarization")
    input_limit: int = Field(default=0, description="Maximum processed input length")
    original_input_length: int = Field(default=0, description="Input length before truncation")
    processed_input_length: int = Field(default=0, description="Input length after truncation")
    # ── Adaptive router fields (populated when requested_method == 'auto') ──
    auto_routed: bool = Field(default=False, description="True when the adaptive router selected the method automatically")
    routing_reason: Optional[str] = Field(None, description="Human-readable explanation of the router's model selection decision")
    routing_features: Optional[dict] = Field(None, description="Input features used by the router: word_count, tfidf_variance, available_ram_mb, thresholds, etc.")
    # ── Latency breakdown ────────────────────────────────────────────────────
    routing_latency_seconds: float = Field(default=0.0, description="Time spent in router.route() only (feature extraction + decision). 0.0 when method is not 'auto'.")
    inference_latency_seconds: float = Field(default=0.0, description="Time spent in the summarization model call only (excludes extract/clean/TTS).")
    latency_seconds: float = Field(default=0.0, description="Total end-to-end pipeline latency in seconds (extract + clean + route + summarize + optional TTS).")


class ErrorResponse(BaseModel):
    detail: str = Field(..., description="Error message")

class LatestNewsItem(BaseModel):
    title: str = Field(..., description="News title")
    summary: str = Field(..., description="AI summarized Telugu news")
    method: str = Field(..., description="Summarization method used")
    requested_method: str = Field(..., description="Summarization method requested internally")
    executed_method: str = Field(..., description="Summarization method that actually produced the summary")
    status: Literal["ok", "fallback"] = Field(default="ok", description="Processing status")
    fallback_reason: Optional[str] = Field(None, description="Exact fallback reason when status is fallback")
    audio_url: Optional[str] = Field(None, description="URL to audio file")
    top_news_audio_url: Optional[str] = Field(None, description="Edge TTS URL for top-news mode")
    brief_audio_url: Optional[str] = Field(None, description="Edge TTS URL for brief mode")
    radio_audio_url: Optional[str] = Field(None, description="Edge TTS URL for radio mode")
    input_truncated: bool = Field(default=False, description="Whether input was truncated before summarization")
    input_limit: int = Field(default=0, description="Maximum processed input length")
    original_input_length: int = Field(default=0, description="Input length before truncation")
    processed_input_length: int = Field(default=0, description="Input length after truncation")
    # Speak frontend compatibility keys
    headline: str = Field(..., description="Headline field used by Speak UI")
    firstLine: str = Field(..., description="Short line field used by Speak UI")
    brief: str = Field(..., description="Brief summary field used by Speak UI")
    fullText: str = Field(..., description="Full text field used by Speak UI")
    source: str = Field(..., description="News source")


class LatestNewsResponse(BaseModel):
    source: str = Field(..., description="News pipeline source")
    news: list[LatestNewsItem] = Field(default_factory=list)


def _summary_cache_key(text: str, method: str) -> str:
    return hashlib.sha256(f"{method}::{text}".encode("utf-8")).hexdigest()


def _get_cached_summary(text: str, method: str) -> dict[str, object] | None:
    cache_key = _summary_cache_key(text, method)
    now = time.time()
    cached = _SUMMARY_CACHE.get(cache_key)
    if cached and now - float(cached["timestamp"]) < SUMMARY_CACHE_TTL_SECONDS:
        return dict(cached)
    if cached:
        # TTL expired, let BoundedCache naturally evict
        pass
    return None


def _set_cached_summary(text: str, method: str, result: dict[str, object]) -> None:
    if not result.get("summary"):
        return

    cache_key = _summary_cache_key(text, method)
    _SUMMARY_CACHE.set(cache_key, {"timestamp": time.time(), **result})
    logger.debug(f"summary_cache_size={_SUMMARY_CACHE.size()}")


def _build_audio_url(audio_path: str | None) -> str | None:
    if not audio_path:
        return None
    return f"/audio/{os.path.basename(audio_path)}"


def _tts_cache_key(text: str) -> str:
    return hashlib.sha256(text.strip().encode("utf-8")).hexdigest()


def _synthesize_audio(text: str) -> str | None:
    if not text or not text.strip():
        return None

    cache_key = _tts_cache_key(text)
    now = time.time()
    cached = _TTS_CACHE.get(cache_key)
    if cached and now - float(cached["timestamp"]) < TTS_CACHE_TTL_SECONDS:
        audio_path = str(cached["audio_path"])
        if os.path.exists(audio_path):
            logger.info("tts_cache_hit")
            return audio_path

    audio_path = text_to_speech(text)
    if audio_path:
        _TTS_CACHE.set(cache_key, {"timestamp": time.time(), "audio_path": audio_path})
        logger.debug(f"tts_cache_size={_TTS_CACHE.size()}")
    return audio_path


@app.on_event("startup")
def optional_model_preload() -> None:
    if PRELOAD_MT5_ON_STARTUP:
        logger.info("startup_preload_enabled models=mt5_finetuned")
        preload_models(("mt5_finetuned",))


# ============================================================================
# Endpoints
# ============================================================================

@app.get("/", tags=["Health"])
def root():
    return {
        "status": "online",
        "service": "Telugu News Summarization API",
        "version": "2.0.0",
        "methods": ["tfidf", "mt5_base", "mt5_finetuned", "auto"],
        "auto_routes_between": ["tfidf", "mt5_base"],
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "components": {
            "api": "operational",
            "tfidf": "ready",
            "mt5_base": "not_checked",
            "mt5_finetuned": "not_checked",
            "tts": "available",
        },
    }


@app.get("/router/config", tags=["Health"])
def router_config():
    """
    Return the current adaptive router configuration.

    Exposes all routing thresholds and the rationale for excluding the
    fine-tuned model from Auto mode.  Useful for reproducibility and
    for tuning the router without redeployment (set env vars, restart).
    """
    return get_router_config()


@app.get("/ready", tags=["Health"])
def readiness_check(verify_models: bool = Query(default=False, description="Attempt to load mT5 models before reporting readiness")):
    if verify_models:
        preload_models(("mt5_finetuned",))

    model_status = get_model_status()
    finetuned = model_status["mt5_finetuned"]
    transformer_ready = bool(finetuned["loaded"]) and bool(finetuned["available"])
    return {
        "status": "ready" if transformer_ready else "degraded",
        "components": {
            "api": "operational",
            "tfidf": "ready",
            "mt5": model_status,
            "tts": "available",
        },
        "notes": "TF-IDF is ready. mT5 readiness requires the tokenizer and model to be loaded.",
    }

@app.get(
    "/latest-news",
    response_model=LatestNewsResponse,
    responses={500: {"model": ErrorResponse}},
    tags=["News"],
)
def latest_news(
    language: str = Query(default="te", description="Language hint (currently Telugu feed)"),
    limit: int = Query(default=3, ge=1, le=5, description="Max number of articles (default 3 for free-tier stability)"),
    generate_audio: bool = Query(default=False, description="Generate latest-news audio variants"),
):
    """
    Fetch Telugu RSS articles and summarize them using the existing NLP pipeline.

    Pipeline reuse:
    fetch RSS -> clean text -> run_pipeline(method='mt5_finetuned', generate_audio=False)
    """
    try:
        overall_start = time.perf_counter()
        _ = language  # Kept for frontend compatibility.
        fetch_start = time.perf_counter()
        raw_articles = fetch_telugu_news(limit=limit)
        logger.info(
            "latest_news_fetch_complete elapsed=%.2fs articles=%d",
            time.perf_counter() - fetch_start,
            len(raw_articles),
        )

        prepared_items: list[dict[str, str]] = []
        summarize_total = 0.0

        for article in raw_articles[:5]:
            raw_article_text = clean_text(article.get("full_text", "") or article.get("text", ""))
            article_text, extraction_info = apply_input_limit(raw_article_text)
            if not article_text:
                continue

            summarize_start = time.perf_counter()
            result = _get_cached_summary(article_text, "mt5_finetuned")
            if result is None:
                result = run_pipeline(
                    text_or_url=article_text,
                    method="mt5_finetuned",
                    generate_audio=False,
                )
                _set_cached_summary(article_text, "mt5_finetuned", result)

            summary = str(result.get("summary", "")).strip()
            requested_method = str(result.get("requested_method", "mt5_finetuned"))
            executed_method = str(result.get("executed_method", result.get("method", "mt5_finetuned")))
            status = str(result.get("status", "ok"))
            fallback_reason = result.get("fallback_reason")
            input_truncated = bool(extraction_info.input_truncated or result.get("input_truncated", False))
            original_input_length = extraction_info.original_input_length
            processed_input_length = int(result.get("processed_input_length", len(article_text)))
            input_limit = int(result.get("input_limit", extraction_info.input_limit))
            summarize_elapsed = time.perf_counter() - summarize_start
            summarize_total += summarize_elapsed
            logger.info(
                "latest_news_summary_complete requested_method=%s executed_method=%s status=%s elapsed=%.2fs fallback_reason=%s",
                requested_method,
                executed_method,
                status,
                summarize_elapsed,
                fallback_reason,
            )

            title = article.get("title", "").strip() or "Telugu News"
            source_name = article.get("source", "rss")
            first_line = clean_text(article.get("first_line", "")).strip()
            full_text = article_text

            top_news_text = clean_text(" ".join(part for part in (title, first_line) if part)).strip()
            radio_text = clean_text(" ".join(part for part in (title, full_text) if part)).strip()

            if not summary:
                continue

            prepared_items.append(
                {
                    "title": title,
                    "summary": summary,
                    "method": executed_method,
                    "requested_method": requested_method,
                    "executed_method": executed_method,
                    "status": status,
                    "fallback_reason": fallback_reason,
                    "headline": title,
                    "firstLine": first_line,
                    "brief": summary,
                    "fullText": full_text,
                    "source": source_name,
                    "brief_text": summary,
                    "top_news_text": top_news_text,
                    "radio_text": radio_text,
                    "input_truncated": input_truncated,
                    "input_limit": input_limit,
                    "original_input_length": original_input_length,
                    "processed_input_length": processed_input_length,
                }
            )

        logger.info("latest-news total summarization time %.2fs", summarize_total)

        tts_start = time.perf_counter()
        tts_results: dict[tuple[int, str], str | None] = {}
        tts_jobs: list[tuple[int, str, str]] = []
        for index, item in enumerate(prepared_items):
            for field_name, text in (
                ("audio_url", item["brief_text"]),
                ("top_news_audio_url", item["top_news_text"]),
                ("radio_audio_url", item["radio_text"]),
            ):
                if text:
                    tts_jobs.append((index, field_name, text))

        logger.info("latest_news_tts_jobs_scheduled jobs=%d", len(tts_jobs))

        if generate_audio and tts_jobs:
            # Free-tier optimization: Reduce from 8 to 4 concurrent workers
            # to minimize transient memory spikes during TTS generation (each worker ~20-30MB)
            max_workers = min(4, len(tts_jobs))
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                future_map = {
                    executor.submit(_synthesize_audio, text): (index, field_name)
                    for index, field_name, text in tts_jobs
                }
                for future in as_completed(future_map):
                    index, field_name = future_map[future]
                    tts_results[(index, field_name)] = _build_audio_url(future.result())

        logger.info("latest-news TTS stage completed in %.2fs", time.perf_counter() - tts_start)

        summarized_news: list[LatestNewsItem] = []
        for index, item in enumerate(prepared_items):
            audio_url = tts_results.get((index, "audio_url"))
            summarized_news.append(
                LatestNewsItem(
                    title=item["title"],
                    summary=item["summary"],
                    method=item["method"],
                    requested_method=item["requested_method"],
                    executed_method=item["executed_method"],
                    status=item["status"],
                    fallback_reason=item["fallback_reason"],
                    audio_url=audio_url,
                    top_news_audio_url=tts_results.get((index, "top_news_audio_url")),
                    brief_audio_url=audio_url,
                    radio_audio_url=tts_results.get((index, "radio_audio_url")),
                    input_truncated=item["input_truncated"],
                    input_limit=item["input_limit"],
                    original_input_length=item["original_input_length"],
                    processed_input_length=item["processed_input_length"],
                    # Speak frontend compatibility payload
                    headline=item["headline"],
                    firstLine=item["firstLine"],
                    brief=item["brief"],
                    fullText=item["fullText"],
                    source=item["source"],
                )
            )

        logger.info(
            "latest-news total request completed in %.2fs for %d items",
            time.perf_counter() - overall_start,
            len(summarized_news),
        )
        return LatestNewsResponse(source="bbc_eenadu_pipeline", news=summarized_news)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch latest news: {str(e)}")


@app.post(
    "/summarize",
    response_model=SummarizeResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
    tags=["Summarization"],
)
def summarize_text(request: SummarizeRequest):
    """
    Summarize Telugu text.

    - **tfidf** – Fast extractive summarization
    - **mt5_base** – mT5 multilingual XLSum (no fine-tuning)
    - **mt5_finetuned** – mT5 fine-tuned on Telugu news (best quality)
    """
    try:
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        if len(request.text) > MAX_RAW_TEXT_CHARS:
            raise HTTPException(
                status_code=400,
                detail=f"Text is too large. Maximum allowed length is {MAX_RAW_TEXT_CHARS} characters.",
            )

        result = run_pipeline(
            text_or_url=request.text,
            method=request.method,
            generate_audio=request.generate_audio,
        )

        audio_url = None
        if result["audio_path"]:
            filename = os.path.basename(result["audio_path"])
            audio_url = f"/audio/{filename}"

        return SummarizeResponse(
            status=result.get("status", "ok"),
            message=result.get("message"),
            requested_method=result.get("requested_method", request.method),
            executed_method=result.get("executed_method", result["method"]),
            fallback_reason=result.get("fallback_reason"),
            summary=result["summary"],
            method=result["method"],
            audio_url=audio_url,
            original_length=len(result["original_text"]),
            summary_length=len(result["summary"]),
            input_truncated=result.get("input_truncated", False),
            input_limit=result.get("input_limit", 0),
            original_input_length=result.get("original_input_length", len(result["original_text"])),
            processed_input_length=result.get("processed_input_length", len(result["original_text"])),
            auto_routed=result.get("auto_routed", False),
            routing_reason=result.get("routing_reason"),
            routing_features=result.get("routing_features"),
            routing_latency_seconds=result.get("routing_latency_seconds", 0.0),
            inference_latency_seconds=result.get("inference_latency_seconds", 0.0),
            latency_seconds=result.get("latency_seconds", 0.0),
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")


@app.post(
    "/process-url",
    response_model=SummarizeResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
    tags=["Summarization"],
)
def summarize_url(request: URLRequest):
    """
    Extract and summarize Telugu text from a URL.

    - **tfidf** – Fast extractive summarization
    - **mt5_base** – mT5 multilingual XLSum (no fine-tuning)
    - **mt5_finetuned** – mT5 fine-tuned on Telugu news (best quality)
    """
    try:
        try:
            validate_public_url(request.url)
        except URLSafetyError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e

        result = run_pipeline(
            text_or_url=request.url,
            method=request.method,
            generate_audio=request.generate_audio,
        )

        audio_url = None
        if result["audio_path"]:
            filename = os.path.basename(result["audio_path"])
            audio_url = f"/audio/{filename}"

        return SummarizeResponse(
            status=result.get("status", "ok"),
            message=result.get("message"),
            requested_method=result.get("requested_method", request.method),
            executed_method=result.get("executed_method", result["method"]),
            fallback_reason=result.get("fallback_reason"),
            summary=result["summary"],
            method=result["method"],
            audio_url=audio_url,
            original_length=len(result["original_text"]),
            summary_length=len(result["summary"]),
            input_truncated=result.get("input_truncated", False),
            input_limit=result.get("input_limit", 0),
            original_input_length=result.get("original_input_length", len(result["original_text"])),
            processed_input_length=result.get("processed_input_length", len(result["original_text"])),
            auto_routed=result.get("auto_routed", False),
            routing_reason=result.get("routing_reason"),
            routing_features=result.get("routing_features"),
            routing_latency_seconds=result.get("routing_latency_seconds", 0.0),
            inference_latency_seconds=result.get("inference_latency_seconds", 0.0),
            latency_seconds=result.get("latency_seconds", 0.0),
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"URL processing failed: {str(e)}")


@app.get(
    "/audio/{filename}",
    response_class=FileResponse,
    responses={404: {"model": ErrorResponse}},
    tags=["Audio"],
)
def get_audio(filename: str):
    safe_filename = os.path.basename(filename)
    audio_path = os.path.abspath(os.path.join(AUDIO_DIR, safe_filename))
    audio_root = os.path.abspath(AUDIO_DIR)
    if os.path.commonpath([audio_root, audio_path]) != audio_root:
        raise HTTPException(status_code=400, detail="Invalid audio filename")
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(audio_path, media_type="audio/mpeg", filename=safe_filename)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host=API_HOST, port=API_PORT, reload=DEBUG)
