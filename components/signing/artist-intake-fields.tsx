type ArtistIntakeFieldValues = Partial<{
  legalName: string | null;
  stageName: string | null;
  email: string | null;
  professionalEmail: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  residenceCity: string | null;
  residenceCountry: string | null;
  residenceStateRegion: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  governmentId: string | null;
  primaryGenre: string | null;
  representingCountry: string | null;
  managerName: string | null;
  managerEmail: string | null;
  managerPhone: string | null;
  proAffiliation: string | null;
  ipiNumber: string | null;
  notes: string | null;
  socialInstagram: string | null;
  socialTiktok: string | null;
  socialYoutube: string | null;
  socialSpotify: string | null;
  socialX: string | null;
  socialFacebook: string | null;
}>;

type Props = {
  values?: ArtistIntakeFieldValues;
  emailFieldName?: string;
  emailLabel?: string;
  emailReadOnly?: boolean;
  compact?: boolean;
};

const inputClass = "w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold";
const labelClass = "space-y-1";
const hintClass = "text-xs uppercase tracking-[0.14em] text-white/55";

export function ArtistIntakeFields({ values, emailFieldName = "email", emailLabel = "Correo personal", emailReadOnly = false, compact = false }: Props) {
  const sectionGap = compact ? "space-y-4" : "space-y-5";

  return (
    <div className={sectionGap}>
      <section className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Informacion personal</p>
          <p className="mt-1 text-sm text-white/60">Estos datos alimentan contratos, onboarding y expediente interno.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className={labelClass}>
            <span className={hintClass}>Nombre completo legal</span>
            <input name="legal_name" required defaultValue={values?.legalName ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            <span className={hintClass}>Nombre artistico</span>
            <input name="stage_name" required defaultValue={values?.stageName ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            <span className={hintClass}>Fecha de nacimiento</span>
            <input name="date_of_birth" type="date" required defaultValue={values?.dateOfBirth ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            <span className={hintClass}>Nacionalidad</span>
            <input name="nationality" required defaultValue={values?.nationality ?? ""} className={inputClass} />
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Contacto</p>
          <p className="mt-1 text-sm text-white/60">El correo personal es el contacto principal del artista.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className={labelClass}>
            <span className={hintClass}>{emailLabel}</span>
            <input name={emailFieldName} type="email" required readOnly={emailReadOnly} defaultValue={values?.email ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            <span className={hintClass}>Correo profesional</span>
            <input name="professional_email" type="email" defaultValue={values?.professionalEmail ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            <span className={hintClass}>Telefono</span>
            <input name="phone" type="tel" required defaultValue={values?.phone ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            <span className={hintClass}>Pais que representa</span>
            <input name="representing_country" required defaultValue={values?.representingCountry ?? ""} className={inputClass} />
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Perfil artistico</p>
          <p className="mt-1 text-sm text-white/60">Necesitamos al menos una red social principal.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className={labelClass}>
            <span className={hintClass}>Genero musical</span>
            <input name="primary_genre" required defaultValue={values?.primaryGenre ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            <span className={hintClass}>Instagram</span>
            <input name="social_instagram" defaultValue={values?.socialInstagram ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            <span className={hintClass}>TikTok</span>
            <input name="social_tiktok" defaultValue={values?.socialTiktok ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            <span className={hintClass}>YouTube</span>
            <input name="social_youtube" defaultValue={values?.socialYoutube ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            <span className={hintClass}>Spotify</span>
            <input name="social_spotify" defaultValue={values?.socialSpotify ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            <span className={hintClass}>X / Twitter</span>
            <input name="social_x" defaultValue={values?.socialX ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            <span className={hintClass}>Facebook</span>
            <input name="social_facebook" defaultValue={values?.socialFacebook ?? ""} className={inputClass} />
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Informacion legal</p>
          <p className="mt-1 text-sm text-white/60">Los campos obligatorios de esta seccion son los que habilitan contratos y documentos.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className={`${labelClass} md:col-span-2`}>
            <span className={hintClass}>Direccion completa</span>
            <input name="address_line_1" required defaultValue={values?.addressLine1 ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            <span className={hintClass}>Direccion adicional</span>
            <input name="address_line_2" defaultValue={values?.addressLine2 ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            <span className={hintClass}>Ciudad de residencia</span>
            <input name="residence_city" required defaultValue={values?.residenceCity ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            <span className={hintClass}>Estado / region</span>
            <input name="residence_state_region" defaultValue={values?.residenceStateRegion ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            <span className={hintClass}>Codigo postal</span>
            <input name="postal_code" defaultValue={values?.postalCode ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            <span className={hintClass}>Pais de residencia</span>
            <input name="residence_country" required defaultValue={values?.residenceCountry ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            <span className={hintClass}>ID / pasaporte</span>
            <input name="government_id" defaultValue={values?.governmentId ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            <span className={hintClass}>PRO afiliacion</span>
            <select name="pro_affiliation" defaultValue={values?.proAffiliation ?? "none"} className={inputClass}>
              <option value="none">Ninguna</option>
              <option value="BMI">BMI</option>
              <option value="ASCAP">ASCAP</option>
              <option value="SESAC">SESAC</option>
            </select>
          </label>
          <label className={labelClass}>
            <span className={hintClass}>IPI number</span>
            <input name="ipi_number" defaultValue={values?.ipiNumber ?? ""} className={inputClass} />
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Manager y notas</p>
          <p className="mt-1 text-sm text-white/60">Si hay manager, agrega al menos un dato de contacto.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className={labelClass}>
            <span className={hintClass}>Nombre del manager</span>
            <input name="manager_name" defaultValue={values?.managerName ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            <span className={hintClass}>Correo del manager</span>
            <input name="manager_email" type="email" defaultValue={values?.managerEmail ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            <span className={hintClass}>Telefono del manager</span>
            <input name="manager_phone" type="tel" defaultValue={values?.managerPhone ?? ""} className={inputClass} />
          </label>
          <label className={`${labelClass} md:col-span-2`}>
            <span className={hintClass}>Notas internas</span>
            <textarea name="notes" rows={3} defaultValue={values?.notes ?? ""} className={inputClass} />
          </label>
        </div>
      </section>
    </div>
  );
}
