import Link from "next/link";
import { EmLogo } from "@/components/shared/em-logo";
import { getSiteLanguage } from "@/lib/i18n/server";
import { getSocialLinks } from "@/lib/queries";

export async function SiteFooter() {
  const lang = await getSiteLanguage();
  const socialLinks = await getSocialLinks();
  const primaryLinks = [
    { href: "/artists", label: lang === "es" ? "Artistas" : "Artists" },
    { href: "/music", label: lang === "es" ? "Música" : "Music" },
    { href: "/events", label: lang === "es" ? "Eventos" : "Events" },
    { href: "/press", label: lang === "es" ? "Prensa" : "Press" },
    { href: "/join", label: lang === "es" ? "Únete a EM" : "Join EM" }
  ];
  const workspaces = [
    { href: "/artist/login", label: lang === "es" ? "Portal del artista" : "Artist portal" },
    { href: "/admin", label: "Admin" },
    { href: "/publishing", label: "Publishing" },
    { href: "/licensing", label: "Licensing" }
  ];
  const legalLinks = [
    { href: "/legal", label: lang === "es" ? "Términos, privacidad y copyright" : "Terms, privacy and copyright" },
    { href: "/publishing", label: "Publishing by DGM Music" },
    { href: "/licensing", label: "Licensing" }
  ];

  return (
    <footer className="border-t border-white/10 bg-black/95">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-14 md:grid-cols-[1.35fr_0.9fr_0.9fr_1fr] md:px-10">
        <div className="space-y-4">
          <div className="flex w-[220px] items-center justify-center">
            <EmLogo alt="EM Records LLC" />
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-white/60">
            {lang === "es"
              ? "Disquera urbana latina moderna con visión internacional. Impulsada por cultura, disciplina y ejecución."
              : "Dark modern latin urban label with international vision. Powered by culture, discipline and execution."}
          </p>
          <p className="text-xs uppercase tracking-[0.18em] text-white/38">EM Records LLC</p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/55">{lang === "es" ? "Explorar" : "Explore"}</p>
          <div className="mt-3 flex flex-col gap-2 text-sm text-white/80">
            {primaryLinks.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-gold">
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/55">{lang === "es" ? "Portales" : "Workspaces"}</p>
          <div className="mt-3 flex flex-col gap-2 text-sm text-white/80">
            {workspaces.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-gold">
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/55">{lang === "es" ? "Legal y social" : "Legal and social"}</p>
          <div className="mt-3 flex flex-col gap-2 text-sm text-white/80">
            {legalLinks.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-gold">
                {item.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-white/10 pt-3">
              {socialLinks.length > 0 ? (
                socialLinks.map((link) => (
                  <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="block transition hover:text-gold">
                    {link.label}
                  </a>
                ))
              ) : (
                <p className="text-white/45">{lang === "es" ? "Sin redes configuradas." : "No social links configured."}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-5 py-5 text-xs uppercase tracking-[0.16em] text-white/45 md:flex-row md:items-center md:justify-between md:px-10">
          <p>
            {lang === "es"
              ? `Copyright ${new Date().getFullYear()} EM Records LLC. Todos los derechos reservados.`
              : `Copyright ${new Date().getFullYear()} EM Records LLC. All rights reserved.`}
          </p>
          <p>{lang === "es" ? "Operación, catálogo y portal en una sola plataforma." : "Operations, catalog and portal in one platform."}</p>
        </div>
      </div>
    </footer>
  );
}
