import { cn } from "@/lib/utils";

type Props = {
  status: string;
};

const STYLE_MAP: Record<string, string> = {
  lead_received: "border-white/20 bg-white/5 text-white/80",
  internal_review: "border-sky-400/40 bg-sky-400/10 text-sky-200",
  offer_sent: "border-amber-400/40 bg-amber-400/10 text-amber-100",
  artist_viewed_offer: "border-amber-300/45 bg-amber-300/10 text-amber-100",
  artist_signed: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  label_counter_signed: "border-teal-300/40 bg-teal-300/10 text-teal-100",
  fully_executed: "border-gold/60 bg-gold/15 text-gold",
  archived: "border-white/20 bg-white/[0.03] text-white/60",
  declined: "border-rose-400/40 bg-rose-400/10 text-rose-200",
  expired: "border-rose-300/40 bg-rose-300/10 text-rose-100",
  draft: "border-white/20 bg-white/[0.03] text-white/70",
  revoked: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  viewed: "border-amber-300/45 bg-amber-300/10 text-amber-100",
  sent: "border-amber-400/40 bg-amber-400/10 text-amber-100",
  accepted: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
};

export function StatusBadge({ status }: Props) {
  const label = status.replaceAll("_", " ");
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
        STYLE_MAP[status] ?? "border-white/20 bg-white/5 text-white/80"
      )}
    >
      {label}
    </span>
  );
}

