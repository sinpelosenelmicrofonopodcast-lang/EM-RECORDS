import type { Metadata } from "next";
import { BeatVaultLogin } from "@/components/beat-vault/beat-vault-login";
import { BeatVaultPlayer, type PrivateBeat } from "@/components/beat-vault/beat-vault-player";
import { getBeatVaultAccess, getPrivateBeatPath } from "@/lib/beat-vault";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Private Beat Vault | EM Records",
  description: "Área privada de escucha de beats completos. Acceso exclusivo con clave.",
  robots: { index: false, follow: false, noarchive: true }
};

export default async function BeatVaultPage() {
  const access = await getBeatVaultAccess();
  if (!access) {
    return (
      <section className="relative flex min-h-[70vh] items-center justify-center px-5 py-16">
        <BeatVaultLogin />
      </section>
    );
  }

  const service = createServiceClient();
  const { data, error } = await service.from("beats")
    .select("id,title,display_title,genre,bpm,key,cover_url,audio_url,status")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    return <p className="mx-auto max-w-5xl px-6 py-24 text-white/60">No se pudo cargar el catálogo privado. Inténtalo de nuevo.</p>;
  }
  const beats: PrivateBeat[] = (data ?? []).map((beat) => ({
    id: String(beat.id),
    title: String(beat.display_title || beat.title),
    genre: String(beat.genre || ""),
    bpm: typeof beat.bpm === "number" ? beat.bpm : null,
    musicalKey: beat.key ? String(beat.key) : null,
    coverUrl: beat.cover_url && /^https:\/\//.test(beat.cover_url) ? String(beat.cover_url) : null,
    available: Boolean(getPrivateBeatPath(beat.audio_url))
  }));

  return <BeatVaultPlayer beats={beats} label={access.label} />;
}
