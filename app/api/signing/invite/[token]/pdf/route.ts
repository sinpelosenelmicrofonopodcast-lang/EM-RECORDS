import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createSignedUrlFromStoragePath, getContractBundle } from "@/lib/signing/service";
import { hashInviteToken } from "@/lib/signing/token";

type Context = {
  params: Promise<{
    token: string;
  }>;
};

export async function GET(request: Request, { params }: Context) {
  const { token } = await params;
  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase() ?? "";
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const service = createServiceClient();
  const tokenHash = hashInviteToken(token);
  const { data: invite } = await service.from("invite_tokens").select("*").eq("token_hash", tokenHash).maybeSingle();
  if (!invite) {
    return NextResponse.json({ error: "Invite token is invalid." }, { status: 404 });
  }

  if (String(invite.email).toLowerCase() !== email) {
    return NextResponse.json({ error: "Email verification failed." }, { status: 403 });
  }

  if (invite.revoked_at) {
    return NextResponse.json({ error: "Invite was revoked." }, { status: 403 });
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invite has expired." }, { status: 403 });
  }

  const bundle = await getContractBundle(String(invite.contract_id));
  if (!bundle.contract) {
    return NextResponse.json({ error: "Contract not found." }, { status: 404 });
  }

  const storagePath = bundle.contract.executedPdfPath || bundle.contract.draftPdfPath;
  if (!storagePath) {
    return NextResponse.json({ error: "PDF is not available yet." }, { status: 404 });
  }

  const signedUrl = await createSignedUrlFromStoragePath(storagePath);
  if (!signedUrl) {
    return NextResponse.json({ error: "Could not create download URL." }, { status: 500 });
  }

  return NextResponse.redirect(signedUrl);
}

