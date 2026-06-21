# Model Notes & Architecture Specifications

## 🏗️ System Architecture

```text
React + Vite Frontend (Vercel)
        |
        | VITE_API_URL
        v
FastAPI Backend (Hugging Face Spaces Docker SDK)
        |
        | extract -> clean -> summarize -> optional TTS
        v
TF-IDF / Hugging Face mT5 / Edge TTS
```

The system follows a modular NLP pipeline:

```text
Input text / URL
      |
      v
FastAPI Backend
      |
      v
Extract -> Clean -> Summarize -> Optional Text-to-Speech
      |
      v
JSON summary response + optional MP3 audio URL
```

The backend is designed to keep the API responsive even when transformer loading fails. If the mT5 tokenizer or model cannot be loaded, the summarization path logs the root cause and returns a TF-IDF summary instead of crashing the API. API responses expose both the requested model and the model that actually executed, so fallback results are never labeled as mT5.

---

## 🧩 NLP Pipeline Components

| File | Purpose |
| --- | --- |
| `backend/extract.py` | URL parsing and article text extraction |
| `backend/clean.py` | Telugu text normalization and cleanup |
| `backend/summarize_tfidf.py` | Fast extractive summarization with TF-IDF |
| `backend/summarize_mt5.py` | Transformer-based abstractive summarization with mT5 |
| `backend/tts.py` | Telugu speech generation with Edge TTS |
| `backend/pipeline.py` | End-to-end orchestration: extract -> clean -> summarize -> TTS |
| `backend/app.py` | FastAPI routes, CORS, health checks, audio serving |
| `backend/services/news_service.py` | Telugu RSS ingestion for latest-news mode |

---

## 🔌 API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/health` | Lightweight health check |
| GET | `/docs` | FastAPI Swagger documentation |
| POST | `/summarize` | Summarize pasted Telugu text |
| POST | `/process-url` | Extract and summarize an article URL |
| GET | `/latest-news` | Fetch and summarize Telugu news |
| GET | `/audio/{filename}` | Serve generated MP3 files |

---

## 🔊 Speech System & Speak Mode

### Speak / Radio Mode
Speak mode is the premium AI Telugu radio/news experience. It combines RSS ingestion, article extraction, summarization, and Edge TTS into an audio-first pipeline for narrated bulletins. Text and URL summarization remain optional-audio paths so the app can stay responsive for faster summarization use cases.

### Speech Generation Integration
- Implemented using Edge TTS.
- Uses a Telugu neural voice for MP3 generation.
- Generated audio is written to `backend/data/`.
- Audio files are served by FastAPI through `/audio/{filename}`.
- On free hosting, generated files may not persist after restarts.
- Edge TTS is preferred over browser speech for consistent Telugu voice quality and reusable MP3 playback.

---

## 📦 Model Notes

The fine-tuned Telugu mT5 model is included only for local research and development workflows. The public deployment intentionally avoids shipping the 3.6GB finetuned checkpoint to keep the GitHub repository and Docker image practical while reducing deployment size and startup pressure.

### Runtime Behavior
1. If a local fine-tuned model exists, the backend will attempt to load it for research or development.
2. For public deployment, the system relies on TF-IDF and the public `csebuetnlp/mT5_multilingual_XLSum` base model instead of the large local finetuned checkpoint.
3. If mT5 or tokenizer loading fails, the app falls back to TF-IDF and reports fallback metadata.

### Fallback Visibility
- `requested_method` is the method selected by the UI or route.
- `executed_method` is the method that actually produced the summary.
- `status` is `ok` or `fallback`.
- `fallback_reason` contains the categorized root cause, such as a dependency failure, missing model files, memory/timeout failure, or tokenizer initialization failure.

### Local Development Setup
To use a local fine-tuned model during development, place it in:
```text
backend/model/mt5-telugu-news-finetuned/
```
Then restart the backend server.

---

## 📄 Research Context
This project demonstrates a practical low-resource Indian-language NLP system using a production-style full-stack architecture: React frontend, FastAPI backend, Docker deployment, Hugging Face Transformers, and graceful fallback behavior for constrained hosting environments.

---

## 🔮 Future Enhancements
- Larger Telugu summarization dataset
- Parameter-efficient fine-tuning with LoRA
- Long-context summarization
- Persistent object storage for generated audio
- GPU-backed inference deployment
- Multilingual expansion for other Indian languages

---

For the main project overview, see [README.md](../README.md).
