import { ArtistSigningShell } from "@/components/signing/artist-signing-shell";
import { ArtistIntakeFields } from "@/components/signing/artist-intake-fields";
import { updateArtistProfileFromPortalAction } from "@/lib/actions/signing";
import { getMissingCriticalArtistFields, socialLinksToFieldValues } from "@/lib/signing/intake";
import { requireArtistPortalBundle } from "@/lib/signing/page";

type Props = {
  searchParams: Promise<{
    status?: string;
    message?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ArtistProfilePage({ searchParams }: Props) {
  const params = await searchParams;
  const flashStatus = params.status === "success" || params.status === "error" ? params.status : null;
  const flashMessage = typeof params.message === "string" ? params.message : "";
  const { leadId, bundle } = await requireArtistPortalBundle();
  const lead = bundle.lead!;
  const missingCritical = getMissingCriticalArtistFields({
    legalName: lead.legalName,
    stageName: lead.stageName,
    email: lead.email,
    phone: lead.phone,
    dateOfBirth: lead.dateOfBirth,
    nationality: lead.nationality,
    residenceCity: lead.residenceCity,
    residenceCountry: lead.residenceCountry,
    addressLine1: lead.addressLine1,
    primaryGenre: lead.primaryGenre,
    representingCountry: lead.representingCountry,
    socialLinks: lead.socialLinks
  });

  return (
    <ArtistSigningShell title="Profile" subtitle="Maintain accurate legal and contact data for your agreement and onboarding.">
      {flashStatus && flashMessage ? (
        <div
          className={[
            "rounded-xl border px-4 py-3 text-sm",
            flashStatus === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-rose-500/40 bg-rose-500/10 text-rose-200"
          ].join(" ")}
        >
          {decodeURIComponent(flashMessage)}
        </div>
      ) : null}

      {missingCritical.length > 0 ? (
        <div className="rounded-[22px] border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Faltan {missingCritical.length} campos criticos para contratos: {missingCritical.slice(0, 4).join(", ")}
          {missingCritical.length > 4 ? "..." : ""}
        </div>
      ) : (
        <div className="rounded-[22px] border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">Perfil contractual completo.</div>
      )}

      <section className="app-panel rounded-[28px] p-5 md:p-6">
        <h2 className="text-lg font-semibold text-white">Artist Profile</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-white/60">
          Completa o corrige estos datos en un solo flujo para evitar retrabajo legal despues. La informacion se usa para contratos, contacto operativo y expediente del artista.
        </p>
        <form action={updateArtistProfileFromPortalAction} className="mt-4 space-y-6">
          <input type="hidden" name="redirectTo" value="/dashboard/signing/profile" />
          <input type="hidden" name="lead_id" value={leadId} />
          <ArtistIntakeFields
            values={{
              legalName: lead.legalName,
              stageName: lead.stageName,
              email: lead.email,
              professionalEmail: lead.professionalEmail,
              phone: lead.phone,
              dateOfBirth: lead.dateOfBirth,
              nationality: lead.nationality,
              residenceCity: lead.residenceCity,
              residenceCountry: lead.residenceCountry,
              residenceStateRegion: lead.residenceStateRegion,
              addressLine1: lead.addressLine1,
              addressLine2: lead.addressLine2,
              postalCode: lead.postalCode,
              governmentId: lead.governmentId,
              primaryGenre: lead.primaryGenre,
              representingCountry: lead.representingCountry,
              managerName: lead.managerName,
              managerEmail: lead.managerEmail,
              managerPhone: lead.managerPhone,
              proAffiliation: lead.proAffiliation,
              ipiNumber: lead.ipiNumber,
              notes: lead.notes,
              ...socialLinksToFieldValues(lead.socialLinks)
            }}
            emailFieldName="email"
            emailLabel="Correo personal"
          />
          <button type="submit" className="rounded-full border border-gold bg-gold px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-black">
            Save Profile
          </button>
        </form>
      </section>
    </ArtistSigningShell>
  );
}
