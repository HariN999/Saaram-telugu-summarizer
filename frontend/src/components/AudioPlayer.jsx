import { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2, VolumeX, Download, Disc } from "lucide-react";

function AudioPlayer({ src, headline = "Audio Bulletin" }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioRef = useRef(null);
  const progressRef = useRef(null);

  useEffect(() => {
    // Reset player states when src changes
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
    }
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => {
        console.error("Audio playback error:", err);
      });
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return;
    const seekTime = parseFloat(e.target.value);
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMute = !isMuted;
    audioRef.current.muted = nextMute;
    setIsMuted(nextMute);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-lg backdrop-blur-xl">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
        preload="metadata"
      />

      <div className="flex flex-col gap-4">
        {/* Header/Info */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
              <Disc className={`h-4.5 w-4.5 ${isPlaying ? "animate-spin" : ""}`} style={{ animationDuration: '3s' }} />
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-widest text-[var(--primary)]">
                Spoken News Player
              </span>
              <span className="block truncate text-xs font-semibold text-[var(--text-primary)] mt-0.5">
                {headline}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Visualizer bars */}
            {isPlaying && (
              <div className="flex h-5 items-end gap-0.5 px-2">
                <div className="wave-bar origin-bottom h-4 w-1 rounded-full bg-[var(--primary)]" />
                <div className="wave-bar origin-bottom h-4 w-1 rounded-full bg-[var(--primary)]" />
                <div className="wave-bar origin-bottom h-4 w-1 rounded-full bg-[var(--primary)]" />
                <div className="wave-bar origin-bottom h-4 w-1 rounded-full bg-[var(--primary)]" />
              </div>
            )}
            
            <a
              href={src}
              download="summary_audio.mp3"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)]/30 hover:text-[var(--text-primary)]"
              title="Download Audio MP3"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Player controls row */}
        <div className="flex items-center gap-3.5">
          <button
            onClick={togglePlay}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-[var(--background)] shadow-md shadow-[var(--primary)]/20 transition-all hover:scale-105 active:scale-95"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-5.5 w-5.5 fill-current" />
            ) : (
              <Play className="ml-0.5 h-5.5 w-5.5 fill-current" />
            )}
          </button>

          {/* Slider Progress Seeker */}
          <div className="flex-1 flex flex-col gap-1">
            <input
              ref={progressRef}
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[var(--border)] accent-[var(--primary)] outline-none transition-all focus:outline-none"
              style={{
                background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${
                  (currentTime / (duration || 1)) * 100
                }%, var(--border) ${(currentTime / (duration || 1)) * 100}%, var(--border) 100%)`
              }}
            />
            <div className="flex justify-between text-[10px] font-medium text-[var(--text-secondary)] font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <button
            onClick={toggleMute}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] hover:border-[var(--primary)]/35"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AudioPlayer;
