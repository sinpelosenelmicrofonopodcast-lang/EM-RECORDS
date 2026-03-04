import Link from "next/link";

const sections = [
  ["catalog", "Catalog"],
  ["launch", "Launch Center"],
  ["media-kit", "MediaKit"],
  ["gallery", "Gallery"],
  ["documents", "Documents"],
  ["bookings", "Bookings"],
  ["content", "Content"],
  ["pr", "PR Inbox"],
  ["sync", "Sync Hub"],
  ["reports", "Reports"],
  ["settings", "Settings"]
] as const;

export function ArtistHubNav({ artistSlug, active }: { artistSlug: string; active: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
      <div className="flex flex-wrap gap-2">
        {sections.map(([path, label]) => {
          const href = `/dashboard/artist-hub/${artistSlug}/${path}`;
          const isActive = active === path;
          return (
            <Link
              key={path}
              href={href}
              className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.16em] transition ${
                isActive ? "border-gold bg-gold/15 text-gold" : "border-white/15 text-white/70 hover:border-gold/40 hover:text-white"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
