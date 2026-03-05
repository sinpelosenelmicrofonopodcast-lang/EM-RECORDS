import Link from "next/link";
import { EmLogo } from "@/components/shared/em-logo";
import { signInArtistAction } from "@/lib/actions/artist-auth";

type Props = {
  searchParams: Promise<{
    error?: string;
    status?: string;
    message?: string;
  }>;
};

export default async function ArtistLoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  const status = params.status === "success" ? "success" : null;
  const message = typeof params.message === "string" ? params.message : "";

  return (
    <div className="mx-auto flex min-h-[75vh] w-full max-w-md items-center px-6 py-16">
      <div className="w-full rounded-3xl border border-white/10 bg-white/[0.02] p-7">
        <div className="w-[170px]">
          <EmLogo alt="EM Records artists" />
        </div>
        <p className="text-xs uppercase tracking-[0.24em] text-gold">Artist Hub</p>
        <h1 className="mt-4 font-display text-4xl text-white">Artist Login</h1>
        <p className="mt-2 text-sm text-white/60">Accede a tu portal de artista de EM Records.</p>

        {status && message ? <p className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{decodeURIComponent(message)}</p> : null}
        {error ? <p className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{decodeURIComponent(error)}</p> : null}

        <form action={signInArtistAction} className="mt-6 space-y-3">
          <input
            type="email"
            name="email"
            required
            placeholder="artist@emrecords.com"
            className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
          />
          <input
            type="password"
            name="password"
            required
            placeholder="Contraseña"
            className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
          />
          <button type="submit" className="w-full rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black">
            Entrar al Artist Hub
          </button>
        </form>

        <p className="mt-6 text-sm text-white/70">
          ¿No tienes cuenta?{" "}
          <Link href="/artist/signup" className="text-gold hover:underline">
            Crear cuenta de artista
          </Link>
        </p>

        <Link href="/" className="mt-4 inline-block text-xs uppercase tracking-[0.16em] text-white/45 hover:text-gold">
          Volver al sitio
        </Link>
      </div>
    </div>
  );
}
