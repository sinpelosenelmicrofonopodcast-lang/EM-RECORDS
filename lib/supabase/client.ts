"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";

export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase env vars are missing.");
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
