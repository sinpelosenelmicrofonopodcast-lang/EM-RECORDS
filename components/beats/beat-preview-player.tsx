"use client";

import { useRef } from "react";

let activeAudio: HTMLAudioElement | null = null;

export function BeatPreviewPlayer({
  src,
  startSeconds = 15,
  durationSeconds = 45,
  label = "45s preview"
}: {
  src: string;
  startSeconds?: number;
  durationSeconds?: number;
  label?: string;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const start = Math.max(0, Number(startSeconds || 0));
  const duration = Math.max(10, Math.min(90, Number(durationSeconds || 45)));
  const end = start + duration;

  function clamp(audio: HTMLAudioElement) {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const safeStart = Math.min(start, Math.max(0, audio.duration - Math.min(5, duration)));
    const safeEnd = Math.min(audio.duration, safeStart + duration);
    if (audio.currentTime < safeStart - 0.25 || audio.currentTime > safeEnd + 0.25) {
      audio.currentTime = safeStart;
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">Preview</span>
        <span className="text-[10px] uppercase tracking-[0.12em] text-white/35">{label}</span>
      </div>
      <audio
        ref={ref}
        controls
        controlsList="nodownload noplaybackrate"
        preload="none"
        src={src}
        className="w-full"
        onLoadedMetadata={(event) => {
          clamp(event.currentTarget);
        }}
        onPlay={(event) => {
          const audio = event.currentTarget;
          if (activeAudio && activeAudio !== audio) activeAudio.pause();
          activeAudio = audio;
          clamp(audio);
        }}
        onSeeking={(event) => {
          clamp(event.currentTarget);
        }}
        onTimeUpdate={(event) => {
          const audio = event.currentTarget;
          if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
          const safeStart = Math.min(start, Math.max(0, audio.duration - Math.min(5, duration)));
          const safeEnd = Math.min(audio.duration, safeStart + duration);
          if (audio.currentTime >= safeEnd - 0.08) {
            audio.pause();
            audio.currentTime = safeStart;
          }
        }}
        onEnded={(event) => {
          const audio = event.currentTarget;
          const safeStart = Number.isFinite(audio.duration)
            ? Math.min(start, Math.max(0, audio.duration - Math.min(5, duration)))
            : 0;
          audio.currentTime = safeStart;
        }}
      />
    </div>
  );
}
