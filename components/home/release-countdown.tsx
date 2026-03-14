"use client";

import { splitCountdownMs } from "@/lib/countdown";
import { useCountdownDiff } from "@/lib/use-countdown";

type ReleaseCountdownProps = {
  releaseDate: string;
  title: string;
};

export function ReleaseCountdown({ releaseDate, title }: ReleaseCountdownProps) {
  const diffMs = useCountdownDiff(releaseDate);
  const expired = diffMs !== null && diffMs <= 0;
  const tick = splitCountdownMs(diffMs ?? 0);

  return (
    <div className="rounded-3xl border border-gold/30 bg-gradient-to-r from-gold/10 to-transparent p-6">
      <p className="text-xs uppercase tracking-[0.24em] text-gold">Countdown</p>
      <p className="mt-2 font-display text-2xl text-white">{title}</p>
      {expired ? (
        <p className="mt-2 text-sm text-white/80">Out now on all platforms.</p>
      ) : (
        <p className="mt-2 text-sm text-white/80">
          {tick.days}d {tick.hours}h {tick.minutes}m until drop
        </p>
      )}
    </div>
  );
}
