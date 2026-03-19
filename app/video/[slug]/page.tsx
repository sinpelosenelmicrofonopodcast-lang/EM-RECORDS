import { notFound, redirect } from "next/navigation";
import { getMusicCatalogReleaseBySlug } from "@/lib/queries";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function VideoAliasPage({ params }: Props) {
  const { slug } = await params;
  const release = await getMusicCatalogReleaseBySlug(slug);

  if (!release || !release.youtubeEmbed) {
    notFound();
  }

  redirect(`/music/${release.slug ?? slug}`);
}
