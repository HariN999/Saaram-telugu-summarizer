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
from config import API_HOST, API_PORT, CORS_ORIGINS, CORS_ORIGIN_REGEX, DATA_DIR, DEBUG
from pipeline import run_pipeline
from services.news_service import fetch_telugu_news
from tts import text_to_speech

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
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

AUDIO_DIR = DATA_DIR
os.makedirs(AUDIO_DIR, exist_ok=True)
app.mount("/audio", StaticFiles(directory=AUDIO_DIR), name="audio")

SUMMARY_CACHE_TTL_SECONDS = 300
_SUMMARY_CACHE: dict[str, dict[str, object]] = {}
_SUMMARY_CACHE_LOCK = Lock()


# ============================================================================
# Request/Response Models
# ============================================================================

METHOD_TYPE = Literal["tfidf", "mt5_base", "mt5_finetuned"]
METHOD_DESCRIPTION = "Summarization method: 'tfidf' (extractive), 'mt5_base' (abstractive base), or 'mt5_finetuned' (abstractive fine-tuned)"


class SummarizeRequest(BaseModel):
    text: str = Field(..., description="Telugu text to summarize", min_length=10)
    method: METHOD_TYPE = Field(default="tfidf", description=METHOD_DESCRIPTION)
    generate_audio: bool = Field(default=True, description="Whether to generate audio output")


class URLRequest(BaseModel):
    url: str = Field(..., description="URL of Telugu news article")
    method: METHOD_TYPE = Field(default="tfidf", description=METHOD_DESCRIPTION)
    generate_audio: bool = Field(default=True, description="Whether to generate audio output")


class SummarizeResponse(BaseModel):
    status: Literal["ok", "fallback"] = Field(default="ok", description="Processing status")
    message: Optional[str] = Field(None, description="Fallback or informational message")
    summary: str = Field(..., description="Generated summary")
    method: str = Field(..., description="Summarization method used")
    audio_url: Optional[str] = Field(None, description="URL to audio file")
    original_length: int = Field(..., description="Length of original text")
    summary_length: int = Field(..., description="Length of summary")


class ErrorResponse(BaseModel):
    detail: str = Field(..., description="Error message")

class LatestNewsItem(BaseModel):
    title: str = Field(..., description="News title")
    summary: str = Field(..., description="AI summarized Telugu news")
    method: str = Field(..., description="Summarization method used")
    audio_url: Optional[str] = Field(None, description="URL to audio file")
    top_news_audio_url: Optional[str] = Field(None, description="Edge TTS URL for top-news mode")
    brief_audio_url: Optional[str] = Field(None, description="Edge TTS URL for brief mode")
    radio_audio_url: Optional[str] = Field(None, description="Edge TTS URL for radio mode")
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


def _get_cached_summary(text: str, method: str) -> str | None:
    cache_key = _summary_cache_key(text, method)
    now = time.time()
    with _SUMMARY_CACHE_LOCK:
        cached = _SUMMARY_CACHE.get(cache_key)
        if cached and now - float(cached["timestamp"]) < SUMMARY_CACHE_TTL_SECONDS:
            return str(cached["summary"])
        if cached:
            _SUMMARY_CACHE.pop(cache_key, None)
    return None


def _set_cached_summary(text: str, method: str, summary: str) -> None:
    if not summary:
        return

    cache_key = _summary_cache_key(text, method)
    with _SUMMARY_CACHE_LOCK:
        _SUMMARY_CACHE[cache_key] = {
            "timestamp": time.time(),
            "summary": summary,
        }


def _build_audio_url(audio_path: str | None) -> str | None:
    if not audio_path:
        return None
    return f"/audio/{os.path.basename(audio_path)}"


def _synthesize_audio(text: str) -> str | None:
    if not text or not text.strip():
        return None
    return text_to_speech(text)


# ============================================================================
# Endpoints
# ============================================================================

@app.get("/", tags=["Health"])
def root():
    return {
        "status": "online",
        "service": "Telugu News Summarization API",
        "version": "2.0.0",
        "methods": ["tfidf", "mt5_base", "mt5_finetuned"],
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "components": {
            "api": "operational",
            "tfidf": "ready",
            "mt5_base": "ready",
            "mt5_finetuned": "ready",
            "tts": "ready",
        },
    }

@app.get(
    "/latest-news",
    response_model=LatestNewsResponse,
    responses={500: {"model": ErrorResponse}},
    tags=["News"],
)
def latest_news(
    language: str = Query(default="te", description="Language hint (currently Telugu feed)"),
    limit: int = Query(default=5, ge=1, le=5, description="Max number of articles"),
):
    """
    Fetch Telugu RSS articles and summarize them using the existing NLP pipeline.

    Pipeline reuse:
    fetch RSS -> clean text -> run_pipeline(method='mt5_finetuned', generate_audio=True)
    """
    try:
        overall_start = time.perf_counter()
        _ = language  # Kept for frontend compatibility.
        fetch_start = time.perf_counter()
        raw_articles = fetch_telugu_news(limit=limit)
        logger.info("latest-news fetch stage completed in %.2fs", time.perf_counter() - fetch_start)

        prepared_items: list[dict[str, str]] = []
        summarize_total = 0.0

        for article in raw_articles[:5]:
            article_text = clean_text(article.get("full_text", "") or article.get("text", ""))
            if not article_text:
                continue

            summarize_start = time.perf_counter()
            summary = _get_cached_summary(article_text, "mt5_finetuned")
            if summary is None:
                result = run_pipeline(
                    text_or_url=article_text,
                    method="mt5_finetuned",
                    generate_audio=False,
                )
                summary = result.get("summary", "").strip()
                _set_cached_summary(article_text, "mt5_finetuned", summary)
            else:
                summary = summary.strip()
            summarize_elapsed = time.perf_counter() - summarize_start
            summarize_total += summarize_elapsed
            logger.info("latest-news summarization stage completed in %.2fs", summarize_elapsed)

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
                    "method": "mt5_finetuned",
                    "headline": title,
                    "firstLine": first_line,
                    "brief": summary,
                    "fullText": full_text,
                    "source": source_name,
                    "brief_text": summary,
                    "top_news_text": top_news_text,
                    "radio_text": radio_text,
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

        if tts_jobs:
            max_workers = min(8, len(tts_jobs))
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
                    audio_url=audio_url,
                    top_news_audio_url=tts_results.get((index, "top_news_audio_url")),
                    brief_audio_url=audio_url,
                    radio_audio_url=tts_results.get((index, "radio_audio_url")),
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
            summary=result["summary"],
            method=result["method"],
            audio_url=audio_url,
            original_length=len(result["original_text"]),
            summary_length=len(result["summary"]),
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
        if not request.url.startswith("http"):
            raise HTTPException(status_code=400, detail="Invalid URL format")

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
            summary=result["summary"],
            method=result["method"],
            audio_url=audio_url,
            original_length=len(result["original_text"]),
            summary_length=len(result["summary"]),
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
    audio_path = os.path.join(AUDIO_DIR, filename)
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(audio_path, media_type="audio/mpeg", filename=filename)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host=API_HOST, port=API_PORT, reload=DEBUG)
