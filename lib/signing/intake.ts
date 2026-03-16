import { z } from "zod";
import { ONBOARDING_TASK_BLUEPRINT } from "@/lib/signing/constants";
import { createServiceClient } from "@/lib/supabase/service";

const SOCIAL_KEYS = ["instagram", "tiktok", "youtube", "spotify", "x", "facebook"] as const;

export type IntakeSocialKey = (typeof SOCIAL_KEYS)[number];

export type ArtistIntakeInput = {
  legalName: string;
  stageName: string;
  email: string;
  professionalEmail: string | null;
  phone: string;
  dateOfBirth: string;
  nationality: string;
  residenceCity: string;
  residenceCountry: string;
  residenceStateRegion: string | null;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string | null;
  governmentId: string | null;
  primaryGenre: string;
  representingCountry: string;
  managerName: string | null;
  managerEmail: string | null;
  managerPhone: string | null;
  proAffiliation: string;
  ipiNumber: string | null;
  notes: string | null;
  socialLinks: Record<string, string>;
};

type ArtistCriticalProfileShape = Partial<{
  legalName: string | null;
  stageName: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  residenceCity: string | null;
  residenceCountry: string | null;
  addressLine1: string | null;
  primaryGenre: string | null;
  representingCountry: string | null;
  socialLinks: Record<string, string> | null;
}>;

type UpsertArtistLeadParams = ArtistIntakeInput & {
  service: ReturnType<typeof createServiceClient>;
  actorUserId: string;
  assignedTo?: string | null;
  authUserId?: string | null;
};

function optionalTrimmedString() {
  return z
    .string()
    .trim()
    .nullish()
    .transform((value) => {
      const normalized = value?.trim() ?? "";
      return normalized ? normalized : null;
    });
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime());
}

function isValidEmail(value: string) {
  return z.string().email().safeParse(value).success;
}

const artistIntakeSchema = z
  .object({
    legalName: z.string().trim().min(2, "El nombre legal es obligatorio."),
    stageName: z.string().trim().min(2, "El nombre artistico es obligatorio."),
    email: z.string().trim().email("Ingresa un correo personal valido."),
    professionalEmail: optionalTrimmedString().refine((value) => !value || isValidEmail(value), {
      message: "El correo profesional no es valido."
    }),
    phone: z.string().trim().min(7, "El telefono es obligatorio."),
    dateOfBirth: z
      .string()
      .trim()
      .refine((value) => isIsoDate(value), "La fecha de nacimiento no es valida.")
      .refine((value) => new Date(`${value}T12:00:00Z`) <= new Date(), "La fecha de nacimiento no puede estar en el futuro."),
    nationality: z.string().trim().min(2, "La nacionalidad es obligatoria."),
    residenceCity: z.string().trim().min(2, "La ciudad de residencia es obligatoria."),
    residenceCountry: z.string().trim().min(2, "El pais de residencia es obligatorio."),
    residenceStateRegion: optionalTrimmedString(),
    addressLine1: z.string().trim().min(5, "La direccion legal es obligatoria."),
    addressLine2: optionalTrimmedString(),
    postalCode: optionalTrimmedString(),
    governmentId: optionalTrimmedString(),
    primaryGenre: z.string().trim().min(2, "El genero musical es obligatorio."),
    representingCountry: z.string().trim().min(2, "El pais que representa es obligatorio."),
    managerName: optionalTrimmedString(),
    managerEmail: optionalTrimmedString().refine((value) => !value || isValidEmail(value), {
      message: "El correo del manager no es valido."
    }),
    managerPhone: optionalTrimmedString(),
    proAffiliation: z.string().trim().default("none"),
    ipiNumber: optionalTrimmedString(),
    notes: optionalTrimmedString(),
    socialLinks: z.record(z.string(), z.string().trim())
  })
  .superRefine((value, ctx) => {
    if (Object.keys(value.socialLinks).length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["socialLinks"],
        message: "Agrega al menos una red social principal."
      });
    }

    if (value.managerName && !value.managerEmail && !value.managerPhone) {
      ctx.addIssue({
        code: "custom",
        path: ["managerEmail"],
        message: "Si hay manager, agrega un correo o telefono de contacto."
      });
    }
  });

function asString(formData: FormData, field: string): string {
  return String(formData.get(field) ?? "").trim();
}

function parseSocialLinksFromFormData(formData: FormData): Record<string, string> {
  return SOCIAL_KEYS.reduce<Record<string, string>>((acc, key) => {
    const value = asString(formData, `social_${key}`);
    if (value) acc[key] = value;
    return acc;
  }, {});
}

function withDefinedValues<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}

function mergeStringNotes(existing: string | null | undefined, incoming: string | null | undefined): string | null {
  const current = String(existing ?? "").trim();
  const next = String(incoming ?? "").trim();
  if (!current) return next || null;
  if (!next || current.includes(next)) return current;
  return `${current}\n${next}`;
}

function nullIfBlank(value: string | null | undefined): string | null {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
}

async function findAuthUserByEmail(service: ReturnType<typeof createServiceClient>, email: string) {
  let page = 1;
  const perPage = 200;

  while (page <= 20) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error) return null;
    const found = (data?.users ?? []).find((user) => String(user.email ?? "").toLowerCase() === email);
    if (found) return found;
    if ((data?.users ?? []).length < perPage) break;
    page += 1;
  }

  return null;
}

export function parseArtistIntakeFormData(
  formData: FormData,
  options?: {
    emailField?: string;
  }
) {
  const raw: ArtistIntakeInput = {
    legalName: asString(formData, "legal_name"),
    stageName: asString(formData, "stage_name"),
    email: asString(formData, options?.emailField ?? "email").toLowerCase(),
    professionalEmail: asString(formData, "professional_email") || null,
    phone: asString(formData, "phone"),
    dateOfBirth: asString(formData, "date_of_birth"),
    nationality: asString(formData, "nationality"),
    residenceCity: asString(formData, "residence_city"),
    residenceCountry: asString(formData, "residence_country"),
    residenceStateRegion: asString(formData, "residence_state_region") || null,
    addressLine1: asString(formData, "address_line_1"),
    addressLine2: asString(formData, "address_line_2") || null,
    postalCode: asString(formData, "postal_code") || null,
    governmentId: asString(formData, "government_id") || null,
    primaryGenre: asString(formData, "primary_genre"),
    representingCountry: asString(formData, "representing_country"),
    managerName: asString(formData, "manager_name") || null,
    managerEmail: asString(formData, "manager_email") || null,
    managerPhone: asString(formData, "manager_phone") || null,
    proAffiliation: asString(formData, "pro_affiliation") || "none",
    ipiNumber: asString(formData, "ipi_number") || null,
    notes: asString(formData, "notes") || null,
    socialLinks: parseSocialLinksFromFormData(formData)
  };

  return artistIntakeSchema.safeParse(raw);
}

export function socialLinksToFieldValues(socialLinks: Record<string, string> | null | undefined) {
  const values = socialLinks ?? {};
  return {
    socialInstagram: values.instagram ?? "",
    socialTiktok: values.tiktok ?? "",
    socialYoutube: values.youtube ?? "",
    socialSpotify: values.spotify ?? "",
    socialX: values.x ?? "",
    socialFacebook: values.facebook ?? ""
  };
}

export function buildArtistIntakeDbPayload(intake: ArtistIntakeInput) {
  return {
    legal_name: intake.legalName,
    stage_name: intake.stageName,
    email: intake.email,
    professional_email: intake.professionalEmail,
    phone: intake.phone,
    country: intake.residenceCountry,
    state: intake.residenceStateRegion,
    date_of_birth: intake.dateOfBirth,
    government_name: intake.legalName,
    government_id: intake.governmentId,
    nationality: intake.nationality,
    residence_city: intake.residenceCity,
    residence_country: intake.residenceCountry,
    residence_state_region: intake.residenceStateRegion,
    address_line_1: intake.addressLine1,
    address_line_2: intake.addressLine2,
    postal_code: intake.postalCode,
    primary_genre: intake.primaryGenre,
    representing_country: intake.representingCountry,
    manager_name: intake.managerName,
    manager_email: intake.managerEmail,
    manager_phone: intake.managerPhone,
    pro_affiliation: intake.proAffiliation,
    ipi_number: intake.ipiNumber,
    notes: intake.notes,
    social_links: intake.socialLinks
  };
}

export function getMissingCriticalArtistFields(input: ArtistCriticalProfileShape): string[] {
  const missing: string[] = [];

  if (!String(input.legalName ?? "").trim()) missing.push("nombre legal");
  if (!String(input.stageName ?? "").trim()) missing.push("nombre artistico");
  if (!String(input.email ?? "").trim()) missing.push("correo personal");
  if (!String(input.phone ?? "").trim()) missing.push("telefono");
  if (!String(input.dateOfBirth ?? "").trim()) missing.push("fecha de nacimiento");
  if (!String(input.nationality ?? "").trim()) missing.push("nacionalidad");
  if (!String(input.residenceCity ?? "").trim()) missing.push("ciudad de residencia");
  if (!String(input.residenceCountry ?? "").trim()) missing.push("pais de residencia");
  if (!String(input.addressLine1 ?? "").trim()) missing.push("direccion legal");
  if (!String(input.primaryGenre ?? "").trim()) missing.push("genero musical");
  if (!String(input.representingCountry ?? "").trim()) missing.push("pais que representa");
  if (!input.socialLinks || Object.keys(input.socialLinks).length === 0) missing.push("red social principal");

  return missing;
}

export function formatArtistPostalAddress(input: {
  addressLine1?: string | null;
  addressLine2?: string | null;
  residenceCity?: string | null;
  residenceStateRegion?: string | null;
  postalCode?: string | null;
  residenceCountry?: string | null;
}) {
  const line1 = String(input.addressLine1 ?? "").trim();
  const line2 = String(input.addressLine2 ?? "").trim();
  const city = String(input.residenceCity ?? "").trim();
  const region = String(input.residenceStateRegion ?? "").trim();
  const postalCode = String(input.postalCode ?? "").trim();
  const country = String(input.residenceCountry ?? "").trim();

  const locality = [city, region, postalCode].filter(Boolean).join(", ");
  return [line1, line2, locality, country].filter(Boolean).join("\n");
}

export async function upsertArtistIntakeLead(params: UpsertArtistLeadParams): Promise<{ leadId: string; created: boolean }> {
  const normalizedEmail = params.email.trim().toLowerCase();
  const normalizedProfessionalEmail = params.professionalEmail?.trim().toLowerCase() || null;
  const normalizedSocials = params.socialLinks ?? {};

  const existingProfileRes = await params.service.from("artist_profiles").select("*").eq("email", normalizedEmail).maybeSingle();
  let artistProfileId = existingProfileRes.data?.id ? String(existingProfileRes.data.id) : null;

  const profileRow = await params.service.from("profiles").select("id").eq("email", normalizedEmail).maybeSingle();
  const authUser = params.authUserId ? { id: params.authUserId } : await findAuthUserByEmail(params.service, normalizedEmail);

  const sharedProfilePayload = {
    legal_name: params.legalName,
    stage_name: nullIfBlank(params.stageName),
    email: normalizedEmail,
    professional_email: normalizedProfessionalEmail,
    phone: nullIfBlank(params.phone),
    country: nullIfBlank(params.residenceCountry),
    state: nullIfBlank(params.residenceStateRegion),
    date_of_birth: nullIfBlank(params.dateOfBirth),
    government_name: params.legalName,
    government_id: nullIfBlank(params.governmentId),
    nationality: nullIfBlank(params.nationality),
    residence_city: nullIfBlank(params.residenceCity),
    residence_country: nullIfBlank(params.residenceCountry),
    residence_state_region: nullIfBlank(params.residenceStateRegion),
    address_line_1: nullIfBlank(params.addressLine1),
    address_line_2: nullIfBlank(params.addressLine2),
    postal_code: nullIfBlank(params.postalCode),
    primary_genre: nullIfBlank(params.primaryGenre),
    representing_country: nullIfBlank(params.representingCountry),
    manager_name: nullIfBlank(params.managerName),
    manager_email: nullIfBlank(params.managerEmail),
    manager_phone: nullIfBlank(params.managerPhone),
    pro_affiliation: params.proAffiliation || "none",
    ipi_number: nullIfBlank(params.ipiNumber),
    social_links: normalizedSocials,
    notes: nullIfBlank(params.notes)
  };

  if (!artistProfileId) {
    const { data: profileInsert, error: profileInsertError } = await params.service
      .from("artist_profiles")
      .insert({
        user_id: authUser?.id ?? null,
        profile_id: profileRow.data?.id ?? null,
        ...sharedProfilePayload
      })
      .select("id")
      .single();

    if (profileInsertError || !profileInsert) {
      throw new Error(profileInsertError?.message ?? "Failed to create artist profile.");
    }

    artistProfileId = String(profileInsert.id);
  } else {
    const profilePayload = withDefinedValues({
      user_id: authUser?.id ?? existingProfileRes.data?.user_id ?? null,
      profile_id: profileRow.data?.id ?? existingProfileRes.data?.profile_id ?? null,
      ...sharedProfilePayload,
      social_links: { ...(existingProfileRes.data?.social_links ?? {}), ...normalizedSocials },
      notes: mergeStringNotes(existingProfileRes.data?.notes, params.notes)
    });

    const { error: profileUpdateError } = await params.service.from("artist_profiles").update(profilePayload).eq("id", artistProfileId);
    if (profileUpdateError) {
      throw new Error(profileUpdateError.message);
    }
  }

  const { data: leadRows, error: leadLookupError } = await params.service
    .from("artist_leads")
    .select("*")
    .or(`artist_profile_id.eq.${artistProfileId},email.eq.${normalizedEmail}`)
    .order("created_at", { ascending: false })
    .limit(10);

  if (leadLookupError) {
    throw new Error(leadLookupError.message);
  }

  const existingOpenLead = (leadRows ?? []).find((row: any) => !["archived", "declined", "expired"].includes(String(row.status)));

  const sharedLeadPayload = {
    artist_profile_id: artistProfileId,
    legal_name: params.legalName,
    stage_name: nullIfBlank(params.stageName),
    email: normalizedEmail,
    professional_email: normalizedProfessionalEmail,
    phone: nullIfBlank(params.phone),
    country: nullIfBlank(params.residenceCountry),
    state: nullIfBlank(params.residenceStateRegion),
    date_of_birth: nullIfBlank(params.dateOfBirth),
    government_name: params.legalName,
    government_id: nullIfBlank(params.governmentId),
    nationality: nullIfBlank(params.nationality),
    residence_city: nullIfBlank(params.residenceCity),
    residence_country: nullIfBlank(params.residenceCountry),
    residence_state_region: nullIfBlank(params.residenceStateRegion),
    address_line_1: nullIfBlank(params.addressLine1),
    address_line_2: nullIfBlank(params.addressLine2),
    postal_code: nullIfBlank(params.postalCode),
    primary_genre: nullIfBlank(params.primaryGenre),
    representing_country: nullIfBlank(params.representingCountry),
    manager_name: nullIfBlank(params.managerName),
    manager_email: nullIfBlank(params.managerEmail),
    manager_phone: nullIfBlank(params.managerPhone),
    pro_affiliation: params.proAffiliation || "none",
    ipi_number: nullIfBlank(params.ipiNumber),
    social_links: normalizedSocials,
    notes: nullIfBlank(params.notes)
  };

  if (existingOpenLead) {
    const updatePayload = withDefinedValues({
      ...sharedLeadPayload,
      social_links: { ...(existingOpenLead.social_links ?? {}), ...normalizedSocials },
      notes: mergeStringNotes(existingOpenLead.notes, params.notes),
      assigned_to: params.assignedTo ?? existingOpenLead.assigned_to ?? params.actorUserId
    });

    const { error: leadUpdateError } = await params.service.from("artist_leads").update(updatePayload).eq("id", existingOpenLead.id);
    if (leadUpdateError) {
      throw new Error(leadUpdateError.message);
    }

    await params.service.from("onboarding_tasks").upsert(
      ONBOARDING_TASK_BLUEPRINT.map((task) => ({
        artist_lead_id: existingOpenLead.id,
        task_key: task.key,
        title: task.title
      })),
      { onConflict: "artist_lead_id,task_key" }
    );

    return { leadId: String(existingOpenLead.id), created: false };
  }

  const { data: lead, error: leadError } = await params.service
    .from("artist_leads")
    .insert({
      ...sharedLeadPayload,
      status: "lead_received",
      assigned_to: params.assignedTo ?? params.actorUserId,
      created_by: params.actorUserId
    })
    .select("id")
    .single();

  if (leadError || !lead) {
    throw new Error(leadError?.message ?? "Failed to create artist lead.");
  }

  await params.service.from("onboarding_tasks").upsert(
    ONBOARDING_TASK_BLUEPRINT.map((task) => ({
      artist_lead_id: lead.id,
      task_key: task.key,
      title: task.title
    })),
    { onConflict: "artist_lead_id,task_key" }
  );

  return { leadId: String(lead.id), created: true };
}
