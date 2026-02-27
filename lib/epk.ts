import { createHash } from "node:crypto";

const EPK_COOKIE_PREFIX = "em_epk_";
const EPK_SECRET_VERSION = "em-epk-v1";

export function sanitizeEpkSlug(slug: string): string {
  return slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

export function getEpkCookieName(slug: string): string {
  return `${EPK_COOKIE_PREFIX}${sanitizeEpkSlug(slug)}`;
}

export function hashEpkPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function createEpkAccessToken(slug: string, passwordHash: string): string {
  return createHash("sha256")
    .update(`${sanitizeEpkSlug(slug)}:${passwordHash}:${EPK_SECRET_VERSION}`)
    .digest("hex");
}
