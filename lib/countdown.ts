export type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export function getCountdownDiffMs(targetDate: string | Date, now = Date.now()): number | null {
  const targetMs = typeof targetDate === "string" ? new Date(targetDate).getTime() : targetDate.getTime();
  if (Number.isNaN(targetMs)) {
    return null;
  }

  return targetMs - now;
}

export function splitCountdownMs(ms: number): CountdownParts {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));

  return {
    days: Math.floor(totalSeconds / (24 * 3600)),
    hours: Math.floor((totalSeconds % (24 * 3600)) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60
  };
}
