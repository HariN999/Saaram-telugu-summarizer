"""
Configuration Settings
"""
import os


def _get_bool_env(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _get_cors_origins() -> list[str]:
    raw_origins = os.getenv("CORS_ORIGINS")
    if raw_origins:
        return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


# Directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODEL_DIR = os.path.join(BASE_DIR, "model")

# Create directories if they don't exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)

# Model Settings
MT5_BASE_MODEL = "csebuetnlp/mT5_multilingual_XLSum"
MT5_FINETUNED_PATH = os.path.join(MODEL_DIR, "mt5-telugu-finetuned")

# Summarization Settings
MAX_INPUT_LENGTH = 512
SUMMARY_MAX_LENGTH = 180
SUMMARY_MIN_LENGTH = 60
TFIDF_NUM_SENTENCES = 4   # slightly increase coverage

# Generation Settings (new section)
NUM_BEAMS = 4
LENGTH_PENALTY = 1.2
NO_REPEAT_NGRAM = 3


# TTS Settings
TTS_LANGUAGE = "te"
TTS_SLOW = False
EDGE_TTS_VOICE = "te-IN-ShrutiNeural"
EDGE_TTS_RATE = "+0%"

# API Settings
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))
DEBUG = _get_bool_env("DEBUG", default=False)
CORS_ORIGINS = _get_cors_origins()
CORS_ORIGIN_REGEX = os.getenv("CORS_ORIGIN_REGEX", r"https://.*\.vercel\.app")
