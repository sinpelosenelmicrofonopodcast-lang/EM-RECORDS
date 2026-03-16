import { ActiveNavLink } from "@/components/shared/active-nav-link";

const sections = [
  ["catalog", "Catalog"],
  ["launch", "Launch Center"],
  ["media-kit", "Media Kit"],
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
    <div className="app-panel-soft rounded-[24px] p-3" data-active-section={active}>
      <div className="flex flex-wrap gap-2">
        {sections.map(([path, label]) => {
          const href = `/dashboard/artist-hub/${artistSlug}/${path}`;
          return (
            <ActiveNavLink
              key={path}
              href={href}
              className="rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.16em] transition"
              activeClassName="border-gold bg-gold/15 text-gold"
              inactiveClassName="border-white/15 text-white/70 hover:border-gold/40 hover:text-white"
            >
              {label}
            </ActiveNavLink>
          );
        })}
      </div>
    </div>
  );
}
