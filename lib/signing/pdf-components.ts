import { rgb, type PDFDocument, type PDFImage, type PDFFont, type PDFPage } from "pdf-lib";
import { EM_RECORDS_DOCUMENT_BRANDING, drawEmRecordsPdfLogo } from "@/lib/signing/branding";
import type { ContractSigner, SignatureEvent } from "@/lib/signing/types";

export type ContractPdfInput = {
  contractId: string;
  contractTitle: string;
  labelName: string;
  artistLegalName: string;
  artistStageName?: string | null;
  effectiveDate: string;
  renderedMarkdown: string;
  versionNumber: number;
  status: string;
  signers: ContractSigner[];
  events: SignatureEvent[];
  includeDraftWatermark?: boolean;
  language?: string | null;
};

export type ContractBlock = { type: "p" | "li"; text: string };
export type ContractClauseSection = { heading: string; blocks: ContractBlock[] };
export type ParsedContract = { preamble: ContractBlock[]; clauses: ContractClauseSection[] };
export type PdfFonts = {
  body: PDFFont;
  bodyBold: PDFFont;
  ui: PDFFont;
  uiBold: PDFFont;
  uiItalic: PDFFont;
};
export type HeaderMeta = {
  contractTitle: string;
  artistDisplayName: string;
  effectiveDate: string;
  contractId: string;
  versionNumber: number;
  statusLabel: string;
  language: "en" | "es";
};
export type PageCursor = {
  doc: PDFDocument;
  page: PDFPage;
  pageNumber: number;
  y: number;
  fonts: PdfFonts;
  headerMeta: HeaderMeta;
};

type HeaderVariant = "cover" | "body";
type SignatureCard = {
  label: string;
  signerName: string;
  signerEmail: string;
  signedAt: string | null;
  signatureData: string | null;
  isSigned: boolean;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_LEFT = 68;
const MARGIN_RIGHT = 68;
const TOP_RULE_Y = 802;
const HEADER_BOTTOM_Y = 742;
const FOOTER_RULE_Y = 58;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const BOTTOM_MARGIN = 74;
const PARAGRAPH_SIZE = 11.2;
const PARAGRAPH_LINE_HEIGHT = 17.1;
const SECTION_GAP = 18;

const STRINGS = {
  en: {
    parties: "Parties",
    signatures: "Signatures",
    auditTrail: "Audit Trail",
    artist: "Artist",
    effectiveDate: "Effective Date",
    version: "Version",
    contractId: "Contract ID",
    prepared: "Prepared for Signature",
    draft: "Draft",
    fullyExecuted: "Fully Executed",
    pendingFinal: "Pending Final Signature",
    pendingSignature: "Pending electronic signature",
    signedElectronically: "Secure electronic signature recorded.",
    awaitingSignature: "Awaiting secure electronic signature.",
    date: "Date",
    signed: "Signed",
    noEvents: "No signature events recorded yet.",
    page: "Page",
    confidential: "Confidential"
  },
  es: {
    parties: "Partes",
    signatures: "Firmas",
    auditTrail: "Registro de Firma",
    artist: "Artista",
    effectiveDate: "Fecha de Vigencia",
    version: "Version",
    contractId: "ID del Contrato",
    prepared: "Listo para Firma",
    draft: "Borrador",
    fullyExecuted: "Completamente Ejecutado",
    pendingFinal: "Pendiente de Firma Final",
    pendingSignature: "Firma electronica pendiente",
    signedElectronically: "Firma electronica segura registrada.",
    awaitingSignature: "En espera de firma electronica segura.",
    date: "Fecha",
    signed: "Firmado",
    noEvents: "No hay eventos de firma registrados todavia.",
    page: "Pagina",
    confidential: "Confidencial"
  }
} as const;

function localeStrings(language: "en" | "es") {
  return STRINGS[language];
}

function normalizeLanguage(value: string | null | undefined): "en" | "es" {
  return String(value ?? "").trim().toLowerCase().startsWith("es") ? "es" : "en";
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
      continue;
    }

    let remaining = word;
    while (remaining.length > 0) {
      let slice = remaining;
      while (slice.length > 1 && font.widthOfTextAtSize(slice, size) > maxWidth) {
        slice = slice.slice(0, -1);
      }
      lines.push(slice);
      remaining = remaining.slice(slice.length);
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function fitTextSize(text: string, font: PDFFont, width: number, preferred: number, minimum: number): number {
  let size = preferred;
  while (size > minimum && font.widthOfTextAtSize(text, size) > width) {
    size -= 0.2;
  }
  return size;
}

function formatDisplayDate(value: string | null | undefined, language: "en" | "es"): string {
  const normalized = String(value ?? "").trim();
  if (!normalized) return language === "es" ? "Fecha pendiente" : "Pending date";

  const parsed = new Date(`${normalized}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return normalized;

  return parsed.toLocaleDateString(language === "es" ? "es-US" : "en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}

function formatTimestamp(value: string | null | undefined, language: "en" | "es"): string | null {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return normalized;

  return parsed.toLocaleString(language === "es" ? "es-US" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short"
  });
}

function createBadge(page: PDFPage, fonts: PdfFonts, label: string, x: number, y: number): number {
  const width = measureBadgeWidth(fonts.uiBold, label);
  page.drawRectangle({
    x,
    y,
    width,
    height: 18,
    color: EM_RECORDS_DOCUMENT_BRANDING.colors.badgeFill,
    borderColor: EM_RECORDS_DOCUMENT_BRANDING.colors.rule,
    borderWidth: 0.8
  });
  page.drawText(label.toUpperCase(), {
    x: x + 10,
    y: y + 5.3,
    size: 8.4,
    font: fonts.uiBold,
    color: EM_RECORDS_DOCUMENT_BRANDING.colors.badgeText
  });
  return width;
}

function measureBadgeWidth(font: PDFFont, label: string): number {
  return Math.max(94, font.widthOfTextAtSize(label, 8.4) + 20);
}

function parseClauseHeading(heading: string): { number: string | null; title: string } {
  const match = heading.match(/^(\d+)\.\s+(.*)$/);
  if (!match) return { number: null, title: heading };
  return { number: match[1], title: match[2] };
}

export function parseContractMarkdown(markdown: string): ParsedContract {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const preamble: ContractBlock[] = [];
  const clauses: ContractClauseSection[] = [];
  let currentClause: ContractClauseSection | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("# ")) continue;

    if (line.startsWith("## ")) {
      const heading = line.slice(3).trim();
      const normalized = heading.toUpperCase();
      if (normalized === "EM RECORDS LLC") continue;
      if (normalized === "SIGNATURES" || normalized === "FIRMAS") break;
      currentClause = { heading, blocks: [] };
      clauses.push(currentClause);
      continue;
    }

    const block: ContractBlock = line.startsWith("- ")
      ? { type: "li", text: line.slice(2).trim() }
      : { type: "p", text: line };

    if (currentClause) currentClause.blocks.push(block);
    else preamble.push(block);
  }

  return { preamble, clauses };
}

export function createHeaderMeta(input: ContractPdfInput): HeaderMeta {
  const language = normalizeLanguage(input.language);
  const strings = localeStrings(language);
  const normalizedStatus = input.status.trim().toLowerCase();
  const showDraft = Boolean(input.includeDraftWatermark) || normalizedStatus === "draft";
  const artistDisplayName = input.artistStageName?.trim()
    ? `${input.artistStageName.trim()} (${input.artistLegalName})`
    : input.artistLegalName;

  let statusLabel: string = strings.prepared;
  if (normalizedStatus === "fully_executed") statusLabel = strings.fullyExecuted;
  else if (normalizedStatus === "artist_signed" || normalizedStatus === "label_counter_signed") statusLabel = strings.pendingFinal;
  else if (showDraft) statusLabel = strings.draft;

  return {
    contractTitle: input.contractTitle,
    artistDisplayName,
    effectiveDate: formatDisplayDate(input.effectiveDate, language),
    contractId: input.contractId,
    versionNumber: input.versionNumber,
    statusLabel,
    language
  };
}

function createPage(doc: PDFDocument): PDFPage {
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: EM_RECORDS_DOCUMENT_BRANDING.colors.paper
  });
  return page;
}

function drawRightText(page: PDFPage, text: string, font: PDFFont, size: number, rightX: number, y: number, color: ReturnType<typeof rgb>): void {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: rightX - width,
    y,
    size,
    font,
    color
  });
}

function drawMetaPair(page: PDFPage, fonts: PdfFonts, label: string, value: string, x: number, y: number, width: number): void {
  page.drawText(label.toUpperCase(), {
    x,
    y,
    size: 7.3,
    font: fonts.uiBold,
    color: EM_RECORDS_DOCUMENT_BRANDING.colors.muted
  });
  const size = fitTextSize(value, fonts.ui, width, 9.5, 7.3);
  const lines = wrapText(value, fonts.ui, size, width);
  let lineY = y - 12;
  for (const line of lines.slice(0, 2)) {
    page.drawText(line, {
      x,
      y: lineY,
      size,
      font: fonts.ui,
      color: EM_RECORDS_DOCUMENT_BRANDING.colors.body
    });
    lineY -= 11;
  }
}

export function drawContractHeader(cursor: PageCursor, variant: HeaderVariant): void {
  const { page, fonts, headerMeta } = cursor;
  const strings = localeStrings(headerMeta.language);
  page.drawLine({
    start: { x: MARGIN_LEFT, y: TOP_RULE_Y },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: TOP_RULE_Y },
    thickness: 0.8,
    color: EM_RECORDS_DOCUMENT_BRANDING.colors.rule
  });

  drawEmRecordsPdfLogo({
    page,
    serifBold: fonts.bodyBold,
    x: MARGIN_LEFT,
    y: 792,
    width: 74,
    height: 28
  });

  const idText = `${strings.contractId}: ${headerMeta.contractId}`;
  const idSize = fitTextSize(idText, fonts.ui, 188, 8.1, 6.8);
  drawRightText(page, idText, fonts.ui, idSize, PAGE_WIDTH - MARGIN_RIGHT, 785, EM_RECORDS_DOCUMENT_BRANDING.colors.muted);

  page.drawText(EM_RECORDS_DOCUMENT_BRANDING.companyName.toUpperCase(), {
    x: MARGIN_LEFT + 86,
    y: 785,
    size: 8,
    font: fonts.uiBold,
    color: EM_RECORDS_DOCUMENT_BRANDING.colors.muted
  });

  const badgeWidth = measureBadgeWidth(fonts.uiBold, headerMeta.statusLabel);
  createBadge(page, fonts, headerMeta.statusLabel, PAGE_WIDTH - MARGIN_RIGHT - badgeWidth, 766);

  if (variant === "cover") {
    const coverTitle = headerMeta.contractTitle.toUpperCase();
    const coverTitleSize = fitTextSize(coverTitle, fonts.uiBold, CONTENT_WIDTH, 18, 14);
    page.drawText(coverTitle, {
      x: MARGIN_LEFT,
      y: 713,
      size: coverTitleSize,
      font: fonts.uiBold,
      color: EM_RECORDS_DOCUMENT_BRANDING.colors.ink
    });

    page.drawText(headerMeta.artistDisplayName, {
      x: MARGIN_LEFT,
      y: 695,
      size: 10.6,
      font: fonts.ui,
      color: EM_RECORDS_DOCUMENT_BRANDING.colors.body
    });

    page.drawLine({
      start: { x: MARGIN_LEFT, y: 676 },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: 676 },
      thickness: 0.8,
      color: EM_RECORDS_DOCUMENT_BRANDING.colors.rule
    });

    drawMetaPair(page, fonts, strings.artist, headerMeta.artistDisplayName, MARGIN_LEFT, 660, 160);
    drawMetaPair(page, fonts, strings.effectiveDate, headerMeta.effectiveDate, MARGIN_LEFT + 176, 660, 110);
    drawMetaPair(page, fonts, strings.version, `v${headerMeta.versionNumber}`, MARGIN_LEFT + 300, 660, 50);
    drawMetaPair(page, fonts, strings.contractId, headerMeta.contractId, MARGIN_LEFT + 364, 660, 162);

    page.drawLine({
      start: { x: MARGIN_LEFT, y: 624 },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: 624 },
      thickness: 0.8,
      color: EM_RECORDS_DOCUMENT_BRANDING.colors.rule
    });

    cursor.y = 614;
    return;
  }

  const bodyTitle = headerMeta.contractTitle.toUpperCase();
  const bodyTitleSize = fitTextSize(bodyTitle, fonts.uiBold, 210, 10, 8.4);
  page.drawText(bodyTitle, {
    x: MARGIN_LEFT + 86,
    y: 770,
    size: bodyTitleSize,
    font: fonts.uiBold,
    color: EM_RECORDS_DOCUMENT_BRANDING.colors.ink
  });

  page.drawLine({
    start: { x: MARGIN_LEFT, y: HEADER_BOTTOM_Y },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: HEADER_BOTTOM_Y },
    thickness: 0.8,
    color: EM_RECORDS_DOCUMENT_BRANDING.colors.rule
  });

  cursor.y = 724;
}

export function createCursor(doc: PDFDocument, fonts: PdfFonts, headerMeta: HeaderMeta): PageCursor {
  const page = createPage(doc);
  const cursor: PageCursor = {
    doc,
    page,
    pageNumber: 1,
    y: 602,
    fonts,
    headerMeta
  };
  drawContractHeader(cursor, "cover");
  return cursor;
}

export function advanceToNewPage(cursor: PageCursor): void {
  cursor.pageNumber += 1;
  cursor.page = createPage(cursor.doc);
  drawContractHeader(cursor, "body");
}

export function ensureSpace(cursor: PageCursor, neededHeight: number): void {
  if (cursor.y - neededHeight >= BOTTOM_MARGIN) return;
  advanceToNewPage(cursor);
}

export function drawTextBlock(
  cursor: PageCursor,
  text: string,
  options: {
    font: PDFFont;
    size: number;
    x?: number;
    width?: number;
    lineHeight?: number;
    color?: ReturnType<typeof rgb>;
  }
): void {
  const x = options.x ?? MARGIN_LEFT;
  const width = options.width ?? CONTENT_WIDTH;
  const size = options.size;
  const color = options.color ?? EM_RECORDS_DOCUMENT_BRANDING.colors.body;
  const lineHeight = options.lineHeight ?? size * 1.42;
  const lines = wrapText(text, options.font, size, width);
  ensureSpace(cursor, lines.length * lineHeight);

  for (const line of lines) {
    cursor.page.drawText(line, {
      x,
      y: cursor.y,
      size,
      font: options.font,
      color
    });
    cursor.y -= lineHeight;
  }
}

function drawSectionHeading(cursor: PageCursor, heading: string): void {
  const { number, title } = parseClauseHeading(heading);
  ensureSpace(cursor, 32);
  const label = number ? `${number}. ${title.toUpperCase()}` : title.toUpperCase();
  const labelSize = fitTextSize(label, cursor.fonts.uiBold, CONTENT_WIDTH, 10.6, 8.4);
  cursor.page.drawText(label, {
    x: MARGIN_LEFT,
    y: cursor.y,
    size: labelSize,
    font: cursor.fonts.uiBold,
    color: EM_RECORDS_DOCUMENT_BRANDING.colors.ink
  });
  cursor.page.drawLine({
    start: { x: MARGIN_LEFT, y: cursor.y - 6 },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: cursor.y - 6 },
    thickness: 0.8,
    color: EM_RECORDS_DOCUMENT_BRANDING.colors.rule
  });
  cursor.y -= 20;
}

function drawListItem(cursor: PageCursor, text: string): void {
  ensureSpace(cursor, 18);
  cursor.page.drawText("-", {
    x: MARGIN_LEFT,
    y: cursor.y,
    size: PARAGRAPH_SIZE,
    font: cursor.fonts.body,
    color: EM_RECORDS_DOCUMENT_BRANDING.colors.body
  });
  drawTextBlock(cursor, text, {
    font: cursor.fonts.body,
    size: PARAGRAPH_SIZE,
    x: MARGIN_LEFT + 12,
    width: CONTENT_WIDTH - 12,
    lineHeight: PARAGRAPH_LINE_HEIGHT
  });
}

export function drawContractSection(cursor: PageCursor, title: string, blocks: ContractBlock[]): void {
  drawSectionHeading(cursor, title);
  for (const block of blocks) {
    if (block.type === "li") {
      drawListItem(cursor, block.text);
      cursor.y -= 2;
      continue;
    }
    drawTextBlock(cursor, block.text, {
      font: cursor.fonts.body,
      size: PARAGRAPH_SIZE,
      lineHeight: PARAGRAPH_LINE_HEIGHT
    });
    cursor.y -= 6;
  }
  cursor.y -= 8;
}

function buildSignatureCard(input: ContractPdfInput, signer: ContractSigner | undefined, role: "artist" | "label"): SignatureCard {
  if (role === "artist") {
    return {
      label: normalizeLanguage(input.language) === "es" ? "ARTISTA" : "ARTIST",
      signerName: signer?.signerName?.trim() || input.artistLegalName,
      signerEmail: signer?.signerEmail?.trim() || "",
      signedAt: signer?.signedAt ?? null,
      signatureData: signer?.signatureData ?? null,
      isSigned: Boolean(signer?.signedAt && signer?.signatureData)
    };
  }

  return {
    label: normalizeLanguage(input.language) === "es" ? "SELLO" : "LABEL",
    signerName: signer?.signerName?.trim() || input.labelName,
    signerEmail: signer?.signerEmail?.trim() || "",
    signedAt: signer?.signedAt ?? null,
    signatureData: signer?.signatureData ?? null,
    isSigned: Boolean(signer?.signedAt && signer?.signatureData)
  };
}

async function embedSignatureImage(doc: PDFDocument, signatureData: string | null | undefined): Promise<PDFImage | null> {
  if (!signatureData || !signatureData.startsWith("data:image/")) return null;
  const [meta, payload] = signatureData.split(",", 2);
  if (!meta || !payload) return null;

  try {
    const bytes = Buffer.from(payload, "base64");
    if (meta.includes("image/jpeg") || meta.includes("image/jpg")) return doc.embedJpg(bytes);
    return doc.embedPng(bytes);
  } catch {
    return null;
  }
}

export async function drawSignatureBlock(cursor: PageCursor, input: ContractPdfInput): Promise<void> {
  const language = normalizeLanguage(input.language);
  const strings = localeStrings(language);
  const cards = [
    buildSignatureCard(input, input.signers.find((signer) => signer.signerRole === "label"), "label"),
    buildSignatureCard(input, input.signers.find((signer) => signer.signerRole === "artist"), "artist")
  ];

  drawSectionHeading(cursor, strings.signatures);

  for (const card of cards) {
    const boxHeight = 108;
    const signaturePanelWidth = 160;
    ensureSpace(cursor, boxHeight + 12);
    const boxY = cursor.y - boxHeight;

    cursor.page.drawRectangle({
      x: MARGIN_LEFT,
      y: boxY,
      width: CONTENT_WIDTH,
      height: boxHeight,
      color: EM_RECORDS_DOCUMENT_BRANDING.colors.paper,
      borderColor: EM_RECORDS_DOCUMENT_BRANDING.colors.rule,
      borderWidth: 0.8
    });

    cursor.page.drawText(card.label, {
      x: MARGIN_LEFT + 12,
      y: boxY + 84,
      size: 9,
      font: cursor.fonts.uiBold,
      color: EM_RECORDS_DOCUMENT_BRANDING.colors.ink
    });

    cursor.page.drawText(card.signerName, {
      x: MARGIN_LEFT + 12,
      y: boxY + 66,
      size: 11.2,
      font: cursor.fonts.uiBold,
      color: EM_RECORDS_DOCUMENT_BRANDING.colors.body
    });

    if (card.signerEmail) {
      cursor.page.drawText(card.signerEmail, {
        x: MARGIN_LEFT + 12,
        y: boxY + 52,
        size: 8.8,
        font: cursor.fonts.ui,
        color: EM_RECORDS_DOCUMENT_BRANDING.colors.muted
      });
    }

    cursor.page.drawText(card.isSigned ? strings.signedElectronically : strings.awaitingSignature, {
      x: MARGIN_LEFT + 12,
      y: boxY + 26,
      size: 8.8,
      font: cursor.fonts.uiItalic,
      color: EM_RECORDS_DOCUMENT_BRANDING.colors.muted
    });

    const dateLabel = card.signedAt
      ? `${strings.signed}: ${formatTimestamp(card.signedAt, language)}`
      : `${strings.date}: ____________________________`;
    cursor.page.drawText(dateLabel, {
      x: MARGIN_LEFT + 12,
      y: boxY + 12,
      size: 8.8,
      font: cursor.fonts.ui,
      color: EM_RECORDS_DOCUMENT_BRANDING.colors.muted
    });

    const panelX = PAGE_WIDTH - MARGIN_RIGHT - signaturePanelWidth;
    cursor.page.drawRectangle({
      x: panelX,
      y: boxY + 18,
      width: signaturePanelWidth,
      height: 52,
      color: EM_RECORDS_DOCUMENT_BRANDING.colors.paper,
      borderColor: EM_RECORDS_DOCUMENT_BRANDING.colors.rule,
      borderWidth: 0.8
    });
    cursor.page.drawLine({
      start: { x: panelX + 10, y: boxY + 28 },
      end: { x: panelX + signaturePanelWidth - 10, y: boxY + 28 },
      thickness: 0.8,
      color: EM_RECORDS_DOCUMENT_BRANDING.colors.rule
    });

    const image = await embedSignatureImage(cursor.doc, card.signatureData);
    if (image) {
      const maxWidth = signaturePanelWidth - 24;
      const maxHeight = 28;
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
      cursor.page.drawImage(image, {
        x: panelX + (signaturePanelWidth - image.width * scale) / 2,
        y: boxY + 32,
        width: image.width * scale,
        height: image.height * scale
      });
    } else {
      const placeholder = strings.pendingSignature;
      const size = fitTextSize(placeholder, cursor.fonts.uiItalic, signaturePanelWidth - 20, 8.6, 7.1);
      cursor.page.drawText(placeholder, {
        x: panelX + (signaturePanelWidth - cursor.fonts.uiItalic.widthOfTextAtSize(placeholder, size)) / 2,
        y: boxY + 42,
        size,
        font: cursor.fonts.uiItalic,
        color: EM_RECORDS_DOCUMENT_BRANDING.colors.muted
      });
    }

    cursor.y = boxY - 14;
  }
}

export function drawAuditTrailBlock(cursor: PageCursor, events: SignatureEvent[]): void {
  const language = cursor.headerMeta.language;
  const strings = localeStrings(language);
  drawSectionHeading(cursor, strings.auditTrail);

  if (events.length === 0) {
    ensureSpace(cursor, 32);
    cursor.page.drawText(strings.noEvents, {
      x: MARGIN_LEFT,
      y: cursor.y,
      size: 9.2,
      font: cursor.fonts.uiItalic,
      color: EM_RECORDS_DOCUMENT_BRANDING.colors.muted
    });
    cursor.y -= 22;
    return;
  }

  const rows = [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const event of rows) {
    ensureSpace(cursor, 28);
    const rowY = cursor.y - 18;

    cursor.page.drawRectangle({
      x: MARGIN_LEFT,
      y: rowY,
      width: CONTENT_WIDTH,
      height: 22,
      color: EM_RECORDS_DOCUMENT_BRANDING.colors.paper,
      borderColor: EM_RECORDS_DOCUMENT_BRANDING.colors.light,
      borderWidth: 0.6
    });

    const timestamp = formatTimestamp(event.createdAt, language) ?? event.createdAt;
    const eventLabel = event.eventType.replaceAll("_", " ");
    const detailText = [event.signerRole ? event.signerRole.toUpperCase() : "", event.ipAddress ? `IP ${event.ipAddress}` : "IP -"]
      .filter(Boolean)
      .join(" | ");

    cursor.page.drawText(timestamp, {
      x: MARGIN_LEFT + 8,
      y: rowY + 8,
      size: 7.7,
      font: cursor.fonts.ui,
      color: EM_RECORDS_DOCUMENT_BRANDING.colors.body
    });

    cursor.page.drawText(eventLabel, {
      x: MARGIN_LEFT + 165,
      y: rowY + 8,
      size: 7.7,
      font: cursor.fonts.ui,
      color: EM_RECORDS_DOCUMENT_BRANDING.colors.body
    });

    const detailSize = fitTextSize(detailText, cursor.fonts.ui, 132, 7.7, 6.7);
    cursor.page.drawText(detailText, {
      x: PAGE_WIDTH - MARGIN_RIGHT - 132,
      y: rowY + 8,
      size: detailSize,
      font: cursor.fonts.ui,
      color: EM_RECORDS_DOCUMENT_BRANDING.colors.muted
    });

    cursor.y = rowY - 8;
  }
}

export function drawContractFooter(doc: PDFDocument, fonts: PdfFonts, headerMeta: HeaderMeta): void {
  const strings = localeStrings(headerMeta.language);
  const pages = doc.getPages();

  pages.forEach((page, index) => {
    page.drawLine({
      start: { x: MARGIN_LEFT, y: FOOTER_RULE_Y },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: FOOTER_RULE_Y },
      thickness: 0.8,
      color: EM_RECORDS_DOCUMENT_BRANDING.colors.rule
    });

    page.drawText(EM_RECORDS_DOCUMENT_BRANDING.companyName, {
      x: MARGIN_LEFT,
      y: 40,
      size: 8,
      font: fonts.ui,
      color: EM_RECORDS_DOCUMENT_BRANDING.colors.muted
    });

    const centerLabel = `${headerMeta.contractTitle} - ${strings.confidential}`;
    const centerWidth = fonts.ui.widthOfTextAtSize(centerLabel, 8);
    page.drawText(centerLabel, {
      x: (PAGE_WIDTH - centerWidth) / 2,
      y: 40,
      size: 8,
      font: fonts.ui,
      color: EM_RECORDS_DOCUMENT_BRANDING.colors.muted
    });

    const pageLabel = `${strings.page} ${index + 1} of ${pages.length}`;
    const pageWidth = fonts.ui.widthOfTextAtSize(pageLabel, 8);
    page.drawText(pageLabel, {
      x: PAGE_WIDTH - MARGIN_RIGHT - pageWidth,
      y: 40,
      size: 8,
      font: fonts.ui,
      color: EM_RECORDS_DOCUMENT_BRANDING.colors.muted
    });
  });
}

export const PDF_LAYOUT = {
  SECTION_GAP
} as const;
