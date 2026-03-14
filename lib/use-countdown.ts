"use client";

import { useEffect, useState } from "react";
import { getCountdownDiffMs } from "@/lib/countdown";

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}

export function useCountdownDiff(targetDate: string, intervalMs = 60_000) {
  const [diffMs, setDiffMs] = useState<number | null>(() => getCountdownDiffMs(targetDate));

  useEffect(() => {
    setDiffMs(getCountdownDiffMs(targetDate));

    const timer = window.setInterval(() => {
      setDiffMs(getCountdownDiffMs(targetDate));
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [intervalMs, targetDate]);

  return diffMs;
}
