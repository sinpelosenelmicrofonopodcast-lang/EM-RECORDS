"use client";

import { useEffect, useMemo, useState } from "react";

type ReleaseCountdownProps = {
  releaseDate: string;
  title: string;
};

function getDiff(targetDate: string) {
  const diff = +new Date(targetDate) - Date.now();
  const safeDiff = Math.max(diff, 0);

  return {
    days: Math.floor(safeDiff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((safeDiff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((safeDiff / (1000 * 60)) % 60)
  };
}

export function ReleaseCountdown({ releaseDate, title }: ReleaseCountdownProps) {
  const [tick, setTick] = useState(() => getDiff(releaseDate));

  useEffect(() => {
    const interval = setInterval(() => setTick(getDiff(releaseDate)), 60_000);
    return () => clearInterval(interval);
  }, [releaseDate]);

  const expired = useMemo(() => +new Date(releaseDate) <= Date.now(), [releaseDate]);

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
