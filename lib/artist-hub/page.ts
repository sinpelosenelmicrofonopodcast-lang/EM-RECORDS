import { notFound, redirect } from "next/navigation";
import { getHubUserContext } from "@/lib/artist-hub/auth";
import { getArtistBySlugForContext, listArtistsForContext, roleForArtist } from "@/lib/artist-hub/service";

export async function requireHubPageContext() {
  const ctx = await getHubUserContext();
  if (!ctx) {
    redirect("/artist/login");
  }

  if (!ctx.isApproved && !ctx.isAdmin) {
    redirect("/dashboard/artist-hub/pending");
  }

  return ctx;
}

export async function getMyHubArtists() {
  const ctx = await requireHubPageContext();
  const artists = await listArtistsForContext(ctx);
  return { ctx, artists };
}

export async function requireArtistPageAccess(artistSlug: string) {
  const ctx = await requireHubPageContext();
  const artist = await getArtistBySlugForContext(ctx, artistSlug);

  if (!artist) {
    notFound();
  }

  const role = roleForArtist(ctx, artist.id);

  return { ctx, artist, role };
}
