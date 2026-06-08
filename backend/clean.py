"""
Text Cleaning Module
Cleans and normalizes Telugu text
"""
import re


def clean_text(text: str) -> str:
    """
    Clean Telugu text by removing unwanted characters and normalizing whitespace

    Args:
        text: Raw Telugu text

    Returns:
        Cleaned Telugu text
    """
    # Preserve Telugu, meaningful English/mixed-language terms, numbers, and
    # common news punctuation without keeping markup/control characters.
    text = re.sub(r"[^\u0C00-\u0C7F\u0964\u0965A-Za-z0-9\s,.!?;:%()&/\"'’‘“”+₹$-]", " ", text)

    # Collapse multiple spaces into single space
    text = re.sub(r"\s+", " ", text)

    return text.strip()
