import { redirect } from "next/navigation";

type Params = { params: Promise<{ artistSlug: string }> };

export default async function ArtistHubArtistIndex({ params }: Params) {
  const { artistSlug } = await params;
  redirect(`/dashboard/artist-hub/${artistSlug}/catalog`);
}
