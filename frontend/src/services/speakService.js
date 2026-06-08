import { FALLBACK_NEWS } from "../constants/speakConstants";
import { normalizeNewsResponse } from "../utils/speakParsers";

const DEFAULT_API_BASE_URL = "https://automated-telugu-text-summarization-and-s2gz.onrender.com";
const API_BASE_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, "");

const requestJson = async (path) => {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
};

const resolveAudioUrl = (audioPath) => {
  if (!audioPath) return null;
  if (audioPath.startsWith("http://") || audioPath.startsWith("https://")) {
    return audioPath;
  }
  return `${API_BASE_URL}${audioPath}`;
};

export const fetchLatestNews = async (generateAudio = true) => {
  try {
    // Uses backend API only; browser never calls external providers directly.
    const payload = await requestJson(`/latest-news?language=te&limit=5&generate_audio=${generateAudio}`);
    const news = normalizeNewsResponse(payload).map((item) => ({
      ...item,
      audioUrl: resolveAudioUrl(item.audioUrl),
      topNewsAudioUrl: resolveAudioUrl(item.topNewsAudioUrl),
      briefAudioUrl: resolveAudioUrl(item.briefAudioUrl),
      radioAudioUrl: resolveAudioUrl(item.radioAudioUrl),
    }));
    const hasEdgeAudio = news.some(
      (item) => item.audioUrl || item.topNewsAudioUrl || item.briefAudioUrl || item.radioAudioUrl
    );
    if (generateAudio && !hasEdgeAudio) {
      throw new Error("Edge Telugu audio was not generated");
    }
    if (news.length > 0) {
      return news;
    }
  } catch (error) {
    if (generateAudio) {
      throw error;
    }
    // Fall through to deterministic local fallback.
  }
  return FALLBACK_NEWS.te;
};
