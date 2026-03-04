import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

export type MediaKitPdfInput = {
  artistName: string;
  stageName?: string | null;
  headline?: string | null;
  oneLiner?: string | null;
  bioShort?: string | null;
  bioMed?: string | null;
  stats?: Record<string, unknown>;
  links?: Record<string, unknown>;
  contacts?: Record<string, unknown>;
  featuredTracks?: Array<{ title: string; artist?: string | null; date?: string | null }>;
  pressQuotes?: string[];
  highlights?: string[];
  photoUrls?: string[];
  smartlink?: string | null;
};

export type ArtistReportPdfInput = {
  artistName: string;
  month: string;
  releaseCount: number;
  bookingSummary: {
    total: number;
    confirmed: number;
    pipeline: number;
  };
  tasks: {
    done: number;
    pending: number;
  };
  registrations: Array<{ song: string; org: string; status: string }>;
  readyScoreAverage: number;
  topAssets: Array<{ label: string; downloads: number }>;
  smartlinks: Array<{ title: string; url: string }>;
};

const PAGE = {
  width: 842,
  height: 595,
  margin: 42
};

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const arr = await response.arrayBuffer();
    return Buffer.from(arr);
  } catch {
    return null;
  }
}

async function tryDrawImage(
  doc: PDFDocument,
  page: any,
  url: string,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<boolean> {
  const imageBuffer = await fetchImageBuffer(url);
  if (!imageBuffer) return false;

  try {
    const isPng = url.toLowerCase().includes(".png") || imageBuffer.slice(1, 4).toString("ascii") === "PNG";
    const embedded = isPng ? await doc.embedPng(imageBuffer) : await doc.embedJpg(imageBuffer);
    const ratio = embedded.width / embedded.height;

    let drawWidth = width;
    let drawHeight = width / ratio;
    if (drawHeight > height) {
      drawHeight = height;
      drawWidth = height * ratio;
    }

    page.drawImage(embedded, {
      x: x + (width - drawWidth) / 2,
      y: y + (height - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight
    });

    return true;
  } catch {
    return false;
  }
}

function drawHeading(page: any, font: any, text: string, y: number): number {
  page.drawText(text, {
    x: PAGE.margin,
    y,
    size: 28,
    font,
    color: rgb(0.96, 0.96, 0.96)
  });

  return y - 34;
}

function drawLabelValue(page: any, fontBold: any, fontRegular: any, x: number, y: number, label: string, value: string): number {
  page.drawText(label, {
    x,
    y,
    size: 10,
    font: fontBold,
    color: rgb(0.78, 0.66, 0.36)
  });
  page.drawText(value || "-", {
    x,
    y: y - 14,
    size: 12,
    font: fontRegular,
    color: rgb(0.94, 0.94, 0.94)
  });

  return y - 32;
}

function valueToString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

export async function buildMediaKitPdf(input: MediaKitPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const cover = doc.addPage([PAGE.width, PAGE.height]);
  cover.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE.width,
    height: PAGE.height,
    color: rgb(0.03, 0.03, 0.04)
  });

  cover.drawRectangle({
    x: PAGE.margin,
    y: PAGE.height - PAGE.margin - 2,
    width: PAGE.width - PAGE.margin * 2,
    height: 2,
    color: rgb(0.78, 0.66, 0.36)
  });

  cover.drawText("EM RECORDS LLC", {
    x: PAGE.margin,
    y: PAGE.height - PAGE.margin + 8,
    size: 11,
    font: fontBold,
    color: rgb(0.78, 0.66, 0.36)
  });

  const artistDisplay = input.stageName?.trim() || input.artistName;
  cover.drawText(artistDisplay, {
    x: PAGE.margin,
    y: PAGE.height - 140,
    size: 50,
    font: fontBold,
    color: rgb(0.98, 0.98, 0.98)
  });

  cover.drawText(input.oneLiner || input.headline || "Don’t chase the wave. Create it.", {
    x: PAGE.margin,
    y: PAGE.height - 180,
    size: 16,
    font: fontRegular,
    color: rgb(0.9, 0.9, 0.9)
  });

  if (input.photoUrls?.length) {
    cover.drawRectangle({
      x: PAGE.width - 320,
      y: 120,
      width: 260,
      height: 360,
      borderColor: rgb(0.2, 0.2, 0.2),
      borderWidth: 1
    });

    await tryDrawImage(doc, cover, input.photoUrls[0], PAGE.width - 320, 120, 260, 360);
  }

  if (input.smartlink) {
    try {
      const qrDataUrl = await QRCode.toDataURL(input.smartlink, {
        errorCorrectionLevel: "M",
        margin: 1,
        color: {
          dark: "#C6A85B",
          light: "#000000"
        }
      });

      const png = Buffer.from(qrDataUrl.split(",")[1] ?? "", "base64");
      const qrImage = await doc.embedPng(png);
      cover.drawImage(qrImage, {
        x: PAGE.margin,
        y: 100,
        width: 110,
        height: 110
      });
      cover.drawText("SmartLink", {
        x: PAGE.margin,
        y: 84,
        size: 10,
        font: fontBold,
        color: rgb(0.78, 0.66, 0.36)
      });
      cover.drawText(input.smartlink, {
        x: PAGE.margin,
        y: 68,
        size: 8,
        font: fontRegular,
        color: rgb(0.8, 0.8, 0.8)
      });
    } catch {
      // keep PDF generation resilient when QR fails
    }
  }

  const detailsPage = doc.addPage([PAGE.width, PAGE.height]);
  detailsPage.drawRectangle({ x: 0, y: 0, width: PAGE.width, height: PAGE.height, color: rgb(0.02, 0.02, 0.03) });

  let y = PAGE.height - PAGE.margin;
  y = drawHeading(detailsPage, fontBold, "Bio", y);

  const bioText = input.bioMed || input.bioShort || "Bio pending.";
  const maxBioLines = 9;
  const words = bioText.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > 120) {
      lines.push(current);
      current = word;
      if (lines.length >= maxBioLines) break;
    } else {
      current = next;
    }
  }
  if (current && lines.length < maxBioLines) lines.push(current);

  lines.forEach((line) => {
    detailsPage.drawText(line, {
      x: PAGE.margin,
      y,
      size: 12,
      font: fontRegular,
      color: rgb(0.9, 0.9, 0.9)
    });
    y -= 18;
  });

  y -= 16;
  y = drawHeading(detailsPage, fontBold, "Stats & Links", y);

  const stats = input.stats ?? {};
  const statEntries = Object.entries(stats).slice(0, 6);
  let statsY = y;
  for (const [label, value] of statEntries) {
    statsY = drawLabelValue(detailsPage, fontBold, fontRegular, PAGE.margin, statsY, label.toUpperCase(), valueToString(value));
  }

  const links = input.links ?? {};
  let linksY = y;
  let linkIdx = 0;
  for (const [label, url] of Object.entries(links)) {
    if (linkIdx >= 6) break;
    linksY = drawLabelValue(detailsPage, fontBold, fontRegular, PAGE.margin + 300, linksY, label.toUpperCase(), valueToString(url));
    linkIdx += 1;
  }

  const tracksPage = doc.addPage([PAGE.width, PAGE.height]);
  tracksPage.drawRectangle({ x: 0, y: 0, width: PAGE.width, height: PAGE.height, color: rgb(0.03, 0.03, 0.04) });

  let trackY = PAGE.height - PAGE.margin;
  trackY = drawHeading(tracksPage, fontBold, "Featured Music", trackY);

  const tracks = input.featuredTracks?.slice(0, 3) ?? [];
  if (tracks.length === 0) {
    tracksPage.drawText("No featured tracks selected yet.", {
      x: PAGE.margin,
      y: trackY,
      size: 12,
      font: fontRegular,
      color: rgb(0.82, 0.82, 0.82)
    });
  } else {
    tracks.forEach((track, index) => {
      const boxY = trackY - index * 120;
      tracksPage.drawRectangle({
        x: PAGE.margin,
        y: boxY - 86,
        width: PAGE.width - PAGE.margin * 2,
        height: 92,
        borderWidth: 1,
        borderColor: rgb(0.2, 0.2, 0.2),
        color: rgb(0.06, 0.06, 0.07)
      });

      tracksPage.drawText(track.title, {
        x: PAGE.margin + 18,
        y: boxY - 18,
        size: 18,
        font: fontBold,
        color: rgb(0.96, 0.96, 0.96)
      });

      tracksPage.drawText(track.artist || artistDisplay, {
        x: PAGE.margin + 18,
        y: boxY - 40,
        size: 12,
        font: fontRegular,
        color: rgb(0.84, 0.84, 0.84)
      });

      if (track.date) {
        tracksPage.drawText(track.date, {
          x: PAGE.margin + 18,
          y: boxY - 58,
          size: 10,
          font: fontRegular,
          color: rgb(0.7, 0.7, 0.7)
        });
      }
    });
  }

  const contactsPage = doc.addPage([PAGE.width, PAGE.height]);
  contactsPage.drawRectangle({ x: 0, y: 0, width: PAGE.width, height: PAGE.height, color: rgb(0.02, 0.02, 0.03) });

  let contactY = PAGE.height - PAGE.margin;
  contactY = drawHeading(contactsPage, fontBold, "Contacts & Press", contactY);

  const contacts = input.contacts ?? {};
  if (Object.keys(contacts).length === 0) {
    contactsPage.drawText("No contact data configured.", {
      x: PAGE.margin,
      y: contactY,
      size: 12,
      font: fontRegular,
      color: rgb(0.84, 0.84, 0.84)
    });
  } else {
    Object.entries(contacts)
      .slice(0, 8)
      .forEach(([label, value], index) => {
        const yPos = contactY - index * 26;
        contactsPage.drawText(`${label}:`, {
          x: PAGE.margin,
          y: yPos,
          size: 11,
          font: fontBold,
          color: rgb(0.78, 0.66, 0.36)
        });
        contactsPage.drawText(valueToString(value), {
          x: PAGE.margin + 120,
          y: yPos,
          size: 11,
          font: fontRegular,
          color: rgb(0.92, 0.92, 0.92)
        });
      });
  }

  let quoteY = contactY - 240;
  contactsPage.drawText("Press Quotes", {
    x: PAGE.margin,
    y: quoteY,
    size: 16,
    font: fontBold,
    color: rgb(0.96, 0.96, 0.96)
  });
  quoteY -= 24;

  const quotes = input.pressQuotes?.slice(0, 4) ?? [];
  if (quotes.length === 0) {
    contactsPage.drawText("No press quotes yet.", {
      x: PAGE.margin,
      y: quoteY,
      size: 11,
      font: fontRegular,
      color: rgb(0.74, 0.74, 0.74)
    });
  } else {
    quotes.forEach((quote) => {
      contactsPage.drawText(`“${quote}”`, {
        x: PAGE.margin,
        y: quoteY,
        size: 11,
        font: fontRegular,
        color: rgb(0.84, 0.84, 0.84)
      });
      quoteY -= 18;
    });
  }

  const highlights = input.highlights?.slice(0, 5) ?? [];
  if (highlights.length > 0) {
    let hy = 120;
    contactsPage.drawText("Highlights", {
      x: PAGE.margin,
      y: hy,
      size: 14,
      font: fontBold,
      color: rgb(0.96, 0.96, 0.96)
    });
    hy -= 20;
    highlights.forEach((item) => {
      contactsPage.drawText(`• ${item}`, {
        x: PAGE.margin,
        y: hy,
        size: 11,
        font: fontRegular,
        color: rgb(0.86, 0.86, 0.86)
      });
      hy -= 16;
    });
  }

  return doc.save();
}

export async function buildArtistReportPdf(input: ArtistReportPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.addPage([PAGE.width, PAGE.height]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE.width, height: PAGE.height, color: rgb(0.02, 0.02, 0.03) });

  page.drawText("EM RECORDS — ARTIST REPORT", {
    x: PAGE.margin,
    y: PAGE.height - PAGE.margin,
    size: 12,
    font: fontBold,
    color: rgb(0.78, 0.66, 0.36)
  });

  page.drawText(input.artistName, {
    x: PAGE.margin,
    y: PAGE.height - PAGE.margin - 40,
    size: 34,
    font: fontBold,
    color: rgb(0.96, 0.96, 0.96)
  });

  page.drawText(`Month: ${input.month}`, {
    x: PAGE.margin,
    y: PAGE.height - PAGE.margin - 64,
    size: 14,
    font: fontRegular,
    color: rgb(0.84, 0.84, 0.84)
  });

  const cards = [
    ["New releases", String(input.releaseCount)],
    ["Bookings", String(input.bookingSummary.total)],
    ["Confirmed shows", String(input.bookingSummary.confirmed)],
    ["Pipeline", String(input.bookingSummary.pipeline)],
    ["Tasks done", String(input.tasks.done)],
    ["Tasks pending", String(input.tasks.pending)],
    ["Ready score avg", `${input.readyScoreAverage}%`]
  ] as const;

  let cardX = PAGE.margin;
  let cardY = PAGE.height - 150;
  cards.forEach(([label, value], index) => {
    if (index > 0 && index % 3 === 0) {
      cardX = PAGE.margin;
      cardY -= 110;
    }

    page.drawRectangle({
      x: cardX,
      y: cardY,
      width: 230,
      height: 86,
      color: rgb(0.06, 0.06, 0.07),
      borderColor: rgb(0.16, 0.16, 0.16),
      borderWidth: 1
    });

    page.drawText(label, {
      x: cardX + 12,
      y: cardY + 60,
      size: 10,
      font: fontRegular,
      color: rgb(0.78, 0.66, 0.36)
    });

    page.drawText(value, {
      x: cardX + 12,
      y: cardY + 26,
      size: 28,
      font: fontBold,
      color: rgb(0.95, 0.95, 0.95)
    });

    cardX += 248;
  });

  const page2 = doc.addPage([PAGE.width, PAGE.height]);
  page2.drawRectangle({ x: 0, y: 0, width: PAGE.width, height: PAGE.height, color: rgb(0.03, 0.03, 0.04) });

  let y = PAGE.height - PAGE.margin;
  y = drawHeading(page2, fontBold, "Registration Status", y);

  if (input.registrations.length === 0) {
    page2.drawText("No registration items this month.", {
      x: PAGE.margin,
      y,
      size: 12,
      font: fontRegular,
      color: rgb(0.82, 0.82, 0.82)
    });
    y -= 26;
  } else {
    input.registrations.slice(0, 18).forEach((row) => {
      page2.drawText(`${row.song} — ${row.org.toUpperCase()} — ${row.status}`, {
        x: PAGE.margin,
        y,
        size: 11,
        font: fontRegular,
        color: rgb(0.88, 0.88, 0.88)
      });
      y -= 16;
    });
  }

  y -= 12;
  y = drawHeading(page2, fontBold, "Top Assets", y);

  if (input.topAssets.length === 0) {
    page2.drawText("No asset download data yet.", {
      x: PAGE.margin,
      y,
      size: 11,
      font: fontRegular,
      color: rgb(0.78, 0.78, 0.78)
    });
    y -= 20;
  } else {
    input.topAssets.slice(0, 8).forEach((asset) => {
      page2.drawText(`${asset.label}: ${asset.downloads}`, {
        x: PAGE.margin,
        y,
        size: 11,
        font: fontRegular,
        color: rgb(0.88, 0.88, 0.88)
      });
      y -= 15;
    });
  }

  y -= 8;
  y = drawHeading(page2, fontBold, "SmartLinks", y);

  if (input.smartlinks.length === 0) {
    page2.drawText("No smartlinks available.", {
      x: PAGE.margin,
      y,
      size: 11,
      font: fontRegular,
      color: rgb(0.78, 0.78, 0.78)
    });
  } else {
    input.smartlinks.slice(0, 8).forEach((smart) => {
      page2.drawText(`${smart.title}: ${smart.url}`, {
        x: PAGE.margin,
        y,
        size: 10,
        font: fontRegular,
        color: rgb(0.84, 0.84, 0.84)
      });
      y -= 15;
    });
  }

  return doc.save();
}
