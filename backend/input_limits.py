"""Input size helpers for public summarization endpoints."""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass

from config import MAX_SUMMARIZATION_CHARS


@dataclass(frozen=True)
class TruncationInfo:
    input_truncated: bool
    input_limit: int
    original_input_length: int
    processed_input_length: int

    def to_dict(self) -> dict[str, int | bool]:
        return asdict(self)


def _sentence_boundary_truncate(text: str, max_chars: int) -> str:
    candidate = text[:max_chars].rstrip()
    matches = list(re.finditer(r"[\u0964\u0965.!?]\s*", candidate))
    if matches and matches[-1].end() >= max_chars * 0.65:
        return candidate[: matches[-1].end()].strip()
    return candidate.strip()


def apply_input_limit(text: str, max_chars: int = MAX_SUMMARIZATION_CHARS) -> tuple[str, TruncationInfo]:
    """Bound text length while preserving a clear metadata trail."""
    safe_text = text or ""
    original_length = len(safe_text)
    if original_length <= max_chars:
        processed = safe_text.strip()
        return processed, TruncationInfo(
            input_truncated=False,
            input_limit=max_chars,
            original_input_length=original_length,
            processed_input_length=len(processed),
        )

    processed = _sentence_boundary_truncate(safe_text, max_chars)
    return processed, TruncationInfo(
        input_truncated=True,
        input_limit=max_chars,
        original_input_length=original_length,
        processed_input_length=len(processed),
    )
