import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  PDF_LAYOUT,
  createCursor,
  createHeaderMeta,
  drawAuditTrailBlock,
  drawContractFooter,
  drawContractSection,
  drawSignatureBlock,
  parseContractMarkdown,
  type ContractPdfInput,
  type PdfFonts
} from "@/lib/signing/pdf-components";

export async function buildContractPdf(input: ContractPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fonts: PdfFonts = {
    body: await doc.embedFont(StandardFonts.TimesRoman),
    bodyBold: await doc.embedFont(StandardFonts.TimesRomanBold),
    ui: await doc.embedFont(StandardFonts.Helvetica),
    uiBold: await doc.embedFont(StandardFonts.HelveticaBold),
    uiItalic: await doc.embedFont(StandardFonts.HelveticaOblique)
  };

  const headerMeta = createHeaderMeta(input);
  const cursor = createCursor(doc, fonts, headerMeta);
  const parsed = parseContractMarkdown(input.renderedMarkdown);
  const partiesHeading = headerMeta.language === "es" ? "Partes" : "Parties";

  if (parsed.preamble.length > 0) {
    drawContractSection(cursor, partiesHeading, parsed.preamble);
  }

  for (const clause of parsed.clauses) {
    drawContractSection(cursor, clause.heading, clause.blocks);
  }

  cursor.y -= PDF_LAYOUT.SECTION_GAP;
  await drawSignatureBlock(cursor, input);
  cursor.y -= 8;
  drawAuditTrailBlock(cursor, input.events);

  drawContractFooter(doc, fonts, headerMeta);
  return doc.save();
}
