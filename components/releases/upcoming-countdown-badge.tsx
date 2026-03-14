"use client";

import { useMemo } from "react";
import type { SiteLanguage } from "@/lib/i18n";
import { useCountdownDiff } from "@/lib/use-countdown";

type UpcomingCountdownBadgeProps = {
  targetDate: string;
  lang: SiteLanguage;
};

function getCountdownLabel(diffMs: number, lang: SiteLanguage): string {
  if (diffMs <= 0) {
    return lang === "es" ? "Disponible ahora" : "Out now";
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const totalHours = Math.floor(diffMs / 3600000);
  const totalDays = Math.floor(diffMs / 86400000);

  if (totalDays >= 1) {
    if (lang === "es") return totalDays === 1 ? "Falta 1 dia" : `Faltan ${totalDays} dias`;
    return totalDays === 1 ? "1 day left" : `${totalDays} days left`;
  }

  if (totalHours >= 1) {
    if (lang === "es") return totalHours === 1 ? "Falta 1 hora" : `Faltan ${totalHours} horas`;
    return totalHours === 1 ? "1 hour left" : `${totalHours} hours left`;
  }

  const minutes = Math.max(1, totalMinutes);
  if (lang === "es") return minutes === 1 ? "Falta 1 minuto" : `Faltan ${minutes} minutos`;
  return minutes === 1 ? "1 minute left" : `${minutes} minutes left`;
}

export function UpcomingCountdownBadge({ targetDate, lang }: UpcomingCountdownBadgeProps) {
  const diffMs = useCountdownDiff(targetDate);

  const label = useMemo(() => {
    if (diffMs === null) {
      return lang === "es" ? "Fecha pendiente" : "Date pending";
    }
    return getCountdownLabel(diffMs, lang);
  }, [diffMs, lang]);

  const toneClass = diffMs !== null && diffMs <= 0 ? "border-emerald-400/50 text-emerald-300 bg-emerald-500/10" : "border-gold/40 text-gold bg-gold/10";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${toneClass}`}>
      {label}
    </span>
  );
}
