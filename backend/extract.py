"""
Text Extraction Module
Extracts text from URLs or returns direct text input
"""
from bs4 import BeautifulSoup

from clean import clean_text
from url_safety import URLSafetyError, safe_get

ARTICLE_CONTENT_TYPES = ("text/html", "text/plain", "application/xhtml+xml")


def extract_text(text_or_url: str) -> str:
    """
    Extract text from URL or return direct text input

    Args:
        text_or_url: Either a URL starting with 'http' or direct text

    Returns:
        Extracted and cleaned text
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
            article_text = " ".join(p.get_text().strip() for p in paragraphs if p.get_text().strip())

            if not article_text:
                # Fallback to all text
                article_text = soup.get_text()

            return clean_text(article_text)

        except Exception as e:
            if isinstance(e, URLSafetyError):
                raise ValueError(str(e)) from e
            raise ValueError(f"Failed to extract text from URL: {str(e)}")

    return clean_text(text_or_url)
