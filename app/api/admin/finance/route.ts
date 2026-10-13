import { NextResponse } from "next/server";
import { z } from "zod";
import { requireFinanceApiContext } from "@/lib/finance/access";

export const dynamic = "force-dynamic";

const id = z.string().uuid();
const text = z.string().trim().max(180);
const transaction = z.object({
  kind: z.enum(["expense", "income"]),
  occurred_on: z.iso.date(),
  description: z.string().trim().min(2).max(180),
  amount_cents: z.number().int().positive().max(999999999999),
  category: z.string().trim().min(2).max(80),
  artist_id: id.nullable().optional().default(null),
  release_id: id.nullable().optional().default(null),
  project_name: text.nullable().optional().default(null),
  counterparty: text.nullable().optional().default(null),
  payment_method: z.enum(["card", "bank", "cash", "paypal", "other"]).default("other"),
  receipt_path: z.string().trim().max(300).nullable().optional().default(null),
  notes: z.string().trim().max(3000).nullable().optional().default(null)
}).strict();
const budget = z.object({
  month: z.string().regex(/^\d{4}-\d{2}-01$/),
  category: z.string().trim().min(2).max(80),
  amount_cents: z.number().int().positive().max(999999999999)
}).strict();

function validateReceipt(path: string | null): boolean {
  return !path || /^receipts\/[a-f0-9-]{36}\.(pdf|png|jpg|webp)$/.test(path);
}
function replyError(error: unknown, status = 400) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: error.issues.map((x) => x.message).join("; ") }, { status });
  }
  return NextResponse.json({ error: error instanceof Error ? error.message : "Error de operación." }, { status });
}

export async function POST(request: Request) {
  const auth = await requireFinanceApiContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const body = await request.json();
    if (body.resource === "budget") {
      const parsed = budget.parse(body.data);
      const { data, error } = await auth.service.from("finance_budgets")
        .upsert({ ...parsed, created_by: null, updated_at: new Date().toISOString() }, { onConflict: "month,category" })
        .select("*").single();
      if (error) throw error;
      return NextResponse.json({ ok: true, record: data });
    }
    if (body.resource !== "transaction") throw new Error("Tipo de registro desconocido.");
    const parsed = transaction.parse(body.data);
    if (!validateReceipt(parsed.receipt_path)) throw new Error("Comprobante inválido.");
    const { data, error } = await auth.service.from("finance_transactions")
      .insert({ ...parsed, created_by: auth.userId })
      .select("*").single();
    if (error) throw error;
    return NextResponse.json({ ok: true, record: data });
  } catch (error) { return replyError(error); }
}

export async function PATCH(request: Request) {
  const auth = await requireFinanceApiContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const body = await request.json();
    if (body.resource !== "transaction") throw new Error("Solo se pueden editar transacciones.");
    const recordId = id.parse(body.id);
    const parsed = transaction.parse(body.data);
    if (!validateReceipt(parsed.receipt_path)) throw new Error("Comprobante inválido.");
    const { data, error } = await auth.service.from("finance_transactions")
      .update({ ...parsed, updated_at: new Date().toISOString(), created_by: auth.userId })
      .eq("id", recordId).select("*").single();
    if (error) throw error;
    return NextResponse.json({ ok: true, record: data });
  } catch (error) { return replyError(error); }
}

export async function DELETE(request: Request) {
  const auth = await requireFinanceApiContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const body = await request.json();
    const recordId = id.parse(body.id);
    if (body.resource === "budget") {
      const { error } = await auth.service.from("finance_budgets").delete().eq("id", recordId);
      if (error) throw error;
    } else if (body.resource === "transaction") {
      const { data, error } = await auth.service.from("finance_transactions")
        .delete().eq("id", recordId).select("receipt_path").single();
      if (error) throw error;
      if (data?.receipt_path) {
        const { error: storageError } = await auth.service.storage.from("em-finance-receipts").remove([data.receipt_path]);
        if (storageError) console.error("Could not delete finance receipt", storageError.message);
      }
    } else throw new Error("Tipo de registro desconocido.");
    return NextResponse.json({ ok: true });
  } catch (error) { return replyError(error); }
}
