import Link from "next/link";
import { redirect } from "next/navigation";
import { HubShell } from "@/components/artist-hub/hub-shell";
import { getHubUserContext } from "@/lib/artist-hub/auth";

export const dynamic = "force-dynamic";

export default async function ArtistHubPendingApprovalPage() {
  const ctx = await getHubUserContext();

  if (!ctx) {
    redirect("/artist/login");
  }

  if (ctx.isApproved || ctx.isAdmin) {
    redirect("/dashboard/artist-hub");
  }

  return (
    <HubShell>
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Cuenta en revisión</p>
        <h1 className="mt-2 font-display text-4xl text-white">Esperando aprobación de admin</h1>
        <p className="mt-4 max-w-2xl text-sm text-white/70">
          Tu cuenta ya fue creada como <span className="text-white">{ctx.user.email ?? ctx.user.id}</span>. Para entrar al Artist Hub, un administrador debe asignarte rol y artista.
        </p>
        <p className="mt-3 text-sm text-white/55">Cuando te aprueben, podrás entrar automáticamente al dashboard.</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard/artist-hub" className="rounded-full border border-gold px-5 py-2 text-xs uppercase tracking-[0.18em] text-gold">
            Reintentar acceso
          </Link>
          <Link href="/" className="rounded-full border border-white/20 px-5 py-2 text-xs uppercase tracking-[0.18em] text-white/70 hover:text-white">
            Volver al sitio
          </Link>
        </div>
      </section>
    </HubShell>
  );
}
