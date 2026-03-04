import type { ReactNode } from "react";
import { HubShell } from "@/components/artist-hub/hub-shell";
import { requireArtistPageAccess } from "@/lib/artist-hub/page";

export default async function ArtistHubLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ artistSlug: string }>;
}) {
  const { artistSlug } = await params;
  const { artist, role } = await requireArtistPageAccess(artistSlug);

  return (
    <HubShell>
      <header className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Artist Portal</p>
        <h1 className="mt-2 font-display text-4xl text-white">{artist.stageName || artist.name}</h1>
        <p className="mt-2 text-sm text-white/70">Role: {role ?? "member"}</p>
      </header>
      {children}
    </HubShell>
  );
}
