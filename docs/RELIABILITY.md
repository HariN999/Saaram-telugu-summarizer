# Reliability & Hardening Details

This deployment includes practical production hardening for constrained infrastructure:

- **Bounded Caches:** Bounded in-memory caches for summary results, TTS audio paths, and extracted article text to prevent unbounded memory growth.
- **Graceful Fallback Transparency:** Graceful fallback transparency with `requested_method` vs `executed_method` and `fallback_reason` fields.
- **SSRF Protections:** SSRF and URL safety protections for public URL summarization.
- **Input Constraints:** Input size limits and truncation metadata to keep transformer inputs predictable.
- **Readiness Checks:** A readiness endpoint that can verify model availability and surface degraded states.
- **Rate-Limiting & Concurrency Control:** Reduced Edge TTS concurrency to lower transient memory spikes during Speak/latest-news audio generation.

---

For the main project overview, see [README.md](../README.md).
