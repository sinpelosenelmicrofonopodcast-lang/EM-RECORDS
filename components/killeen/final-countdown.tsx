"use client";

import { useEffect, useState } from "react";
import type { SiteLanguage } from "@/lib/i18n";

function getCountdown(target: string) {
  const diff = Math.max(+new Date(target) - Date.now(), 0);
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60)
  };
}

export function FinalCountdown({ targetDate, lang = "es" }: { targetDate: string; lang?: SiteLanguage }) {
  const [time, setTime] = useState(() => getCountdown(targetDate));

  useEffect(() => {
    const timer = setInterval(() => setTime(getCountdown(targetDate)), 60_000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="rounded-3xl border border-red-400/30 bg-gradient-to-r from-red-500/15 via-gold/10 to-transparent p-6">
      <p className="text-xs uppercase tracking-[0.24em] text-gold">
        {lang === "es" ? "Próximamente: Final en Vivo" : "Coming soon: Live Final"}
      </p>
      <p className="mt-3 font-display text-3xl text-white">
        {time.days}d {time.hours}h {time.minutes}m
      </p>
    </div>
  );
}
