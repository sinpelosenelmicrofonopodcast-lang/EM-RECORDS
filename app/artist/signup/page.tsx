import Link from "next/link";
import { EmLogo } from "@/components/shared/em-logo";
import { signUpArtistAction } from "@/lib/actions/artist-auth";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function ArtistSignupPage({ searchParams }: Props) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";

  return (
    <div className="mx-auto flex min-h-[75vh] w-full max-w-md items-center px-6 py-16">
      <div className="w-full rounded-3xl border border-white/10 bg-white/[0.02] p-7">
        <div className="w-[170px]">
          <EmLogo alt="EM Records signup" />
        </div>
        <p className="text-xs uppercase tracking-[0.24em] text-gold">Artist Hub</p>
        <h1 className="mt-4 font-display text-4xl text-white">Registro de artista</h1>
        <p className="mt-2 text-sm text-white/60">Crea tu cuenta. El acceso al portal se activa cuando un admin te aprueba.</p>

        {error ? <p className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{decodeURIComponent(error)}</p> : null}

        <form action={signUpArtistAction} className="mt-6 space-y-3">
          <input
            type="text"
            name="fullName"
            required
            placeholder="Nombre completo"
            className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
          />
          <input
            type="email"
            name="email"
            required
            placeholder="artist@email.com"
            className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
          />
          <input
            type="password"
            name="password"
            required
            minLength={8}
            placeholder="Contraseña (mínimo 8 caracteres)"
            className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
          />
          <button type="submit" className="w-full rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black">
            Crear cuenta
          </button>
        </form>

        <p className="mt-6 text-sm text-white/70">
          ¿Ya tienes cuenta?{" "}
          <Link href="/artist/login" className="text-gold hover:underline">
            Iniciar sesión
          </Link>
        </p>

        <Link href="/" className="mt-4 inline-block text-xs uppercase tracking-[0.16em] text-white/45 hover:text-gold">
          Volver al sitio
        </Link>
      </div>
    </div>
  );
}
