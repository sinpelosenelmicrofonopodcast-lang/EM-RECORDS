import { createHash } from "node:crypto";
import { beatArtUrl } from "@/lib/beat-art";
import { createServiceClient } from "@/lib/supabase/service";

export type BeatCatalogItem = {
  id: string;
  title: string;
  slug: string;
  bpm: number;
  key: string | null;
  genre: string | null;
  mood: string | null;
  tags: string[];
  description: string | null;
  previewUrl: string | null;
  coverUrl: string | null;
  isExclusiveSold: boolean;
  priceBasic: number;
  priceStandard: number;
  pricePremium: number;
  priceExclusive: number;
};

export type BeatInquiryMessage = {
  id: string;
  senderKind: "customer" | "staff";
  body: string;
  createdAt: string;
  readAt: string | null;
};

export type BeatInquiryThread = {
  id: string;
  beatId: string;
  beatTitle: string;
  beatSlug: string;
  requesterName: string;
  requesterEmail: string;
  licenseType: string;
  status: string;
  lastMessageAt: string;
  createdAt: string;
  messages: BeatInquiryMessage[];
};

function relationObject<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function hashBeatInquiryToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function getPublishedBeats(): Promise<BeatCatalogItem[]> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("beats")
    .select("id,title,slug,bpm,key,genre,mood,tags,description,preview_url,cover_url,is_exclusive_sold,price_basic,price_standard,price_premium,price_exclusive,art_mode,art_version")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug),
    bpm: Number(row.bpm ?? 0),
    key: row.key ? String(row.key) : null,
    genre: row.genre ? String(row.genre) : null,
    mood: row.mood ? String(row.mood) : null,
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    description: row.description ? String(row.description) : null,
    previewUrl: row.preview_url ? String(row.preview_url) : null,
    coverUrl: String(row.art_mode ?? "generated") === "generated" ? beatArtUrl(String(row.id), Number(row.art_version ?? 1)) : row.cover_url ? String(row.cover_url) : null,
    isExclusiveSold: Boolean(row.is_exclusive_sold),
    priceBasic: Number(row.price_basic ?? 0),
    priceStandard: Number(row.price_standard ?? 0),
    pricePremium: Number(row.price_premium ?? 0),
    priceExclusive: Number(row.price_exclusive ?? 0)
  }));
}

async function loadMessages(inquiryId: string): Promise<BeatInquiryMessage[]> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("beat_inquiry_messages")
    .select("id,sender_kind,body,created_at,read_at")
    .eq("inquiry_id", inquiryId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    senderKind: row.sender_kind === "staff" ? "staff" : "customer",
    body: String(row.body),
    createdAt: String(row.created_at),
    readAt: row.read_at ? String(row.read_at) : null
  }));
}

export async function getBeatInquiryThreadByToken(token: string): Promise<BeatInquiryThread | null> {
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) return null;

  const service = createServiceClient();
  const tokenHash = hashBeatInquiryToken(token);
  const { data: inquiry, error } = await service
    .from("beat_inquiries")
    .select("id,beat_id,requester_name,requester_email,license_type,status,last_message_at,created_at,beats(title,slug)")
    .eq("access_token_hash", tokenHash)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!inquiry) return null;

  const beat = relationObject<any>((inquiry as any).beats);
  const messages = await loadMessages(String(inquiry.id));

  return {
    id: String(inquiry.id),
    beatId: String(inquiry.beat_id),
    beatTitle: String(beat?.title ?? "Beat"),
    beatSlug: String(beat?.slug ?? ""),
    requesterName: String(inquiry.requester_name),
    requesterEmail: String(inquiry.requester_email),
    licenseType: String(inquiry.license_type),
    status: String(inquiry.status),
    lastMessageAt: String(inquiry.last_message_at),
    createdAt: String(inquiry.created_at),
    messages
  };
}

export async function getBeatInquiriesAdmin(): Promise<BeatInquiryThread[]> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("beat_inquiries")
    .select("id,beat_id,requester_name,requester_email,license_type,status,last_message_at,created_at,beats(title,slug)")
    .order("last_message_at", { ascending: false })
    .limit(250);

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const ids = rows.map((row: any) => String(row.id));
  const grouped = new Map<string, BeatInquiryMessage[]>();

  if (ids.length > 0) {
    const { data: messages, error: messageError } = await service
      .from("beat_inquiry_messages")
      .select("id,inquiry_id,sender_kind,body,created_at,read_at")
      .in("inquiry_id", ids)
      .order("created_at", { ascending: true });

    if (messageError) throw new Error(messageError.message);

    for (const row of messages ?? []) {
      const id = String((row as any).inquiry_id);
      const list = grouped.get(id) ?? [];
      list.push({
        id: String((row as any).id),
        senderKind: (row as any).sender_kind === "staff" ? "staff" : "customer",
        body: String((row as any).body),
        createdAt: String((row as any).created_at),
        readAt: (row as any).read_at ? String((row as any).read_at) : null
      });
      grouped.set(id, list);
    }
  }

  return rows.map((row: any) => {
    const beat = relationObject<any>(row.beats);
    return {
      id: String(row.id),
      beatId: String(row.beat_id),
      beatTitle: String(beat?.title ?? "Beat"),
      beatSlug: String(beat?.slug ?? ""),
      requesterName: String(row.requester_name),
      requesterEmail: String(row.requester_email),
      licenseType: String(row.license_type),
      status: String(row.status),
      lastMessageAt: String(row.last_message_at),
      createdAt: String(row.created_at),
      messages: grouped.get(String(row.id)) ?? []
    };
  });
}
