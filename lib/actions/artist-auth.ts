"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { parseArtistIntakeFormData, upsertArtistIntakeLead } from "@/lib/signing/intake";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function toMessage(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) return value;
  return fallback;
}

export async function signUpArtistAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect("/artist/signup?error=Supabase%20no%20esta%20configurado");
  }

  const parsed = parseArtistIntakeFormData(formData, { emailField: "email" });
  if (!parsed.success) {
    redirect(`/artist/signup?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Completa los campos obligatorios.")}`);
  }

  const intake = parsed.data;
  const email = intake.email;
  const password = String(formData.get("password") ?? "");

  if (!password || password.length < 8) {
    redirect("/artist/signup?error=La%20contrasena%20debe%20tener%20al%20menos%208%20caracteres");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: intake.legalName,
        stage_name: intake.stageName,
        role: "artist"
      }
    }
  });

  if (error) {
    redirect(`/artist/signup?error=${encodeURIComponent(toMessage(error.message, "No se pudo crear la cuenta."))}`);
  }

  const userId = data.user?.id;
  if (userId) {
    try {
      const service = createServiceClient();
      await service.from("profiles").upsert(
        {
          id: userId,
          email,
          full_name: intake.legalName,
          is_admin: false
        },
        { onConflict: "id" }
      );

      await upsertArtistIntakeLead({
        service,
        actorUserId: userId,
        authUserId: userId,
        ...intake,
        assignedTo: userId
      });
    } catch (profileError: any) {
      redirect(
        `/artist/signup?error=${encodeURIComponent(
          toMessage(profileError?.message, "La cuenta fue creada, pero no se pudo guardar el perfil legal del artista.")
        )}`
      );
    }
  }

  redirect("/artist/login?status=success&message=Cuenta%20creada.%20Un%20admin%20debe%20aprobar%20tu%20acceso.");
}

export async function signInArtistAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect("/artist/login?error=Supabase%20no%20esta%20configurado");
  }

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/artist/login?error=Correo%20y%20contrasena%20requeridos");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/artist/login?error=${encodeURIComponent(toMessage(error.message, "Credenciales inválidas."))}`);
  }

  redirect("/dashboard/artist-hub");
}
