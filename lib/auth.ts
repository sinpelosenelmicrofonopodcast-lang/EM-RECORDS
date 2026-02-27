import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function getCurrentUser() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user;
}

export async function isAdminUser(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) {
    return false;
  }

  if (user.user_metadata?.role === "admin") {
    return true;
  }

  const { data, error } = await supabase.from("profiles").select("is_admin").eq("id", userId).maybeSingle();

  if (error) {
    return false;
  }

  return Boolean(data?.is_admin);
}

export async function requireAdminPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/admin/login");
  }

  const admin = await isAdminUser(user.id);

  if (!admin) {
    redirect("/");
  }

  return user;
}
