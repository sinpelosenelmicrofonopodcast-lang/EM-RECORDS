import { rgb, type PDFFont, type PDFPage } from "pdf-lib";

export const EM_RECORDS_DOCUMENT_BRANDING = {
  companyName: "EM Records LLC",
  logoUrl: "/images/em-logo-white.svg",
  logoRequired: true,
  footerText: "EM Records LLC - Artist Signing System",
  chrome: {
    headerTop: 801,
    headerBottom: 744,
    footerTop: 52
  },
  colors: {
    ink: rgb(0, 0, 0),
    body: rgb(0.1, 0.1, 0.1),
    muted: rgb(0.36, 0.36, 0.36),
    light: rgb(0.9, 0.9, 0.9),
    paper: rgb(1, 1, 1),
    rule: rgb(0.72, 0.72, 0.72),
    badgeFill: rgb(0.94, 0.94, 0.94),
    badgeText: rgb(0.08, 0.08, 0.08)
  }
} as const;

type DrawEmRecordsLogoInput = {
  page: PDFPage;
  serifBold: PDFFont;
  x: number;
  y: number;
  width: number;
  height: number;
};

function drawCenteredText(input: {
  page: PDFPage;
  text: string;
  font: PDFFont;
  x: number;
  y: number;
  width: number;
  size: number;
}): void {
  const textWidth = input.font.widthOfTextAtSize(input.text, input.size);
  input.page.drawText(input.text, {
    x: input.x + Math.max(0, (input.width - textWidth) / 2),
    y: input.y,
    size: input.size,
    font: input.font,
    color: EM_RECORDS_DOCUMENT_BRANDING.colors.ink
  });
}

export function drawEmRecordsPdfLogo(input: DrawEmRecordsLogoInput): void {
  const { page, serifBold, x, y, width, height } = input;
  const innerX = x;
  const innerWidth = width;
  const emSize = Math.min(height * 0.45, width * 0.24);
  const recordsSize = Math.min(height * 0.2, width * 0.085);

  drawCenteredText({
    page,
    text: "EM",
    font: serifBold,
    x: innerX,
    y: y - height * 0.38,
    width: innerWidth,
    size: emSize
  });

  drawCenteredText({
    page,
    text: "RECORDS",
    font: serifBold,
    x: innerX,
    y: y - height * 0.67,
    width: innerWidth,
    size: recordsSize
  });
}
