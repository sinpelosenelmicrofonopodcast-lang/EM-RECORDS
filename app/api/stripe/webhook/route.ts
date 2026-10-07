import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Stripe payments are retired. Use PayPal." },
    { status: 410 }
  );
}
