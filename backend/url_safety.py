"""Lightweight URL fetching guardrails for public demo deployments."""

from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urlparse

import requests

from config import MAX_URL_CONTENT_BYTES, URL_MAX_REDIRECTS, URL_REQUEST_TIMEOUT_SECONDS

ALLOWED_SCHEMES = {"http", "https"}
BLOCKED_HOSTS = {"localhost", "localhost.localdomain"}
DEFAULT_USER_AGENT = "TeluguAI-NewsFetcher/1.0"


class URLSafetyError(ValueError):
    """Raised when a URL is unsafe or unsuitable for article extraction."""


def _validate_public_host(hostname: str | None) -> str:
    if not hostname:
        raise URLSafetyError("URL must include a hostname")

    host = hostname.strip().lower().rstrip(".")
    if host in BLOCKED_HOSTS or host.endswith(".local") or host.endswith(".internal"):
        raise URLSafetyError("Local or internal URLs are not allowed")

    try:
        ipaddress.ip_address(host)
        candidates = [host]
    except ValueError:
        try:
            candidates = [item[4][0] for item in socket.getaddrinfo(host, None)]
        except socket.gaierror as exc:
            raise URLSafetyError("URL hostname could not be resolved") from exc

    for candidate in set(candidates):
        ip = ipaddress.ip_address(candidate)
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        ):
            raise URLSafetyError("Private, local, or reserved network addresses are not allowed")

    return host


def validate_public_url(url: str) -> str:
    parsed = urlparse((url or "").strip())
    if parsed.scheme.lower() not in ALLOWED_SCHEMES:
        raise URLSafetyError("Only http and https URLs are supported")
    if parsed.username or parsed.password:
        raise URLSafetyError("URLs with embedded credentials are not allowed")
    _validate_public_host(parsed.hostname)
    return parsed.geturl()


def safe_get(
    url: str,
    *,
    allowed_content_types: tuple[str, ...] = ("text/html", "text/plain", "application/xhtml+xml"),
    timeout: float = URL_REQUEST_TIMEOUT_SECONDS,
    max_bytes: int = MAX_URL_CONTENT_BYTES,
    max_redirects: int = URL_MAX_REDIRECTS,
    user_agent: str = DEFAULT_USER_AGENT,
) -> requests.Response:
    """Fetch a public URL with SSRF, timeout, redirect, and content-size checks."""
    current_url = validate_public_url(url)
    headers = {"User-Agent": user_agent, "Accept": "*/*"}

    for _ in range(max_redirects + 1):
        response = requests.get(
            current_url,
            timeout=timeout,
            headers=headers,
            stream=True,
            allow_redirects=False,
        )

        if response.is_redirect or response.is_permanent_redirect:
            location = response.headers.get("Location")
            response.close()
            if not location:
                raise URLSafetyError("Redirect response did not include a location")
            current_url = requests.compat.urljoin(current_url, location)
            validate_public_url(current_url)
            continue

        response.raise_for_status()
        content_type = response.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
        if allowed_content_types and content_type and content_type not in allowed_content_types:
            response.close()
            raise URLSafetyError(f"Unsupported content type: {content_type}")

        content_length = response.headers.get("Content-Length")
        if content_length:
            try:
                if int(content_length) > max_bytes:
                    response.close()
                    raise URLSafetyError("URL content is too large")
            except ValueError:
                pass

        chunks: list[bytes] = []
        total_bytes = 0
        for chunk in response.iter_content(chunk_size=65536):
            if not chunk:
                continue
            total_bytes += len(chunk)
            if total_bytes > max_bytes:
                response.close()
                raise URLSafetyError("URL content exceeded the maximum allowed size")
            chunks.append(chunk)

        response._content = b"".join(chunks)
        response.close()
        return response

    raise URLSafetyError("Too many redirects")
