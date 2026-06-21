"""
Text Extraction Module
Extracts text from URLs or returns direct text input
"""
import re

from bs4 import BeautifulSoup

from clean import clean_text
from url_safety import URLSafetyError, safe_get

ARTICLE_CONTENT_TYPES = ("text/html", "text/plain", "application/xhtml+xml")

# Telugu Unicode block
TELUGU_RANGE_START = 0x0C00
TELUGU_RANGE_END = 0x0C7F

# Minimum ratio of Telugu characters (among alphabetic characters) required
# for the extracted text to be considered a Telugu article.
TELUGU_RATIO_THRESHOLD = 0.5


class UnsupportedLanguageError(ValueError):
    """Raised when extracted text does not appear to be Telugu."""
    pass


def _telugu_ratio(text: str) -> float:
    """
    Compute the ratio of Telugu alphabetic characters to all alphabetic
    characters in the given text. Non-alphabetic characters (digits,
    punctuation, whitespace) are ignored in both counts.

    Returns 0.0 if there are no alphabetic characters at all.
    """
    telugu_chars = 0
    total_alpha_chars = 0

    for ch in text:
        if not ch.isalpha():
            continue
        total_alpha_chars += 1
        if TELUGU_RANGE_START <= ord(ch) <= TELUGU_RANGE_END:
            telugu_chars += 1

    if total_alpha_chars == 0:
        return 0.0

    return telugu_chars / total_alpha_chars


def _assert_telugu(text: str) -> None:
    """
    Raise UnsupportedLanguageError if the given text does not look like
    Telugu content, based on the Telugu character ratio threshold.
    """
    ratio = _telugu_ratio(text)
    if ratio < TELUGU_RATIO_THRESHOLD:
        raise UnsupportedLanguageError(
            "Saaram currently supports Telugu news articles only."
        )


def extract_text(text_or_url: str) -> str:
    """
    Extract text from URL or return direct text input

    Args:
        text_or_url: Either a URL starting with 'http' or direct text

    Returns:
        Extracted and cleaned text

    Raises:
        UnsupportedLanguageError: if the extracted/provided text is not
            primarily Telugu.
        ValueError: for extraction failures (network errors, unsafe URLs,
            etc.)
    """
    if text_or_url.startswith(("http://", "https://")):
        try:
            response = safe_get(text_or_url, allowed_content_types=ARTICLE_CONTENT_TYPES)

            soup = BeautifulSoup(response.text, "html.parser")

            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()

            # Get text from paragraphs
            paragraphs = soup.find_all("p")
            valid_paragraphs = []
            for p in paragraphs:
                p_text = p.get_text().strip()
                if not p_text:
                    continue

                # Filter out elements by ID starting with end-of-
                p_id = p.get("id") or ""
                if p_id.startswith("end-of-"):
                    continue

                # Filter out text starting with "End of"
                if p_text.lower().startswith("end of"):
                    continue

                # Filter out photo sources/captions
                if "ఫొటో సోర్స్" in p_text or "ఫోటో సోర్స్" in p_text or "చిత్రం శీర్షిక" in p_text:
                    continue

                # Filter out social links
                if "ఫాలో అవ్వండి" in p_text and "సబ్‌స్క్రైబ్ చేయండి" in p_text:
                    continue

                # Filter out media playback warnings
                if "మీడియా ప్లేబ్యాక్" in p_text:
                    continue

                # Filter out publisher credits
                if "కలెక్టివ్ న్యూస్‌రూమ్ ప్రచురణ" in p_text:
                    continue

                # Filter out external site disclaimers
                if "ఇతర వెబ్‌సైట్లలో సమాచారానికి" in p_text and "బాధ్యత వహించదు" in p_text:
                    continue

                # Filter out related articles links
                if "ఇవి కూడా చదవండి" in p_text or "ఇది కూడా చదవండి" in p_text:
                    continue

                # Filter out copyright lines starting with ©
                if p_text.startswith("©"):
                    continue

                valid_paragraphs.append(p_text)

            article_text = " ".join(valid_paragraphs)

            if not article_text:
                # Fallback to all text
                article_text = soup.get_text()

            cleaned = clean_text(article_text)

            # Reject non-Telugu content (e.g. English Wikipedia, BBC
            # English, Hindi pages, etc.) before handing off to the
            # summarization pipeline.
            _assert_telugu(cleaned)

            return cleaned

        except UnsupportedLanguageError:
            # Re-raise as-is so callers can distinguish "unsupported
            # language" from generic extraction failures.
            raise
        except Exception as e:
            if isinstance(e, URLSafetyError):
                raise ValueError(str(e)) from e
            raise ValueError(f"Failed to extract text from URL: {str(e)}")

    cleaned = clean_text(text_or_url)
    _assert_telugu(cleaned)
    return cleaned