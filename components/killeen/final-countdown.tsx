"use client";

import type { SiteLanguage } from "@/lib/i18n";
import { splitCountdownMs } from "@/lib/countdown";
import { useCountdownDiff } from "@/lib/use-countdown";

export function FinalCountdown({ targetDate, lang = "es" }: { targetDate: string; lang?: SiteLanguage }) {
  const diffMs = useCountdownDiff(targetDate);
  const time = splitCountdownMs(diffMs ?? 0);

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
