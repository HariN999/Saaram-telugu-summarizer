/**
 * API Service for Telugu News Summarization
 */

const DEFAULT_API_BASE_URL = "https://harin999-telugu-summarizer-backend.hf.space";
const API_BASE_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, "");

class APIError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "APIError";
    this.status = status;
  }
}

class APIService {
  /**
   * Handle API response
   */
  static async handleResponse(response) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.detail || `Request failed with status ${response.status}`,
        response.status
      );
    }
    return await response.json();
  }

  /**
   * Get full audio URL from path
   */
  static getAudioUrl(path) {
    if (!path) return null;
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    // Path already includes /audio/ prefix from backend
    return `${API_BASE_URL}${path}`;
  }

  /**
   * Summarize text
   */
  static async summarizeText(text, method = "tfidf", generateAudio = false) {
    const response = await fetch(`${API_BASE_URL}/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        method,
        generate_audio: generateAudio
      }),
    });
    return this.handleResponse(response);
  }

  /**
   * Process URL
   */
  static async processUrl(url, method = "tfidf", generateAudio = false) {
    const response = await fetch(`${API_BASE_URL}/process-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        method,
        generate_audio: generateAudio
      }),
    });
    return this.handleResponse(response);
  }

  /**
   * Get latest news
   */
  static async getLatestNews(language = "te", limit = 5) {
    const response = await fetch(
      `${API_BASE_URL}/latest-news?language=${language}&limit=${limit}`
    );
    return this.handleResponse(response);
  }

  /**
   * Check API health
   */
  static async checkHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export default APIService;
