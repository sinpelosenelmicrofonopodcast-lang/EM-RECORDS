"use client";

import { useEffect, useMemo, useState } from "react";
import type { SiteLanguage } from "@/lib/i18n";
import { getNextUpVotingPhase } from "@/lib/next-up-voting";

type VotingWindowCountdownProps = {
  startsAtIso: string;
  endsAtIso: string;
  lang: SiteLanguage;
};

function splitTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / (24 * 3600));
  const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

export function VotingWindowCountdown({ startsAtIso, endsAtIso, lang }: VotingWindowCountdownProps) {
  const startsAt = useMemo(() => new Date(startsAtIso), [startsAtIso]);
  const endsAt = useMemo(() => new Date(endsAtIso), [endsAtIso]);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const phase = getNextUpVotingPhase(now, startsAt, endsAt);
  const target = phase === "before" ? startsAt : phase === "active" ? endsAt : null;

  const startsLabel = startsAt.toLocaleString(lang === "es" ? "es-ES" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
  const endsLabel = endsAt.toLocaleString(lang === "es" ? "es-ES" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  if (!target) {
    return (
      <div className="mt-4 rounded-2xl border border-red-400/35 bg-red-500/10 p-4 text-sm text-red-200">
        <p className="text-xs uppercase tracking-[0.18em]">{lang === "es" ? "Votación finalizada" : "Voting ended"}</p>
        <p className="mt-2 text-white/80">
          {lang === "es"
            ? `La votación estuvo abierta del ${startsLabel} al ${endsLabel}.`
            : `Voting was open from ${startsLabel} to ${endsLabel}.`}
        </p>
      </div>
    );
  }

  const remaining = splitTime(target.getTime() - now.getTime());
  const label = phase === "before" ? (lang === "es" ? "Votación inicia en" : "Voting starts in") : lang === "es" ? "Votación cierra en" : "Voting closes in";

  return (
    <div className="mt-4 rounded-2xl border border-gold/35 bg-gold/10 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-gold">{label}</p>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        {[
          [remaining.days, lang === "es" ? "días" : "days"],
          [remaining.hours, lang === "es" ? "horas" : "hours"],
          [remaining.minutes, lang === "es" ? "min" : "min"],
          [remaining.seconds, lang === "es" ? "seg" : "sec"]
        ].map(([value, unit]) => (
          <div key={String(unit)} className="rounded-xl border border-white/15 bg-black/45 px-2 py-3">
            <p className="font-display text-2xl text-white">{pad(Number(value))}</p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/60">{unit}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-white/70">
        {lang === "es" ? `Ventana oficial: ${startsLabel} → ${endsLabel}` : `Official window: ${startsLabel} → ${endsLabel}`}
      </p>
    </div>
  );
}
