# Deployment Notes & Guide

## 🛠️ Local Setup Details

### Backend

```bash
python -m venv myenv
source myenv/bin/activate
pip install -r requirements.txt

cd backend
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

*Note: Tokenizer dependencies are included in `requirements.txt`. mT5/SentencePiece loading requires both `sentencepiece` and `protobuf`; missing `protobuf` can cause tokenizer initialization to fail and trigger the TF-IDF fallback path.*

Backend runs at: `http://localhost:8000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

For local frontend-to-backend communication, create `frontend/.env`:
```env
VITE_API_URL=http://localhost:8000
```

---

## 🐳 Docker Backend Local Setup

Build the backend image from the project root:
```bash
docker build -t telugu-news-api .
```

Run locally:
```bash
docker run --rm \
  --name telugu-news-api \
  -p 7860:7860 \
  -e PORT=7860 \
  -e CORS_ORIGIN_REGEX='https://.*\.vercel\.app' \
  telugu-news-api
```

Test:
```bash
curl http://localhost:7860/health
```

---

## 🌐 Production Deployment

### Backend: Hugging Face Spaces

Use the existing `Dockerfile` with the Hugging Face Spaces Docker SDK. The free CPU tier provides 16GB RAM, which gives the mT5 and TTS paths substantially more headroom than the previous 512MB Render deployment.

Recommended environment variables:
```env
PORT=7860
DEBUG=false
CORS_ORIGIN_REGEX=https://.*\.vercel\.app
CORS_ORIGINS=https://saaram-nlp.vercel.app
```

### Frontend: Vercel

Set the frontend root directory to: `frontend`

Build settings:
```text
Install Command: npm ci
Build Command: npm run build
Output Directory: dist
```

Environment variable:
```env
VITE_API_URL=https://harin999-telugu-summarizer-backend.hf.space
```

---

## ⚠️ Infrastructure Notes

- **Cold Starts:** Hugging Face Spaces can cold start after inactivity.
- **Model Preload:** Preload is disabled by default to keep baseline memory pressure low; enable it only when the selected Space hardware has enough headroom.
- **Speak/Radio Mode Compute:** Speak/Radio mode is heavier than text/URL summarization because it combines RSS ingestion, mT5 inference, and Edge TTS generation.
- **Speech Generation Latency:** Edge TTS generation can add latency, especially for latest-news audio batches.
- **Audio Clean-up:** `backend/data/` is used for generated audio files. On free hosting, local filesystem writes may not persist across restarts.
- **Tokenizers:** mT5/T5 tokenizers use SentencePiece. `sentencepiece` is required; `tiktoken` is included only as a defensive fallback for tokenizer conversion edge cases.

---

For the main project overview, see [README.md](../README.md).
