import { NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/utils";

export async function POST() {
  return NextResponse.redirect(
    absoluteUrl("/events?error=payments_moved_to_paypal"),
    303
  );
}
