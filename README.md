---
title: Automated Telugu Text Summarization
emoji: 📰
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# Automated Telugu Text Summarization & Speech Generation

![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688)
![React](https://img.shields.io/badge/React-Vite-61DAFB)
![Transformers](https://img.shields.io/badge/Hugging%20Face-Transformers-FFD21E)
![Docker](https://img.shields.io/badge/Docker-Render-2496ED)
![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000)

Practical low-resource Telugu NLP system for news summarization and speech generation, with deployment-focused reliability improvements for constrained hosting.

**Status:** Research paper under review at **ICANITS 2026**.

The system supports direct Telugu text input, URL-based article extraction, extractive TF-IDF summarization, transformer-based mT5 summarization, and optional Telugu text-to-speech audio generation with graceful fallback behavior.

## 🚀 Live Demo

- Frontend: https://automated-telugu-text-summarization.vercel.app/
- Backend API: https://automated-telugu-text-summarization-and-s2gz.onrender.com
- API Docs: https://automated-telugu-text-summarization-and-s2gz.onrender.com/docs
- Health Check: https://automated-telugu-text-summarization-and-s2gz.onrender.com/health

For the smoothest demo on free hosting, start with the `TF-IDF` method. Transformer requests may take longer because the model is loaded lazily and Speak mode is intentionally heavier than text-only summarize paths.

## 🎬 Video Demo

[Watch Demo](https://drive.google.com/file/d/1BcKZtN3p1y47VnsjAZhXa5IvfEEtf2h3/view?usp=sharing)

What the demo shows:

- Telugu text summarization using mT5
- URL-based article summarization
- Runtime model selection with TF-IDF / mT5
- Output generation through FastAPI
- Optional Telugu MP3 audio output
- Graceful fallback behavior for transformer and tokenizer failures

Note: TTS audio output is supported, but playback may not be audible in the recording depending on screen-recording settings.

## 🧠 Features

- Telugu text summarization from pasted input
- Telugu article summarization from URLs
- Extractive summarization with TF-IDF
- Transformer-based abstractive summarization with mT5
- Automatic fallback to TF-IDF if mT5/tokenizer loading fails
- Telugu speech generation using Edge TTS
- Latest-news workflow with RSS ingestion
- FastAPI documentation at `/docs`
- Deployed React frontend and Dockerized backend

## 🚀 Project Highlights

- End-to-end working NLP system
- Extractive and transformer-based summarization in one application
- Runtime model selection through API payloads
- Telugu neural speech generation with MP3 playback
- Full-stack integration with React and FastAPI
- Dockerized backend deployed on Render
- Vite frontend deployed on Vercel
- Research-backed architecture with evaluation metrics

## Speak / Radio Mode

Speak mode is the premium AI Telugu radio/news experience. It combines RSS ingestion, article extraction, summarization, and Edge TTS into an audio-first pipeline for narrated bulletins. Text and URL summarization remain optional-audio paths so the app can stay responsive for faster summarization use cases.

Edge TTS is preferred over browser speech for consistent Telugu voice quality and reusable MP3 playback, while frontend logic preserves the existing premium audio-first identity.

## Architecture

![Architecture](assets/system_architecture.svg)

```text
React + Vite Frontend (Vercel)
        |
        | VITE_API_URL
        v
FastAPI Backend (Render Docker)
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

## ⚙️ Tech Stack

| Layer | Tools |
| --- | --- |
| Frontend | React, Vite, React Router, Tailwind CSS, Framer Motion |
| Backend | FastAPI, Uvicorn, Pydantic |
| NLP | Hugging Face Transformers, PyTorch, SentencePiece, scikit-learn |
| Summarization | TF-IDF, mT5 multilingual XLSum |
| Speech | Edge TTS |
| Deployment | Render Docker backend, Vercel frontend |
| Packaging | Docker, requirements.txt, npm |

## 📂 Project Structure

```text
.
├── backend/
│   ├── app.py
│   ├── pipeline.py
│   ├── extract.py
│   ├── clean.py
│   ├── summarize_tfidf.py
│   ├── summarize_mt5.py
│   ├── tts.py
│   ├── services/
│   ├── data/
│   └── model/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── screenshots/
├── assets/
├── Dockerfile
├── requirements.txt
└── README.md
```

## 📸 Screenshots

### Home

![Home Page](screenshots/Home.png)

### Text Summarization

![Text Summarization](screenshots/Text.png)

### URL Summarization

![URL Summarization](screenshots/URL.png)

### Speak News

![Speak News](screenshots/Speak.png)

### API Docs

![API Docs](screenshots/Docs.png)

## 🔌 API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/health` | Lightweight health check |
| GET | `/docs` | FastAPI Swagger documentation |
| POST | `/summarize` | Summarize pasted Telugu text |
| POST | `/process-url` | Extract and summarize an article URL |
| GET | `/latest-news` | Fetch and summarize Telugu news |
| GET | `/audio/{filename}` | Serve generated MP3 files |

## 🔊 Speech System

- Implemented using Edge TTS
- Uses a Telugu neural voice for MP3 generation
- Generated audio is written to `backend/data/`
- Audio files are served by FastAPI through `/audio/{filename}`
- On free hosting, generated files may not persist after restarts

## 🛠️ Local Setup

### Backend

```bash
python -m venv myenv
source myenv/bin/activate
pip install -r requirements.txt

cd backend
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Tokenizer dependencies are included in `requirements.txt`. mT5/SentencePiece loading requires both `sentencepiece` and `protobuf`; missing `protobuf` can cause tokenizer initialization to fail and trigger the TF-IDF fallback path.

Backend runs at:

```text
http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

For local frontend-to-backend communication, create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

## 🐳 Docker Backend

Build the backend image from the project root:

```bash
docker build -t telugu-news-api .
```

Run locally:

```bash
docker run --rm \
  --name telugu-news-api \
  -p 10000:10000 \
  -e PORT=10000 \
  -e CORS_ORIGIN_REGEX='https://.*\.vercel\.app' \
  telugu-news-api
```

Test:

```bash
curl http://localhost:10000/health
```

## 🌐 Deployment

### Backend: Render

Use the existing `Dockerfile`.

Recommended environment variables:

```env
PORT=10000
DEBUG=false
CORS_ORIGIN_REGEX=https://.*\.vercel\.app
CORS_ORIGINS=https://automated-telugu-text-summarization.vercel.app
```

### Frontend: Vercel

Set the frontend root directory to:

```text
frontend
```

Build settings:

```text
Install Command: npm ci
Build Command: npm run build
Output Directory: dist
```

Environment variable:

```env
VITE_API_URL=https://automated-telugu-text-summarization-and-s2gz.onrender.com
```

## 🔧 Reliability & Hardening

This deployment includes practical production hardening for constrained infrastructure:

- Bounded in-memory caches for summary results, TTS audio paths, and extracted article text to prevent unbounded memory growth.
- Graceful fallback transparency with `requested_method` vs `executed_method` and `fallback_reason` fields.
- SSRF and URL safety protections for public URL summarization.
- Input size limits and truncation metadata to keep transformer inputs predictable.
- A readiness endpoint that can verify model availability and surface degraded states.
- Reduced Edge TTS concurrency to lower transient memory spikes during Speak/latest-news audio generation.

## ⚠️ Deployment Notes

- Render free tier can cold start after inactivity.
- Preload is disabled by default on the 512MB tier to keep baseline memory pressure low.
- Speak/Radio mode is heavier than text/URL summarization because it combines RSS ingestion, mT5 inference, and Edge TTS generation.
- Edge TTS generation can add latency, especially for latest-news audio batches.
- Bounded in-memory caches limit memory growth on long-running instances.
- Optional TTS is available for text and URL summarize routes; audio is generated only when requested.
- `backend/model/` is intentionally excluded from Docker builds to keep the image small.
- `backend/data/` is used for generated audio files. On free hosting, local filesystem writes may not persist across restarts.
- mT5/T5 tokenizers use SentencePiece. `sentencepiece` is required; `tiktoken` is included only as a defensive fallback for tokenizer conversion edge cases.

## 📦 Model Notes

The fine-tuned Telugu mT5 model is included only for local research and development workflows. The public deployment intentionally avoids shipping the 3.6GB finetuned checkpoint to keep the Render free-tier deployment practical and to reduce memory pressure.

Runtime behavior:

1. If a local fine-tuned model exists, the backend will attempt to load it for research or development.
2. For public deployment, the system relies on TF-IDF and the public `csebuetnlp/mT5_multilingual_XLSum` base model instead of the large local finetuned checkpoint.
3. If mT5 or tokenizer loading fails, the app falls back to TF-IDF and reports fallback metadata.

Fallback visibility:

- `requested_method` is the method selected by the UI or route.
- `executed_method` is the method that actually produced the summary.
- `status` is `ok` or `fallback`.
- `fallback_reason` contains the categorized root cause, such as a dependency failure, missing model files, memory/timeout failure, or tokenizer initialization failure.

To use a local fine-tuned model during development, place it in:

```text
backend/model/mt5-telugu-news-finetuned/
```

Then restart the backend server.

## 📊 Evaluation Snapshot

| Model | ROUGE-1 | ROUGE-2 | ROUGE-L | BERTScore |
| --- | --- | --- | --- | --- |
| TF-IDF | 0.0324 | 0.0034 | 0.0320 | 0.6728 |
| mT5 Base | 0.0436 | 0.0022 | 0.0427 | 0.7239 |
| mT5 Fine-Tuned | 0.0404 | 0.0019 | 0.0400 | 0.7229 |

Key insight: fine-tuning did not improve performance in this experiment because the dataset was limited and the pre-trained multilingual model already covered a similar distribution.

## 🧠 Key Learnings

- Pre-trained multilingual models can outperform fine-tuned models when fine-tuning data is limited.
- BERTScore is often more informative than ROUGE for morphologically rich languages like Telugu.
- Fine-tuning large transformer models requires significantly more data and compute for stable gains.
- Extractive methods can show misleading ROUGE behavior because lexical overlap does not always equal semantic quality.
- Production deployments need graceful fallbacks because hosted model loading can fail due to memory, cold starts, or tokenizer issues.

## 👥 Team Contributions

| Contributor | Focus Area |
| --- | --- |
| Hariharan | Backend API, NLP pipeline, model integration, evaluation |
| Vishnu | React frontend, UI integration, user workflows |
| Vivek | Testing, integration, debugging |
| Sanjeev | Data preparation, text cleaning, experimentation support |

## 🔮 Future Enhancements

- Larger Telugu summarization dataset
- Parameter-efficient fine-tuning with LoRA
- Long-context summarization
- Persistent object storage for generated audio
- GPU-backed inference deployment
- Multilingual expansion for other Indian languages

## 📄 Research Context

This project demonstrates a practical low-resource Indian-language NLP system using a production-style full-stack architecture: React frontend, FastAPI backend, Docker deployment, Hugging Face Transformers, and graceful fallback behavior for constrained hosting environments.
