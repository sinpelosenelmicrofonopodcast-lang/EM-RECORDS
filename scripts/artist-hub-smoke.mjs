import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

const requiredFiles = [
  "app/api/artist-hub/artists/route.ts",
  "app/api/artist-hub/artists/[id]/route.ts",
  "app/api/artist-hub/catalog/route.ts",
  "app/api/artist-hub/launch/[songId]/route.ts",
  "app/api/artist-hub/smartlinks/[releaseId]/route.ts",
  "app/api/artist-hub/content/route.ts",
  "app/api/artist-hub/pr/route.ts",
  "app/api/artist-hub/sync/[songId]/route.ts",
  "app/api/artist-hub/pdf/media-kit/[artistId]/route.ts",
  "app/api/artist-hub/pdf/report/[artistId]/route.ts",
  "app/api/artist-hub/lightroom/oauth/route.ts",
  "app/api/artist-hub/lightroom/sync/[artistId]/route.ts",
  "app/api/artist-hub/audit/route.ts",
  "app/dashboard/artist-hub/page.tsx",
  "app/dashboard/artist-hub/[artistSlug]/catalog/page.tsx",
  "app/dashboard/artist-hub/[artistSlug]/launch/page.tsx",
  "app/dashboard/artist-hub/[artistSlug]/media-kit/page.tsx",
  "app/dashboard/admin/artist-hub/page.tsx",
  "supabase/migrations/2026-03-04-artist-hub.sql"
];

const missing = requiredFiles.filter((file) => !existsSync(resolve(root, file)));
if (missing.length > 0) {
  console.error("Missing required files:\n" + missing.map((file) => `- ${file}`).join("\n"));
  process.exit(1);
}

const migration = readFileSync(resolve(root, "supabase/migrations/2026-03-04-artist-hub.sql"), "utf8");
const requiredSqlSnippets = [
  "create table if not exists public.artist_members",
  "create table if not exists public.songs",
  "create table if not exists public.launch_checklists",
  "create table if not exists public.smartlinks",
  "create table if not exists public.documents",
  "create table if not exists public.audit_log",
  "create policy \"songs member read\"",
  "create policy \"documents member read by acl\"",
  "insert into storage.buckets (id, name, public)"
];

const missingSnippets = requiredSqlSnippets.filter((snippet) => !migration.includes(snippet));
if (missingSnippets.length > 0) {
  console.error("Migration missing expected snippets:\n" + missingSnippets.map((snippet) => `- ${snippet}`).join("\n"));
  process.exit(1);
}

console.log("Artist Hub smoke test passed.");
