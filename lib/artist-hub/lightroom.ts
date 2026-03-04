import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";

const AUTH_BASE = "https://ims-na1.adobelogin.com";
const TOKEN_ENDPOINT = `${AUTH_BASE}/ims/token/v3`;
const AUTHORIZE_ENDPOINT = `${AUTH_BASE}/ims/authorize/v2`;
const DEFAULT_SCOPE = "openid,AdobeID,creative_sdk";

function tokenKey(): Buffer {
  const source = process.env.LIGHTROOM_TOKEN_ENCRYPTION_KEY || process.env.ARTIST_HUB_TOKEN_KEY || "em-artist-hub-dev-key";
  return createHash("sha256").update(source).digest();
}

function stateSecret(): string {
  return process.env.LIGHTROOM_STATE_SECRET || process.env.ARTIST_HUB_TOKEN_KEY || "em-lightroom-state-secret";
}

export function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const key = tokenKey();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSecret(payload: string | null | undefined): string | null {
  if (!payload) return null;
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) return null;

  try {
    const key = tokenKey();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

function signState(raw: string): string {
  return createHmac("sha256", stateSecret()).update(raw).digest("hex");
}

function encodeState(artistId: string, userId: string): string {
  const raw = `${artistId}|${userId}|${Date.now()}`;
  const sig = signState(raw);
  return Buffer.from(`${raw}|${sig}`, "utf8").toString("base64url");
}

function decodeState(encoded: string): { artistId: string; userId: string } | null {
  try {
    const decoded = Buffer.from(encoded, "base64url").toString("utf8");
    const [artistId, userId, ts, sig] = decoded.split("|");
    if (!artistId || !userId || !ts || !sig) return null;
    const raw = `${artistId}|${userId}|${ts}`;
    if (signState(raw) !== sig) return null;

    const ageMs = Date.now() - Number(ts);
    if (!Number.isFinite(ageMs) || ageMs > 1000 * 60 * 20) {
      return null;
    }

    return { artistId, userId };
  } catch {
    return null;
  }
}

export function isLightroomConfigured(): boolean {
  return Boolean(process.env.LIGHTROOM_CLIENT_ID && process.env.LIGHTROOM_CLIENT_SECRET);
}

export function buildLightroomAuthorizeUrl(artistId: string, userId: string): string {
  const clientId = process.env.LIGHTROOM_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing LIGHTROOM_CLIENT_ID");
  }

  const callbackUrl = `${baseUrl()}/api/artist-hub/lightroom/oauth`;
  const scope = process.env.LIGHTROOM_SCOPE || DEFAULT_SCOPE;
  const state = encodeState(artistId, userId);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope,
    state
  });

  return `${AUTHORIZE_ENDPOINT}?${params.toString()}`;
}

async function exchangeCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number | null;
  tokenType: string | null;
  scope: string | null;
}> {
  const clientId = process.env.LIGHTROOM_CLIENT_ID;
  const clientSecret = process.env.LIGHTROOM_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Lightroom OAuth is not configured.");
  }

  const callbackUrl = `${baseUrl()}/api/artist-hub/lightroom/oauth`;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: callbackUrl
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    throw new Error(`Failed Lightroom token exchange (${response.status}).`);
  }

  const data = (await response.json()) as any;
  return {
    accessToken: String(data.access_token ?? ""),
    refreshToken: data.refresh_token ? String(data.refresh_token) : null,
    expiresIn: data.expires_in ? Number(data.expires_in) : null,
    tokenType: data.token_type ? String(data.token_type) : null,
    scope: data.scope ? String(data.scope) : null
  };
}

async function refreshToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number | null;
  tokenType: string | null;
  scope: string | null;
}> {
  const clientId = process.env.LIGHTROOM_CLIENT_ID;
  const clientSecret = process.env.LIGHTROOM_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Lightroom OAuth is not configured.");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    throw new Error(`Failed Lightroom token refresh (${response.status}).`);
  }

  const data = (await response.json()) as any;
  return {
    accessToken: String(data.access_token ?? ""),
    refreshToken: data.refresh_token ? String(data.refresh_token) : null,
    expiresIn: data.expires_in ? Number(data.expires_in) : null,
    tokenType: data.token_type ? String(data.token_type) : null,
    scope: data.scope ? String(data.scope) : null
  };
}

export async function handleLightroomOAuthCallback(input: {
  code: string;
  state: string;
}): Promise<{ artistId: string }> {
  const decoded = decodeState(input.state);
  if (!decoded) {
    throw new Error("Invalid Lightroom state.");
  }

  const token = await exchangeCode(input.code);
  if (!token.accessToken) {
    throw new Error("Lightroom did not return an access token.");
  }

  const service = createServiceClient();
  const expiresAt = token.expiresIn ? new Date(Date.now() + token.expiresIn * 1000).toISOString() : null;

  const { error } = await service.from("lightroom_connections").upsert(
    {
      artist_id: decoded.artistId,
      access_token_enc: encryptSecret(token.accessToken),
      refresh_token_enc: token.refreshToken ? encryptSecret(token.refreshToken) : null,
      token_type: token.tokenType,
      scope: token.scope,
      expires_at: expiresAt,
      updated_at: new Date().toISOString()
    },
    { onConflict: "artist_id" }
  );

  if (error) {
    throw new Error(error.message);
  }

  return { artistId: decoded.artistId };
}

export async function refreshLightroomConnection(artistId: string): Promise<string> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("lightroom_connections")
    .select("id,refresh_token_enc,access_token_enc,expires_at")
    .eq("artist_id", artistId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("No Lightroom connection found for artist.");
  }

  const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : 0;
  const accessToken = decryptSecret(data.access_token_enc);
  if (accessToken && expiresAt > Date.now() + 45_000) {
    return accessToken;
  }

  const refresh = decryptSecret(data.refresh_token_enc);
  if (!refresh) {
    throw new Error("No Lightroom refresh token available.");
  }

  const refreshed = await refreshToken(refresh);
  const nextAccess = refreshed.accessToken;
  if (!nextAccess) {
    throw new Error("Unable to refresh Lightroom token.");
  }

  const nextExpiresAt = refreshed.expiresIn ? new Date(Date.now() + refreshed.expiresIn * 1000).toISOString() : null;

  const { error: updateError } = await service
    .from("lightroom_connections")
    .update({
      access_token_enc: encryptSecret(nextAccess),
      refresh_token_enc: refreshed.refreshToken ? encryptSecret(refreshed.refreshToken) : data.refresh_token_enc,
      token_type: refreshed.tokenType,
      scope: refreshed.scope,
      expires_at: nextExpiresAt,
      updated_at: new Date().toISOString()
    })
    .eq("id", data.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return nextAccess;
}

function resolveAssetImage(asset: any): { url: string; thumbUrl: string | null; sourceId: string } | null {
  const id = String(asset.id ?? asset.asset?.id ?? "").trim();
  const imageUrl = asset?.renditions?.full?.href || asset?.href || asset?.asset?.href || asset?.uri || asset?.url;
  const thumb = asset?.renditions?.thumbnail?.href || asset?.thumbnail || null;
  if (!id || !imageUrl) return null;
  return {
    sourceId: id,
    url: String(imageUrl),
    thumbUrl: thumb ? String(thumb) : null
  };
}

export async function syncLightroomAlbum(artistId: string): Promise<{ synced: number }> {
  const service = createServiceClient();
  const { data: connection, error: connectionError } = await service
    .from("lightroom_connections")
    .select("album_id")
    .eq("artist_id", artistId)
    .maybeSingle();

  if (connectionError || !connection) {
    throw new Error("Artist has no Lightroom connection.");
  }

  if (!connection.album_id) {
    throw new Error("Artist Lightroom album_id is not configured yet.");
  }

  const accessToken = await refreshLightroomConnection(artistId);
  const apiBase = process.env.LIGHTROOM_API_BASE || "https://lr.adobe.io/v2";
  const apiKey = process.env.LIGHTROOM_CLIENT_ID;

  const response = await fetch(`${apiBase}/albums/${encodeURIComponent(String(connection.album_id))}/assets`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(apiKey ? { "x-api-key": apiKey } : {})
    }
  });

  if (!response.ok) {
    throw new Error(`Lightroom sync request failed (${response.status}).`);
  }

  const payload = (await response.json()) as any;
  const rawAssets: any[] = payload.resources || payload.data || payload.items || [];

  let synced = 0;
  for (const row of rawAssets) {
    const image = resolveAssetImage(row);
    if (!image) continue;

    const { error } = await service.from("media_assets").upsert(
      {
        artist_id: artistId,
        type: "photo",
        source: "lightroom",
        source_id: image.sourceId,
        url: image.url,
        thumb_url: image.thumbUrl,
        metadata: {
          lightroom: true,
          raw: row
        }
      },
      { onConflict: "artist_id,source,source_id" }
    );

    if (!error) {
      synced += 1;
    }
  }

  await service
    .from("lightroom_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("artist_id", artistId);

  return { synced };
}
