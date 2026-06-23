"""News service for Telugu RSS ingestion used by /latest-news."""

from __future__ import annotations

import logging
import time
from concurrent.futures import ThreadPoolExecutor
from threading import Lock
from typing import Any

import feedparser
from bs4 import BeautifulSoup
from url_safety import safe_get

RSS_SOURCES = [
    {
        "name": "bbc_telugu",
        "url": "https://feeds.bbci.co.uk/telugu/rss.xml",
    },
    {
        "name": "eenadu_telugu",
        "url": "https://www.eenadu.net/rss/news.xml",
    },
]

CACHE_TTL_SECONDS = 180  # 3 minutes
REQUEST_TIMEOUT_SECONDS = 8
ARTICLE_CACHE_TTL_SECONDS = 300
RSS_CONTENT_TYPES = (
    "application/rss+xml",
    "application/xml",
    "text/xml",
    "text/html",
    "text/plain",
)

logger = logging.getLogger(__name__)

# Free-tier optimization: Bounded article cache
class BoundedArticleCache:
    """Lightweight cache for extracted article text with max-size limit."""
    def __init__(self, max_size: int):
        self.cache: dict[str, dict[str, Any]] = {}
        self.max_size = max_size
        self.lock = Lock()
    
    def get(self, url: str) -> str | None:
        if not url:
            return None
        now = time.time()
        with self.lock:
            cached = self.cache.get(url)
            if cached and now - cached["timestamp"] < ARTICLE_CACHE_TTL_SECONDS:
                return cached["text"]
            if cached:
                # TTL expired, let cache naturally evict
                pass
        return None
    
    def set(self, url: str, text: str) -> None:
        if not url or not text:
            return
        with self.lock:
            self.cache[url] = {
                "timestamp": time.time(),
                "text": text,
            }
            if len(self.cache) > self.max_size:
                oldest_key = next(iter(self.cache))
                del self.cache[oldest_key]
                logger.debug(f"article_cache_evict size={len(self.cache)}")

_NEWS_CACHE: dict[str, Any] = {
    "timestamp": 0.0,
    "articles": [],
}
_ARTICLE_CACHE = BoundedArticleCache(max_size=50)


def _strip_html(value: str) -> str:
    if not value:
        return ""
    return BeautifulSoup(value, "html.parser").get_text(" ", strip=True)


def _get_cached_article_text(article_url: str) -> str | None:
    return _ARTICLE_CACHE.get(article_url)


def _set_cached_article_text(article_url: str, text: str) -> None:
    _ARTICLE_CACHE.set(article_url, text)


def _extract_article_text(article_url: str, fallback_text: str) -> str:
    """Fetch fuller article content from the source page when possible."""
    if not article_url:
        return fallback_text

    cached_text = _get_cached_article_text(article_url)
    if cached_text:
        return cached_text

    start_time = time.perf_counter()
    try:
        response = safe_get(
            article_url,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )

        soup = BeautifulSoup(response.text, "html.parser")
        for tag in soup(["script", "style"]):
            tag.decompose()

        # Remove BBC section-boundary markers BEFORE text extraction.
        # These appear as <p id="end-of-*"> elements (e.g. id="end-of-recommendations",
        # id="end-of-article-links-block") and are NOT article content.
        for p in soup.find_all("p", id=lambda pid: pid and pid.startswith("end-of-")):
            p.decompose()

        valid_paragraphs = []
        for p in soup.find_all("p"):
            p_text = p.get_text(" ", strip=True)
            if not p_text:
                continue

            # Belt-and-suspenders: drop any remaining paragraph whose text
            # starts with "End of" (catches edge cases where the id is absent).
            if p_text.lower().startswith("end of"):
                continue

            # Drop photo-source / caption lines
            if "ఫొటో సోర్స్" in p_text or "ఫోటో సోర్స్" in p_text or "చిత్రం శీర్షిక" in p_text:
                continue

            # Drop media-playback warnings
            if "మీడియా ప్లేబ్యాక్" in p_text:
                continue

            valid_paragraphs.append(p_text)

        article_text = " ".join(valid_paragraphs).strip()

        # Regex safety net: strip any residual "End of <word>" fragments that
        # may have slipped through structural filtering (e.g. via inline elements).
        import re as _re
        article_text = _re.sub(r'End of \S+', '', article_text).strip()

        final_text = article_text or fallback_text
        _set_cached_article_text(article_url, final_text)
        logger.info(
            "Article extraction completed for %s in %.2fs",
            article_url,
            time.perf_counter() - start_time,
        )
        return final_text
    except Exception:
        logger.info(
            "Article extraction fallback for %s in %.2fs",
            article_url,
            time.perf_counter() - start_time,
        )
        return fallback_text


def _first_sentence(text: str) -> str:
    if not text:
        return ""
    for separator in ("।", ".", "!", "?"):
        if separator in text:
            candidate = text.split(separator, 1)[0].strip()
            if candidate:
                return candidate
    return text.strip()


def _build_item(source_name: str, entry: Any) -> dict[str, str] | None:
    title = _strip_html(entry.get("title", ""))
    description = _strip_html(entry.get("summary", "") or entry.get("description", ""))
    link = entry.get("link", "").strip()

    article_text = " ".join(part for part in [title, description] if part).strip()
    if not article_text:
        return None

    full_text = _extract_article_text(link, article_text)
    first_line = _first_sentence(description or title)

    return {
        "source": source_name,
        "title": title,
        "text": article_text,
        "brief_text": description or article_text,
        "first_line": first_line,
        "full_text": full_text,
        "link": link,
    }


def _parse_source(source_name: str, rss_url: str) -> list[dict[str, str]]:
    """Fetch and parse one RSS source with timeout/error handling."""
    start_time = time.perf_counter()
    response = safe_get(
        rss_url,
        timeout=REQUEST_TIMEOUT_SECONDS,
        allowed_content_types=RSS_CONTENT_TYPES,
    )

    parsed = feedparser.parse(response.content)
    max_workers = min(8, max(1, len(parsed.entries)))
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        items = [
            item
            for item in executor.map(lambda entry: _build_item(source_name, entry), parsed.entries)
            if item
        ]

    logger.info(
        "Parsed RSS source %s with %d items in %.2fs",
        source_name,
        len(items),
        time.perf_counter() - start_time,
    )
    return items


def fetch_telugu_news(limit: int = 5) -> list[dict[str, str]]:
    """
    Fetch Telugu news from BBC + Eenadu RSS, with a short in-memory cache.

    Returns articles as raw text blocks (title + description) for downstream
    cleaning/summarization in the existing NLP pipeline.
    """
    bounded_limit = max(1, min(limit, 5))
    now = time.time()

    if now - _NEWS_CACHE["timestamp"] < CACHE_TTL_SECONDS and _NEWS_CACHE["articles"]:
        logger.info("News cache hit for latest-news request")
        return _NEWS_CACHE["articles"][:bounded_limit]

    start_time = time.perf_counter()
    merged_articles: list[dict[str, str]] = []
    with ThreadPoolExecutor(max_workers=min(4, len(RSS_SOURCES))) as executor:
        future_map = {
            source["name"]: executor.submit(_parse_source, source["name"], source["url"])
            for source in RSS_SOURCES
        }

        for source in RSS_SOURCES:
            try:
                merged_articles.extend(future_map[source["name"]].result())
            except Exception:
                # Continue with other feeds if one fails.
                continue

    if merged_articles:
        _NEWS_CACHE["timestamp"] = now
        _NEWS_CACHE["articles"] = merged_articles

    logger.info(
        "Fetched %d news articles in %.2fs",
        len(_NEWS_CACHE["articles"]),
        time.perf_counter() - start_time,
    )

    return _NEWS_CACHE["articles"][:bounded_limit]
