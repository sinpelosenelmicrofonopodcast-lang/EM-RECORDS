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

async function logSiteEvent(
  eventName: string,
  input?: {
    path?: string;
    locale?: string;
    metadata?: Record<string, unknown>;
  }
) {
  if (!isSupabaseConfigured()) {
    return;
  }

  try {
    const service = createServiceClient();
    await service.from("site_events").insert({
      event_name: eventName,
      path: input?.path ?? null,
      locale: input?.locale ?? null,
      metadata: input?.metadata ?? null
    });
  } catch {
    // Tracking should never break product flows.
  }
}

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

    const domain = email.split("@")[1] ?? "unknown";
    await logSiteEvent("newsletter_subscribed", {
      path: "/",
      metadata: { source: "homepage", emailDomain: domain }
    });

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

    await logSiteEvent("sponsor_application_submitted", {
      path: "/licensing",
      metadata: { plan }
    });
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

    await logSiteEvent("demo_submitted", {
      path: "/join",
      metadata: { hasMessage: Boolean(message) }
    });

    revalidatePath("/join");
  } catch {
    return;
  }
}

type FanWallSubmitState = {
  status: "idle" | "success" | "error";
  message: string;
};

type BookingInquirySubmitState = {
  status: "idle" | "success" | "error";
  message: string;
};

function sanitizePlainText(input: string, max = 400): string {
  return input.replace(/<[^>]*>/g, "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
}

export async function submitFanWallEntryAction(_: FanWallSubmitState, formData: FormData): Promise<FanWallSubmitState> {
  const artistSlug = sanitizePlainText(String(formData.get("artistSlug") ?? "").toLowerCase(), 120);
  const fanName = sanitizePlainText(String(formData.get("fanName") ?? ""), 80);
  const message = sanitizePlainText(String(formData.get("message") ?? ""), 400);
  const honeypot = sanitizePlainText(String(formData.get("website") ?? ""), 180);

  if (honeypot) {
    return {
      status: "success",
      message: "Thanks! Your message is under review."
    };
  }

  if (!artistSlug || !fanName || !message) {
    return {
      status: "error",
      message: "Please complete all required fields."
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message: "Service temporarily unavailable."
    };
  }

  try {
    const h = await headers();
    const ip = getRequestIp(h);
    const ipSalt = process.env.FAN_WALL_IP_SALT || "em-fanwall-ip-salt-v1";
    const ipHash = hashValue(`${ipSalt}:${ip}`);
    const service = createServiceClient();

    try {
      const windowStart = new Date(Date.now() - 20 * 60 * 1000).toISOString();
      const { count } = await service
        .from("fan_wall_entries")
        .select("id", { count: "exact", head: true })
        .eq("artist_slug", artistSlug)
        .eq("ip_hash", ipHash)
        .gte("created_at", windowStart);

      if ((count ?? 0) >= 2) {
        return {
          status: "error",
          message: "Too many attempts. Please wait a few minutes."
        };
      }
    } catch {
      // Continue if the ip_hash column is not available yet.
    }

    const payload: Record<string, unknown> = {
      artist_slug: artistSlug,
      fan_name: fanName,
      message,
      status: "pending",
      is_verified: false,
      ip_hash: ipHash
    };

    let { error } = await service.from("fan_wall_entries").insert(payload);
    if (error && String(error.message).includes("ip_hash")) {
      delete payload.ip_hash;
      ({ error } = await service.from("fan_wall_entries").insert(payload));
    }
    if (error && String(error.message).includes("is_verified")) {
      delete payload.is_verified;
      ({ error } = await service.from("fan_wall_entries").insert(payload));
    }

    if (error) {
      return {
        status: "error",
        message: "Unable to submit right now. Try again."
      };
    }

    await logSiteEvent("fan_wall_submitted", {
      path: `/artists/${artistSlug}`,
      metadata: { artistSlug }
    });

    revalidatePath(`/artists/${artistSlug}`);
    revalidatePath("/admin/fan-wall");

    return {
      status: "success",
      message: "Submitted. Your message will appear after admin approval."
    };
  } catch {
    return {
      status: "error",
      message: "Unexpected error. Try again."
    };
  }
}

export async function submitBookingInquiryAction(
  _: BookingInquirySubmitState,
  formData: FormData
): Promise<BookingInquirySubmitState> {
  const artistSlug = sanitizePlainText(String(formData.get("artistSlug") ?? "").toLowerCase(), 120);
  const artistName = sanitizePlainText(String(formData.get("artistName") ?? ""), 120);
  const inquiryTypeRaw = sanitizePlainText(String(formData.get("inquiryType") ?? "").toLowerCase(), 40);
  const city = sanitizePlainText(String(formData.get("city") ?? ""), 120);
  const dateRange = sanitizePlainText(String(formData.get("dateRange") ?? ""), 120);
  const budgetRange = sanitizePlainText(String(formData.get("budgetRange") ?? ""), 120);
  const message = sanitizePlainText(String(formData.get("message") ?? ""), 1400);
  const contactEmail = sanitizePlainText(String(formData.get("contactEmail") ?? "").toLowerCase(), 160);
  const contactPhone = sanitizePlainText(String(formData.get("contactPhone") ?? ""), 80);
  const honeypot = sanitizePlainText(String(formData.get("website") ?? ""), 120);

  if (honeypot) {
    return {
      status: "success",
      message: "Request sent."
    };
  }

  const inquiryType = ["festival", "club", "private", "brand"].includes(inquiryTypeRaw) ? inquiryTypeRaw : "club";

  if (!artistSlug || !city || !dateRange || !budgetRange || !contactEmail) {
    return {
      status: "error",
      message: "Please complete all required fields."
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message: "Booking service is unavailable."
    };
  }

  try {
    const h = await headers();
    const ip = getRequestIp(h);
    const userAgent = h.get("user-agent") || null;
    const service = createServiceClient();

    const { data: artist } = await service.from("artists").select("id,name,slug").eq("slug", artistSlug).maybeSingle();
    const resolvedArtistName = String(artist?.name ?? artistName ?? "EM Records Artist");

    const { error } = await service.from("booking_inquiries").insert({
      artist_id: artist?.id ?? null,
      artist_slug: artistSlug,
      artist_name: resolvedArtistName,
      inquiry_type: inquiryType,
      city,
      date_range: dateRange,
      budget_range: budgetRange,
      message: message || null,
      contact_email: contactEmail,
      contact_phone: contactPhone || null,
      status: "new",
      ip,
      user_agent: userAgent
    });

    if (error) {
      return {
        status: "error",
        message: "Could not submit booking request. Verify SQL migration."
      };
    }

    await sendTransactionalEmail({
      to: process.env.BOOKING_ALERT_EMAIL || "emrecordsllc@gmail.com",
      subject: `Booking inquiry · ${resolvedArtistName}`,
      html: `
        <h2>New booking inquiry</h2>
        <p><strong>Artist:</strong> ${resolvedArtistName}</p>
        <p><strong>Type:</strong> ${inquiryType}</p>
        <p><strong>City:</strong> ${city}</p>
        <p><strong>Date range:</strong> ${dateRange}</p>
        <p><strong>Budget:</strong> ${budgetRange}</p>
        <p><strong>Email:</strong> ${contactEmail}</p>
        <p><strong>Phone:</strong> ${contactPhone || "N/A"}</p>
        <p><strong>Message:</strong> ${message || "N/A"}</p>
      `
    });

    await logSiteEvent("booking_inquiry_submitted", {
      path: `/artists/${artistSlug}`,
      metadata: {
        artistSlug,
        inquiryType
      }
    });

    revalidatePath(`/artists/${artistSlug}`);
    revalidatePath("/admin/booking-inquiries");

    return {
      status: "success",
      message: "Inquiry submitted. EM Records will contact you shortly."
    };
  } catch {
    return {
      status: "error",
      message: "Unexpected error. Please try again."
    };
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

  await logSiteEvent("terms_accepted", {
    path: nextPath
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

    await logSiteEvent("next_up_demo_submitted", {
      path: NEXT_UP_PAGE,
      metadata: {
        city,
        hasSocialLinks: Boolean(socialLinks),
        hasArtistBio: Boolean(artistBio),
        uploadedFile: Boolean(demoFile)
      }
    });

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

    await logSiteEvent("next_up_vote_cast", {
      path: NEXT_UP_PAGE,
      metadata: { competitorId }
    });
  } catch {
    redirectNextUpVote("error");
  }

  revalidatePath("/killeen-next-up");
  revalidatePath("/admin/next-up");
  redirectNextUpVote("ok");
}
