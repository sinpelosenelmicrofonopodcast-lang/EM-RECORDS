import type { ContractClauseFlags, ContractRenderContext } from "@/lib/signing/types";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeValue(value: string | number | boolean | null | undefined): string {
  if (value == null || value === "") return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function evaluateConditionalBlocks(template: string, clauses: ContractClauseFlags): string {
  return template.replace(/\[if:([a-z0-9_]+)\]([\s\S]*?)\[\/if:\1\]/gi, (_full, key: string, inner: string) => {
    const enabled = Boolean(clauses[key as keyof ContractClauseFlags]);
    return enabled ? inner.trim() : "";
  });
}

export function mergeTemplateVariables(defaults: Record<string, unknown>, overrides: Record<string, unknown>): ContractRenderContext {
  const merged: ContractRenderContext = {};
  for (const [key, value] of Object.entries({ ...defaults, ...overrides })) {
    merged[key] = value as string | number | boolean | null | undefined;
  }
  return merged;
}

export function renderContractTemplate(markdownTemplate: string, variables: ContractRenderContext, clauses: ContractClauseFlags): string {
  const withClauses = evaluateConditionalBlocks(markdownTemplate, clauses);
  return withClauses.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_full, key: string) => normalizeValue(variables[key]));
}

function formatEffectiveDate(value: string | number | boolean | null | undefined, language: string): string | null {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;

  const parsed = new Date(`${normalized}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toLocaleDateString(language === "es" ? "es-US" : "en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}

function cleanLineText(line: string): string {
  return line
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([A-Za-z)])(in perpetuity\b)/g, "$1 $2")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();
}

function shouldNumberHeading(title: string): boolean {
  const normalized = title.replace(/^\d+\.\s*/, "").trim().toUpperCase();
  return normalized !== "EM RECORDS LLC" && normalized !== "SIGNATURES" && normalized !== "FIRMAS";
}

function stripHeadingNumber(title: string): string {
  return title.replace(/^\d+\.\s*/, "").trim();
}

export function formatContractMarkdown(markdown: string, variables: ContractRenderContext = {}): string {
  const contractLanguage = String(variables.contract_language ?? "en").trim().toLowerCase().startsWith("es") ? "es" : "en";
  const effectiveDate = formatEffectiveDate(variables.effective_date, contractLanguage);
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const formatted: string[] = [];
  let clauseNumber = 0;
  let introRewritten = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      if (formatted[formatted.length - 1] !== "") {
        formatted.push("");
      }
      continue;
    }

    if (!introRewritten && /^This Artist Recording Agreement\b/i.test(trimmed) && effectiveDate) {
      formatted.push(`This Artist Recording Agreement ("Agreement") is entered into effective ${effectiveDate}.`);
      introRewritten = true;
      continue;
    }

    if (!introRewritten && /^El presente Contrato de Grabacion Artistica\b/i.test(trimmed) && effectiveDate) {
      formatted.push(`El presente Contrato de Grabacion Artistica ("Contrato") entra en vigor el ${effectiveDate}.`);
      introRewritten = true;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      const headingTitle = stripHeadingNumber(trimmed.slice(3));
      if (shouldNumberHeading(headingTitle)) {
        clauseNumber += 1;
        formatted.push(`## ${clauseNumber}. ${cleanLineText(headingTitle)}`);
      } else {
        formatted.push(`## ${cleanLineText(headingTitle)}`);
      }
      continue;
    }

    if (trimmed.startsWith("# ")) {
      formatted.push(`# ${cleanLineText(trimmed.slice(2))}`);
      continue;
    }

    if (trimmed.startsWith("- ")) {
      formatted.push(`- ${cleanLineText(trimmed.slice(2))}`);
      continue;
    }

    formatted.push(cleanLineText(trimmed));
  }

  return formatted
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function flushList(html: string[], listItems: string[]): void {
  if (listItems.length === 0) return;
  html.push("<ul>");
  for (const item of listItems) {
    html.push(`<li>${escapeHtml(item)}</li>`);
  }
  html.push("</ul>");
  listItems.length = 0;
}

export function markdownToContractHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  const listItems: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const clean = line.trim();

    if (!clean) {
      flushList(html, listItems);
      continue;
    }

    if (clean.startsWith("# ")) {
      flushList(html, listItems);
      html.push(`<h1>${escapeHtml(clean.slice(2).trim())}</h1>`);
      continue;
    }

    if (clean.startsWith("## ")) {
      flushList(html, listItems);
      html.push(`<h2>${escapeHtml(clean.slice(3).trim())}</h2>`);
      continue;
    }

    if (clean.startsWith("- ")) {
      listItems.push(clean.slice(2).trim());
      continue;
    }

    flushList(html, listItems);
    html.push(`<p>${escapeHtml(clean)}</p>`);
  }

  flushList(html, listItems);

  return html.join("\n");
}
