import { useEffect, useRef, useState } from "react";
import { Clock, RotateCcw, Download, Film, ExternalLink } from "lucide-react";
import type { UserRole, SectionSize } from "@/types";
import { getSectionProgress, saveSectionProgress } from "@/api";
import { cn } from "@/lib/utils";

interface VideoSectionProps {
  sectionId: string;
  url: string;
  size?: SectionSize;
  currentRole: UserRole;
  isRead: boolean;
  onMarkCompleted: (sectionId: string) => void;
}

const WIDTH_BY_SIZE: Record<SectionSize, string> = {
  small: "max-w-md mx-auto",
  medium: "max-w-2xl mx-auto",
  large: "max-w-5xl mx-auto",
  full: "max-w-none",
};

const HEIGHT_BY_SIZE: Record<SectionSize, string> = {
  small: "max-h-[40vh]",
  medium: "max-h-[50vh]",
  large: "max-h-[65vh]",
  full: "max-h-[78vh]",
};

function fmt(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function toEmbedUrl(raw: string): string | null {
  if (!raw || !/^https?:\/\//i.test(raw)) return null;
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^(www|m)\./, "").toLowerCase();
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      let id = u.searchParams.get("v") || "";
      const seg = u.pathname.split("/").filter(Boolean);
      if (!id && (seg[0] === "shorts" || seg[0] === "live" || seg[0] === "embed")) id = seg[1] || "";
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const seg = u.pathname.split("/").filter(Boolean);
      const id = seg[seg.length - 1] || "";
      return /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    // not a parseable URL
  }
  return null;
}

export function VideoSection({ sectionId, url, size = "large", currentRole, isRead, onMarkCompleted }: VideoSectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const startSecondsRef = useRef(0);
  const completedRef = useRef(false);
  const lastSaveRef = useRef(0);
  const currentTimeRef = useRef(0);
  const [started, setStarted] = useState(false);
  const [resumeSeconds, setResumeSeconds] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(true);

  const embedUrl = toEmbedUrl(url);
  const isEmbed = !!embedUrl;

  const persist = async (force = false) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    const now = Date.now();
    if (!force && now - lastSaveRef.current < 4000) return;
    lastSaveRef.current = now;
    const pos = Math.max(0, Math.min(video.currentTime, video.duration || video.currentTime));
    await saveSectionProgress(sectionId, pos);
  };

  useEffect(() => {
    completedRef.current = isRead;
  }, [isRead]);

  useEffect(() => {
    let cancelled = false;
    if (isEmbed) {
      setLoadingProgress(false);
      return () => {
        cancelled = true;
      };
    }
    setLoadingProgress(true);
    getSectionProgress(sectionId).then((seconds) => {
      if (cancelled) return;
      startSecondsRef.current = seconds;
      setResumeSeconds(seconds);
      setStarted(seconds > 1);
      setLoadingProgress(false);
    });
    return () => {
      cancelled = true;
    };
  }, [sectionId, isEmbed]);

  useEffect(() => {
    return () => {
      persist(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    if (
      startSecondsRef.current > 2 &&
      Number.isFinite(video.duration) &&
      startSecondsRef.current < video.duration - 2
    ) {
      video.currentTime = startSecondsRef.current;
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    currentTimeRef.current = video.currentTime;
    persist();
    if (
      currentRole !== "admin" &&
      !isRead &&
      !completedRef.current &&
      Number.isFinite(video.duration) &&
      video.duration > 0 &&
      video.currentTime / video.duration >= 0.95
    ) {
      completedRef.current = true;
      onMarkCompleted(sectionId);
    }
  };

  const handleEnded = () => {
    if (currentRole !== "admin" && !isRead && !completedRef.current) {
      completedRef.current = true;
      onMarkCompleted(sectionId);
    }
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      currentTimeRef.current = 0;
    }
    saveSectionProgress(sectionId, 0);
    setResumeSeconds(0);
  };

  const handleRestart = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    currentTimeRef.current = 0;
    startSecondsRef.current = 0;
    setResumeSeconds(0);
    saveSectionProgress(sectionId, 0);
    video.play().catch(() => {});
  };

  if (isEmbed && embedUrl) {
    return (
      <div className="p-5">
        <div className={cn("rounded-xl overflow-hidden bg-black aspect-video shadow-inner", WIDTH_BY_SIZE[size])}>
          <iframe
            src={embedUrl}
            title="Embedded video player"
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2 mt-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Film className="w-3.5 h-3.5" />
            <span>
              External video (YouTube / Vimeo). Playback is provided by the video host.
            </span>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 border border-sf-cream-dark dark:border-slate-600 rounded-lg hover:bg-sf-cream dark:hover:bg-slate-700 transition-colors"
          >
            <ExternalLink className="w-3 h-3" /> Open original
          </a>
        </div>
        <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Auto-resume is unavailable inside embedded players. Mark the section as read when finished.
        </p>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className={cn("relative rounded-xl overflow-hidden bg-black shadow-inner", WIDTH_BY_SIZE[size])}>
        <video
          ref={videoRef}
          controls
          controlsList="nodownload"
          preload="metadata"
          playsInline
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPause={() => persist(true)}
          className={cn("w-full", HEIGHT_BY_SIZE[size])}
        >
          <source src={url} />
          Your browser does not support the video tag.
        </video>
        {loadingProgress && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
            <span className="text-xs text-white bg-black/60 px-3 py-1.5 rounded-full animate-pulse">
              Loading player…
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2 mt-3">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Film className="w-3.5 h-3.5" />
          <span>
            {resumeSeconds > 1 && !isRead ? (
              <>Resumes from <span className="font-semibold text-sf-brown dark:text-sf-gold">{fmt(resumeSeconds)}</span></>
            ) : (
              <>Progress is saved automatically</>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRestart}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 border border-sf-cream-dark dark:border-slate-600 rounded-lg hover:bg-sf-cream dark:hover:bg-slate-700 transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Restart
          </button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 border border-sf-cream-dark dark:border-slate-600 rounded-lg hover:bg-sf-cream dark:hover:bg-slate-700 transition-colors"
          >
            <Download className="w-3 h-3" /> Download
          </a>
        </div>
      </div>
      {!started && !loadingProgress && (
        <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Press play to begin. Your position is remembered if you leave and come back.
        </p>
      )}
    </div>
  );
}
