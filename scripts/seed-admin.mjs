import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_EMAIL = "emrecordsllc@gmail.com";
const DEFAULT_PASSWORD = "EMR!2026#Pulse$V9";

function parseDotEnv(content) {
  const map = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const raw = trimmed.slice(index + 1).trim();
    map[key] = raw.replace(/^['\"]|['\"]$/g, "");
  }
  return map;
}

function resolveEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  const fromFile = fs.existsSync(envPath) ? parseDotEnv(fs.readFileSync(envPath, "utf8")) : {};

  return {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || fromFile.NEXT_PUBLIC_SUPABASE_URL || "",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || fromFile.SUPABASE_SERVICE_ROLE_KEY || "",
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || fromFile.ADMIN_EMAIL || DEFAULT_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || fromFile.ADMIN_PASSWORD || DEFAULT_PASSWORD
  };
}

async function findUserByEmail(supabase, email) {
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;

    const users = data?.users ?? [];
    const found = users.find((user) => (user.email ?? "").toLowerCase() === email.toLowerCase());

    if (found) return found;
    if (users.length < 200) return null;

    page += 1;
  }
}

async function main() {
  const env = resolveEnv();

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  let user = await findUserByEmail(supabase, env.ADMIN_EMAIL);

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: env.ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { role: "admin", label: "EM Records Admin" }
    });

    if (error) throw error;
    user = data.user;
    console.log(`Created auth user: ${user.id}`);
  } else {
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: env.ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { ...(user.user_metadata || {}), role: "admin", label: "EM Records Admin" }
    });

    if (error) throw error;
    console.log(`Updated auth user: ${user.id}`);
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: env.ADMIN_EMAIL,
      full_name: "EM Records Admin",
      is_admin: true
    },
    { onConflict: "id", ignoreDuplicates: false }
  );

  if (profileError) {
    const message = String(profileError.message || "");
    if (message.toLowerCase().includes("could not find the table")) {
      console.log("profiles table not found; relying on auth user_metadata.role=admin for dashboard access.");
    } else {
      throw profileError;
    }
  } else {
    console.log("Profile synced with is_admin=true");
  }

  console.log(`ADMIN_EMAIL=${env.ADMIN_EMAIL}`);
  console.log(`TEMP_ADMIN_PASSWORD=${env.ADMIN_PASSWORD}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
