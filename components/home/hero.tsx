"use client";

import { useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { ButtonLink } from "@/components/shared/button";
import { EmLogo } from "@/components/shared/em-logo";
import type { SiteLanguage } from "@/lib/i18n";

type HeroProps = {
  lang: SiteLanguage;
};

export function Hero({ lang }: HeroProps) {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  function toggleAudio() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audioEnabled) {
      audio.pause();
      audio.currentTime = 0;
      setAudioEnabled(false);
      return;
    }

    audio.play().catch(() => null);
    setAudioEnabled(true);
  }

  return (
    <section className="relative isolate overflow-hidden border-b border-white/10 bg-black">
      <video
        className="absolute inset-0 -z-20 h-full w-full object-cover opacity-60"
        autoPlay
        muted
        loop
        playsInline
        poster="/images/hero-poster.jpg"
      >
        <source src="/videos/em-hero.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/20 via-black/60 to-black" />

      <div className="mx-auto flex min-h-[86vh] w-full max-w-7xl flex-col justify-end px-6 pb-16 pt-28 md:px-10">
        <div className="mb-5 w-[180px] md:w-[220px]">
          <EmLogo priority alt="EM Records LLC" />
        </div>
        <p className="mb-4 text-xs uppercase tracking-[0.32em] text-gold">EM Records LLC</p>
        <h1 className="max-w-4xl font-display text-4xl font-semibold leading-[1.05] text-white md:text-7xl">
          Don&apos;t chase the wave. <span className="text-gold">Create it.</span>
        </h1>

        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/70 md:text-base">
          {lang === "es"
            ? "Cultura urbana latina, estrategia internacional y ejecución de major label. Esto no es un estudio local. Esto es un movimiento."
            : "Urban latin culture, international strategy and major-label execution. This is not a local studio. This is a movement."}
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <ButtonLink href="/artists">{lang === "es" ? "Explorar artistas" : "Explore Artists"}</ButtonLink>
          <ButtonLink href="/releases" variant="ghost">
            {lang === "es" ? "Último lanzamiento" : "Latest Release"}
          </ButtonLink>
          <ButtonLink href="/join" variant="ghost">
            {lang === "es" ? "Únete al movimiento" : "Join The Movement"}
          </ButtonLink>

          <button
            type="button"
            onClick={toggleAudio}
            className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white/70 hover:border-gold hover:text-gold"
          >
            {audioEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            {lang === "es" ? "Audio ambiente" : "Ambient Audio"}
          </button>
        </div>
      </div>

      <audio ref={audioRef} loop>
        <source src="/audio/em-ambient.mp3" type="audio/mpeg" />
      </audio>
    </section>
  );
}
