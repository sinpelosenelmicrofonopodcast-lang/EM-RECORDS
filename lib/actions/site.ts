"use server";

import { createHash, randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createEpkAccessToken, getEpkCookieName, hashEpkPassword, sanitizeEpkSlug } from "@/lib/epk";
import { getNextUpVotingPhase, resolveNextUpVotingWindow } from "@/lib/next-up-voting";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { sanitizeNextPath, TERMS_CONSENT_COOKIE, TERMS_CONSENT_MAX_AGE, TERMS_CONSENT_VALUE } from "@/lib/terms";

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

export async function acceptTermsAction(formData: FormData) {
  const nextInput = String(formData.get("next") ?? "/");
  const nextPath = sanitizeNextPath(nextInput);
  const cookieStore = await cookies();

  cookieStore.set({
    name: TERMS_CONSENT_COOKIE,
    value: TERMS_CONSENT_VALUE,
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: TERMS_CONSENT_MAX_AGE
  });

  redirect(nextPath === "/legal" ? "/" : nextPath);
}

function getRequestIp(h: Headers): string {
  const fromForward = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const fromReal = h.get("x-real-ip")?.trim();
  return fromForward || fromReal || "unknown";
}

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashIp(ip: string): string {
  const salt = process.env.VOTE_IP_SALT || "em-next-up-ip-salt-v1";
  return hashValue(`${salt}:${ip}`);
}

async function verifyTurnstileToken(token: string | null, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!secret) {
    return true;
  }

  // If secret exists but widget is not configured in client, skip hard-fail.
  if (!siteKey) {
    return true;
  }

  if (!token) {
    return false;
  }

  try {
    const payload = new URLSearchParams({
      secret,
      response: token,
      remoteip: ip
    });

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: payload
    });

    if (!response.ok) {
      return false;
    }

    const result = (await response.json()) as { success?: boolean };
    return Boolean(result.success);
  } catch {
    return false;
  }
}

async function sendTransactionalEmail(args: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NEXT_UP_FROM_EMAIL;

  if (!apiKey || !from) {
    return;
  }

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [args.to],
        subject: args.subject,
        html: args.html
      })
    });
  } catch {
    // Silent fallback when email provider is not available.
  }
}

const NEXT_UP_PAGE = "/killeen-next-up";

function nextUpStatusUrl(section: "submit-demo" | "competencia", query: string): string {
  return `${NEXT_UP_PAGE}?${query}#${section}`;
}

function redirectNextUpDemo(status: string): never {
  redirect(nextUpStatusUrl("submit-demo", `demo=${status}`));
}

function redirectNextUpVote(status: string): never {
  redirect(nextUpStatusUrl("competencia", `vote=${status}`));
}

export async function submitNextUpDemoAction(formData: FormData) {
  const stageName = String(formData.get("stageName") ?? "").trim();
  const legalName = String(formData.get("legalName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const demoUrlInput = String(formData.get("demoUrl") ?? "").trim();
  const demoFileValue = formData.get("demoFile");
  const demoFile = demoFileValue instanceof File && demoFileValue.size > 0 ? demoFileValue : null;
  const socialLinks = String(formData.get("socialLinks") ?? "").trim();
  const artistBio = String(formData.get("artistBio") ?? "").trim();
  const acceptedTerms = String(formData.get("acceptTerms") ?? "") === "on";
  const honeypot = String(formData.get("website") ?? "").trim();

  if (honeypot) {
    redirectNextUpDemo("ok");
  }

  if (!stageName || !legalName || !email || !phone || !city || (!demoUrlInput && !demoFile) || !acceptedTerms) {
    redirectNextUpDemo("invalid");
  }

  if (!isSupabaseConfigured()) {
    redirectNextUpDemo("config");
  }

  try {
    const h = await headers();
    const ip = getRequestIp(h);
    const service = createServiceClient();
    let demoUrl = demoUrlInput;

    const { data: existingSubmission, error: existingSubmissionError } = await service
      .from("next_up_submissions")
      .select("id")
      .ilike("stage_name", stageName)
      .limit(1)
      .maybeSingle();

    if (existingSubmissionError) {
      redirectNextUpDemo("error");
    }

    if (existingSubmission?.id) {
      redirectNextUpDemo("duplicate_stage");
    }

    if (demoFile) {
      const safeName = demoFile.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
      const path = `demos/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } = await service.storage.from("next-up-media").upload(path, demoFile, {
        contentType: demoFile.type || "audio/mpeg",
        upsert: false
      });

      if (uploadError) {
        redirectNextUpDemo("error");
      }

      const {
        data: { publicUrl }
      } = service.storage.from("next-up-media").getPublicUrl(path);

      demoUrl = publicUrl;
    }

    const { error } = await service.from("next_up_submissions").insert({
      stage_name: stageName,
      legal_name: legalName,
      email,
      phone,
      city,
      demo_url: demoUrl,
      social_links: socialLinks || null,
      artist_bio: artistBio || null,
      status: "pending",
      ip_address: ip,
      ip_hash: hashIp(ip)
    });

    if (error) {
      redirectNextUpDemo("error");
    }

    await sendTransactionalEmail({
      to: email,
      subject: "EM Records | Demo recibida para KILLEEN NEXT UP",
      html: `
        <h2>KILLEEN NEXT UP – Demo Recibida</h2>
        <p>Hola ${stageName},</p>
        <p>Tu demo fue recibida correctamente por EM Records.</p>
        <p>Estado inicial: <strong>pendiente de revisión</strong>.</p>
      `
    });
  } catch {
    redirectNextUpDemo("error");
  }

  revalidatePath("/killeen-next-up");
  revalidatePath("/admin/next-up");
  redirectNextUpDemo("ok");
}

export async function requestNextUpVoteOtpAction(formData: FormData) {
  const competitorId = String(formData.get("competitorId") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const honeypot = String(formData.get("website") ?? "").trim();
  const turnstileToken = String(formData.get("turnstileToken") ?? "").trim() || null;
  if (honeypot) {
    redirectNextUpVote("sent");
  }

  if (!competitorId || !email || !isSupabaseConfigured()) {
    redirectNextUpVote("invalid");
  }

  const h = await headers();
  const ip = getRequestIp(h);
  const humanCheck = await verifyTurnstileToken(turnstileToken, ip);
  if (!humanCheck) {
    redirectNextUpVote("captcha");
  }

  try {
    const service = createServiceClient();
    const { data: settings } = await service
      .from("next_up_settings")
      .select("voting_enabled, voting_starts_at, voting_ends_at")
      .eq("id", "default")
      .maybeSingle();
    if (!settings?.voting_enabled) {
      redirectNextUpVote("closed");
    }
    const { startsAt, endsAt } = resolveNextUpVotingWindow(settings?.voting_starts_at, settings?.voting_ends_at);
    if (getNextUpVotingPhase(new Date(), startsAt, endsAt) !== "active") {
      redirectNextUpVote("closed");
    }

    const { data: competitor, error: competitorError } = await service
      .from("next_up_competitors")
      .select("id, stage_name, status")
      .eq("id", competitorId)
      .eq("status", "approved")
      .maybeSingle();

    if (competitorError || !competitor) {
      redirectNextUpVote("invalid");
    }

    const code = String(randomInt(100000, 999999));
    const otpHash = hashValue(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error } = await service.from("next_up_vote_otps").insert({
      competitor_id: competitorId,
      voter_email: email,
      otp_hash: otpHash,
      expires_at: expiresAt,
      requester_ip: ip,
      requester_ip_hash: hashIp(ip)
    });

    if (error) {
      redirectNextUpVote("error");
    }

    await sendTransactionalEmail({
      to: email,
      subject: `OTP de voto | KILLEEN NEXT UP`,
      html: `
        <h2>KILLEEN NEXT UP</h2>
        <p>Tu código de verificación es:</p>
        <p style="font-size:24px;font-weight:700;letter-spacing:4px;">${code}</p>
        <p>Expira en 10 minutos.</p>
        <p>Artista: <strong>${String(competitor.stage_name)}</strong></p>
      `
    });
  } catch {
    redirectNextUpVote("error");
  }

  redirectNextUpVote("sent");
}

export async function castNextUpVoteAction(formData: FormData) {
  const competitorId = String(formData.get("competitorId") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const honeypot = String(formData.get("website") ?? "").trim();
  if (honeypot) {
    redirectNextUpVote("ok");
  }

  if (!competitorId || !email || !isSupabaseConfigured()) {
    redirectNextUpVote("invalid");
  }

  try {
    const service = createServiceClient();
    const { data: settings } = await service
      .from("next_up_settings")
      .select("voting_enabled, voting_starts_at, voting_ends_at")
      .eq("id", "default")
      .maybeSingle();
    if (!settings?.voting_enabled) {
      redirectNextUpVote("closed");
    }
    const { startsAt, endsAt } = resolveNextUpVotingWindow(settings?.voting_starts_at, settings?.voting_ends_at);
    if (getNextUpVotingPhase(new Date(), startsAt, endsAt) !== "active") {
      redirectNextUpVote("closed");
    }

    const h = await headers();
    const ip = getRequestIp(h);

    const { error: voteError } = await service.from("next_up_votes").insert({
      competitor_id: competitorId,
      voter_email: email,
      voter_ip: ip,
      voter_ip_hash: hashIp(ip)
    });

    if (voteError) {
      const msg = String(voteError.message || "").toLowerCase();
      if (msg.includes("duplicate key")) {
        redirectNextUpVote("duplicate");
      }
      redirectNextUpVote("error");
    }
  } catch {
    redirectNextUpVote("error");
  }

  revalidatePath("/killeen-next-up");
  revalidatePath("/admin/next-up");
  redirectNextUpVote("ok");
}
