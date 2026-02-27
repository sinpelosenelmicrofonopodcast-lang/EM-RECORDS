import Link from "next/link";
import { EmLogo } from "@/components/shared/em-logo";
import { getSiteLanguage } from "@/lib/i18n/server";
import { getSocialLinks } from "@/lib/queries";

export async function SiteFooter() {
  const lang = await getSiteLanguage();
  const socialLinks = await getSocialLinks();

  return (
    <footer className="border-t border-white/10 bg-black">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-14 md:grid-cols-3 md:px-10">
        <div>
          <div className="flex w-[220px] items-center justify-center">
            <EmLogo alt="EM Records LLC" />
          </div>
          <p className="mt-3 max-w-sm text-sm text-white/60">
            {lang === "es"
              ? "Disquera urbana latina moderna con visión internacional. Impulsada por cultura, disciplina y ejecución."
              : "Dark modern latin urban label with international vision. Powered by culture, discipline and execution."}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/60">{lang === "es" ? "Social" : "Social"}</p>
          <div className="mt-3 flex flex-col gap-2 text-sm text-white/80">
            {socialLinks.length > 0 ? (
              socialLinks.map((link) => (
                <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="hover:text-gold">
                  {link.label}
                </a>
              ))
            ) : (
              <p className="text-white/45">{lang === "es" ? "Sin redes configuradas." : "No social links configured."}</p>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/60">{lang === "es" ? "Legal" : "Legal"}</p>
          <div className="mt-3 flex flex-col gap-2 text-sm text-white/80">
            <Link href="/legal" className="hover:text-gold">
              {lang === "es" ? "Términos, Privacidad, Copyright, DMCA" : "Terms, Privacy, Copyright, DMCA"}
            </Link>
            <Link href="/licensing" className="hover:text-gold">
              Licensing
            </Link>
            <Link href="/publishing" className="hover:text-gold">
              Publishing by DGM Music
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 py-5 text-center text-xs uppercase tracking-[0.16em] text-white/50">
        {lang === "es"
          ? `Copyright ${new Date().getFullYear()} EM Records LLC. Todos los derechos reservados.`
          : `Copyright ${new Date().getFullYear()} EM Records LLC. All rights reserved.`}
      </div>
    </footer>
  );
}
