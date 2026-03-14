import { NextResponse } from "next/server";
import { createSignedUrlFromStoragePath, getContractBundle, getSigningViewerContext } from "@/lib/signing/service";

type Context = {
  params: Promise<{
    contractId: string;
  }>;
};

export async function GET(_request: Request, { params }: Context) {
  const { contractId } = await params;
  const viewer = await getSigningViewerContext();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bundle = await getContractBundle(contractId);
  if (!bundle.contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  if (!viewer.isStaff && !viewer.leadIds.includes(bundle.contract.artistLeadId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const storagePath = bundle.contract.executedPdfPath || bundle.contract.draftPdfPath;
  if (!storagePath) {
    return NextResponse.json({ error: "PDF is not available yet." }, { status: 404 });
  }

  const signedUrl = await createSignedUrlFromStoragePath(storagePath);
  if (!signedUrl) {
    return NextResponse.json({ error: "Failed to create download URL." }, { status: 500 });
  }

  return NextResponse.redirect(signedUrl);
}

