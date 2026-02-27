import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const lines = [headers.join(",")];
  rows.forEach((row) => lines.push(headers.map((h) => escape(row[h])).join(",")));
  return lines.join("\n");
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let isAdmin = user.user_metadata?.role === "admin";
  if (!isAdmin) {
    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    isAdmin = Boolean(profile?.is_admin);
  }

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = createServiceClient();
  const [{ data: submissions }, { data: competitors }, { data: votes }] = await Promise.all([
    service.from("next_up_submissions").select("*").order("created_at", { ascending: false }),
    service.from("next_up_competitors").select("*").order("created_at", { ascending: false }),
    service.from("next_up_votes").select("*").order("created_at", { ascending: false })
  ]);

  const sections = [
    "=== NEXT UP SUBMISSIONS ===",
    toCsv((submissions as Array<Record<string, unknown>>) ?? []),
    "",
    "=== NEXT UP COMPETITORS ===",
    toCsv((competitors as Array<Record<string, unknown>>) ?? []),
    "",
    "=== NEXT UP VOTES ===",
    toCsv((votes as Array<Record<string, unknown>>) ?? [])
  ];

  return new NextResponse(sections.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="killeen-next-up-export-${new Date().toISOString().slice(0, 10)}.csv"`
    }
  });
}
