import type { Metadata } from "next";
import { acceptTermsAction } from "@/lib/actions/site";
import { getSiteLanguage } from "@/lib/i18n/server";
import { sanitizeNextPath } from "@/lib/terms";

export const metadata: Metadata = {
  title: "Legal",
  description: "Terms of Service, Privacy Policy, Copyright and DMCA for EM Records LLC."
};

function LegalSection({ title, content }: { title: string; content: string }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <h2 className="font-display text-2xl text-white">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-white/70">{content}</p>
    </section>
  );
}

type Props = {
  searchParams: Promise<{ consent?: string; next?: string }>;
};

export default async function LegalPage({ searchParams }: Props) {
  const lang = await getSiteLanguage();
  const qs = await searchParams;
  const consentRequired = qs.consent === "required";
  const nextPath = sanitizeNextPath(String(qs.next ?? "/"));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 px-6 py-20 md:px-10">
      <h1 className="font-display text-5xl text-white">Legal</h1>
      <p className="text-sm text-white/65">
        {lang === "es"
          ? "Políticas legales oficiales de EM Records LLC y PUBLISHING BY DGM MUSIC."
          : "Official legal policies for EM Records LLC and PUBLISHING BY DGM MUSIC."}
      </p>

      {consentRequired ? (
        <section className="rounded-2xl border border-gold/35 bg-gold/10 p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-gold">{lang === "es" ? "Consentimiento requerido" : "Consent Required"}</p>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            {lang === "es"
              ? "Para continuar navegando EM Records, debes aceptar los términos legales."
              : "To continue browsing EM Records, you must accept the legal terms."}
          </p>
          <form action={acceptTermsAction} className="mt-5">
            <input type="hidden" name="next" value={nextPath} />
            <button
              type="submit"
              className="rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:-translate-y-0.5"
            >
              {lang === "es" ? "Aceptar términos y continuar" : "Accept Terms & Continue"}
            </button>
          </form>
        </section>
      ) : null}

      <LegalSection
        title={lang === "es" ? "Términos de Servicio" : "Terms of Service"}
        content={
          lang === "es"
            ? "Al usar este sitio web, aceptas uso legal, conducta no infractora y aceptación de términos relacionados con ticket sales, productos digitales y acceso a eventos."
            : "By using this website, you agree to lawful use, non-infringing conduct and acceptance of terms related to ticket sales, digital products, and event access."
        }
      />
      <LegalSection
        title={lang === "es" ? "Política de Privacidad" : "Privacy Policy"}
        content={
          lang === "es"
            ? "Recopilamos datos limitados de contacto y uso para operar servicios, procesar demos, transacciones de eventos y enviar actualizaciones."
            : "We collect limited contact and usage data to operate services, process demo submissions, event transactions and provide communication updates."
        }
      />
      <LegalSection
        title="Copyright"
        content={
          lang === "es"
            ? "Todos los masters, composiciones, visuales y materiales de marca están protegidos bajo leyes internacionales de copyright, salvo indicación contraria."
            : "All masters, compositions, visuals and brand materials are protected under international copyright law unless otherwise stated."
        }
      />
      <LegalSection
        title="DMCA"
        content={
          lang === "es"
            ? "Para avisos de infracción, envía una solicitud DMCA completa a legal@emrecords.com con identificación requerida y prueba de titularidad."
            : "For infringement notices, send a complete DMCA request to legal@emrecords.com with all required identification details and proof of ownership."
        }
      />
    </div>
  );
}
