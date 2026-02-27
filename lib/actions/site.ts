"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createEpkAccessToken, getEpkCookieName, hashEpkPassword, sanitizeEpkSlug } from "@/lib/epk";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function subscribeNewsletterAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    return;
  }

  if (!isSupabaseConfigured()) {
    return;
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase.from("newsletter_subscribers").upsert(
      {
        email,
        source: "homepage"
      },
      { onConflict: "email", ignoreDuplicates: false }
    );

    if (error) {
      return;
    }

    revalidatePath("/");
  } catch {
    return;
  }
}

export async function submitSponsorApplicationAction(formData: FormData) {
  const company = String(formData.get("company") ?? "").trim();
  const contactName = String(formData.get("contactName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const plan = String(formData.get("plan") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!company || !contactName || !email || !plan) {
    return;
  }

  if (!isSupabaseConfigured()) {
    return;
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase.from("sponsor_applications").insert({
      company,
      contact_name: contactName,
      email,
      plan,
      notes,
      status: "pending"
    });

    if (error) {
      return;
    }
  } catch {
    return;
  }
}

export async function submitDemoAction(formData: FormData) {
  const artistName = String(formData.get("artistName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const trackTitle = String(formData.get("trackTitle") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const file = formData.get("trackFile") as File | null;

  if (!artistName || !email || !trackTitle || !file) {
    return;
  }

  if (file.size > 30 * 1024 * 1024) {
    return;
  }

  if (!isSupabaseConfigured()) {
    return;
  }

  try {
    const supabase = (() => {
      try {
        return createServiceClient();
      } catch {
        return null;
      }
    })();

    if (!supabase) {
      return;
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
    const path = `demo-${Date.now()}-${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await supabase.storage.from("demo-submissions").upload(path, file, {
      contentType: file.type || "audio/mpeg",
      upsert: false
    });

    if (uploadError) {
      return;
    }

    const {
      data: { publicUrl }
    } = supabase.storage.from("demo-submissions").getPublicUrl(path);

    const { error } = await supabase.from("demo_submissions").insert({
      artist_name: artistName,
      email,
      track_title: trackTitle,
      message,
      file_url: publicUrl,
      status: "pending"
    });

    if (error) {
      return;
    }

    revalidatePath("/join");
  } catch {
    return;
  }
}

export async function unlockEpkAction(formData: FormData) {
  const rawSlug = String(formData.get("slug") ?? "");
  const slug = sanitizeEpkSlug(rawSlug);
  const password = String(formData.get("password") ?? "").trim();

  if (!slug) {
    redirect("/");
  }

  if (!password || !isSupabaseConfigured()) {
    redirect(`/epk/${slug}?error=invalid`);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("artists")
      .select("slug, epk_enabled, epk_password_hash")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data || !data.epk_enabled) {
      redirect(`/epk/${slug}?error=invalid`);
    }

    const storedHash = String(data.epk_password_hash ?? "");
    if (!storedHash || hashEpkPassword(password) !== storedHash) {
      redirect(`/epk/${slug}?error=invalid`);
    }

    const cookieStore = await cookies();
    cookieStore.set({
      name: getEpkCookieName(slug),
      value: createEpkAccessToken(slug, storedHash),
      path: `/epk/${slug}`,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 12
    });
  } catch {
    redirect(`/epk/${slug}?error=invalid`);
  }

  redirect(`/epk/${slug}`);
}

export async function lockEpkAction(formData: FormData) {
  const rawSlug = String(formData.get("slug") ?? "");
  const slug = sanitizeEpkSlug(rawSlug);

  if (!slug) {
    redirect("/");
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: getEpkCookieName(slug),
    value: "",
    path: `/epk/${slug}`,
    maxAge: 0
  });

  redirect(`/epk/${slug}`);
}
