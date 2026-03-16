import Link from "next/link";
import { EmLogo } from "@/components/shared/em-logo";
import { ArtistIntakeFields } from "@/components/signing/artist-intake-fields";
import { signUpArtistAction } from "@/lib/actions/artist-auth";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function ArtistSignupPage({ searchParams }: Props) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";

  return (
    <div className="mx-auto flex min-h-[75vh] w-full max-w-4xl items-center px-6 py-16">
      <div className="w-full rounded-3xl border border-white/10 bg-white/[0.02] p-7 md:p-8">
        <div className="w-[170px]">
          <EmLogo alt="EM Records signup" />
        </div>
        <p className="text-xs uppercase tracking-[0.24em] text-gold">Artist Hub</p>
        <h1 className="mt-4 font-display text-4xl text-white">Registro de artista</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/60">
          Crea tu cuenta y completa de una vez tu perfil legal, administrativo y contractual. El acceso al portal se activa cuando un admin te aprueba.
        </p>

        {error ? <p className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{decodeURIComponent(error)}</p> : null}

        <form action={signUpArtistAction} className="mt-6 space-y-6">
          <section className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-gold">Acceso</p>
              <p className="mt-1 text-sm text-white/60">Usaremos tu correo personal como acceso principal al portal.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs uppercase tracking-[0.14em] text-white/55">Contraseña</span>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={8}
                  placeholder="Minimo 8 caracteres"
                  className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
                />
              </label>
            </div>
          </section>

          <ArtistIntakeFields emailFieldName="email" emailLabel="Correo personal / acceso" />

          <button type="submit" className="w-full rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black">
            Crear cuenta y perfil
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
