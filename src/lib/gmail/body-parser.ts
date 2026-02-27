// ─── Gmail body decoding & parsing ──────────────────────────────────
// Decodes base64url email bodies and extracts billing data (amounts, due dates).

/** Gmail message payload shape (subset we use) */
export interface GmailPayload {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailPayload[];
  headers?: Array<{ name: string; value: string }>;
}

/**
 * Decode a Gmail message payload into raw HTML (for LLM processing).
 * Strips <style> and <script> but preserves <table>, <tr>, <td> structure
 * that matters for extracting billing data from email layouts.
 * Falls back to plain text if no HTML part exists.
 */
export function decodeGmailHtml(payload: GmailPayload, maxChars = 4000): string {
  const htmlPart = findPart(payload, "text/html");
  if (htmlPart?.body?.data) {
    return cleanHtmlForLlm(decodeBase64Url(htmlPart.body.data), maxChars);
  }

  // Single-part HTML message
  if (payload.body?.data && payload.mimeType === "text/html") {
    return cleanHtmlForLlm(decodeBase64Url(payload.body.data), maxChars);
  }

  // No HTML available — return plain text
  return decodeGmailBody(payload);
}

/** Remove style/script blocks but keep structural HTML, then trim to max chars */
function cleanHtmlForLlm(html: string, maxChars: number): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .slice(0, maxChars);
}

/**
 * Decode a Gmail message payload into plain text.
 * Prefers text/plain; falls back to text/html stripped of tags.
 */
export function decodeGmailBody(payload: GmailPayload): string {
  // Try to find text/plain first, then text/html
  const plainPart = findPart(payload, "text/plain");
  if (plainPart?.body?.data) {
    return decodeBase64Url(plainPart.body.data);
  }

  const htmlPart = findPart(payload, "text/html");
  if (htmlPart?.body?.data) {
    const html = decodeBase64Url(htmlPart.body.data);
    return stripHtml(html);
  }

  // Single-part message (no parts array)
  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);
    if (payload.mimeType === "text/html") {
      return stripHtml(decoded);
    }
    return decoded;
  }

  return "";
}

/** Recursively find a MIME part by type */
function findPart(payload: GmailPayload, mimeType: string): GmailPayload | null {
  if (payload.mimeType === mimeType && payload.body?.data) {
    return payload;
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const found = findPart(part, mimeType);
      if (found) return found;
    }
  }
  return null;
}

/** Decode base64url (Gmail's encoding) to UTF-8 string */
function decodeBase64Url(data: string): string {
  // Replace base64url chars with standard base64
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Buffer.from(base64, "base64");
  return bytes.toString("utf-8");
}

/** Strip HTML tags and decode common entities, preserving whitespace structure */
export function stripHtml(html: string): string {
  return html
    // Remove style/script blocks entirely
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    // Replace <br>, <p>, <div>, <tr>, <li> with newlines for structure
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|tr|li|h[1-6])[^>]*>/gi, "\n")
    .replace(/<td[^>]*>/gi, " ")
    // Remove all remaining tags
    .replace(/<[^>]+>/g, "")
    // Decode common HTML entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "")
    // Collapse multiple whitespace (but keep newlines)
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

// ─── Amount extraction ──────────────────────────────────────────────

/**
 * Extract a monetary amount from text.
 * Supports Argentine format ($58.099,00) and standard ($58099.00).
 * Returns the LARGEST amount found (most likely to be the total).
 */
const AMOUNT_PATTERNS = [
  // $58.099,00 or $ 58.099,00 or $58.099 (Argentine format)
  /\$\s?([\d.]+,\d{2})\b/g,
  /\$\s?([\d.]+)\b/g,
  // "Total: $58.099" or "Saldo: $ 58.099,00"
  /(?:total|saldo|importe|monto|pagar)[:\s]*\$\s?([\d.,]+)/gi,
];

export function extractAmount(text: string): number | null {
  const amounts: number[] = [];

  for (const pattern of AMOUNT_PATTERNS) {
    // Reset regex state
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const parsed = parseArgentineAmount(match[1] ?? "");
      if (parsed !== null && parsed > 0 && parsed < 10_000_000) {
        amounts.push(parsed);
      }
    }
  }

  if (amounts.length === 0) return null;

  // Return the largest amount (likely the total, not a partial)
  return Math.max(...amounts);
}

/** Parse an amount string in Argentine or US format */
function parseArgentineAmount(raw: string): number | null {
  if (!raw) return null;

  let normalized = raw;
  if (normalized.includes(",")) {
    const lastComma = normalized.lastIndexOf(",");
    const lastDot = normalized.lastIndexOf(".");
    if (lastComma > lastDot) {
      // Argentine: 58.099,00 → 58099.00
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      // US: 58,099.00 → 58099.00
      normalized = normalized.replace(/,/g, "");
    }
  } else {
    // No comma — dots could be thousands (58.099) or decimal (58.09)
    const dotCount = (normalized.match(/\./g) ?? []).length;
    if (dotCount > 1) {
      // Multiple dots = thousands separators: 58.099 → 58099
      normalized = normalized.replace(/\./g, "");
    }
    // Single dot with exactly 2 digits after: decimal (58.09)
    // Single dot with 3+ digits after: thousands (58.099 → 58099)
    if (dotCount === 1) {
      const afterDot = normalized.split(".")[1] ?? "";
      if (afterDot.length === 3) {
        normalized = normalized.replace(".", "");
      }
    }
  }

  const amount = parseFloat(normalized);
  return isNaN(amount) ? null : amount;
}

// ─── Due date extraction ────────────────────────────────────────────

/**
 * Extract a due date from email text.
 * Looks for patterns like "Vencimiento: 02/03/2026" or "Vence el 2 de marzo".
 */
const DUE_DATE_PATTERNS = [
  // "Vencimiento: 02/03/26" or "Vence: 02/03/2026" or "Vto: 02-03-2026"
  /(?:vencimiento|vence|vto\.?)[:\s]+(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/gi,
  // "Fecha de vencimiento 02/03/2026"
  /fecha\s+de\s+vencimiento[:\s]+(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/gi,
  // Standalone date near "vencimiento" keyword (within same line)
  /vencimiento[\s\S]{0,30}?(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/gi,
];

const MONTH_NAMES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

// "2 de marzo de 2026" near vencimiento
const VERBAL_DATE = /(?:vencimiento|vence)[\s\S]{0,30}?(\d{1,2})\s+de\s+(\w+)(?:\s+de\s+(\d{4}))?/gi;

export function extractDueDate(text: string): string | null {
  // Try numeric patterns first
  for (const pattern of DUE_DATE_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match?.[1] && match[2] && match[3]) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      let year = parseInt(match[3], 10);
      if (year < 100) year += 2000;

      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }
  }

  // Try verbal date pattern
  VERBAL_DATE.lastIndex = 0;
  const verbal = VERBAL_DATE.exec(text);
  if (verbal?.[1] && verbal[2]) {
    const day = parseInt(verbal[1], 10);
    const monthName = verbal[2].toLowerCase();
    const month = MONTH_NAMES[monthName];
    const year = verbal[3] ? parseInt(verbal[3], 10) : new Date().getFullYear();

    if (month && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  return null;
}

// ─── Period extraction ──────────────────────────────────────────────

const PERIOD_PATTERNS = [
  // "Período: 01/2026" or "Periodo: 01-2026"
  /per[ií]odo[:\s]+(\d{1,2})[/\-](\d{4})/gi,
  // "Período: 2026/01"
  /per[ií]odo[:\s]+(\d{4})[/\-](\d{1,2})/gi,
  // "Mes: Febrero 2026" or "Factura del mes de febrero 2026"
  /(?:mes(?:\s+de)?|factura\s+del\s+mes\s+de)[:\s]+(\w+)\s+(\d{4})/gi,
  // "Período Enero 2026"
  /per[ií]odo[:\s]+(\w+)\s+(\d{4})/gi,
];

/**
 * Extract billing period from text.
 * Returns "YYYY-MM" format or null.
 */
export function extractPeriod(text: string): string | null {
  // Try numeric patterns: "Período: 01/2026"
  const numericPattern = PERIOD_PATTERNS[0]!;
  numericPattern.lastIndex = 0;
  const numeric = numericPattern.exec(text);
  if (numeric?.[1] && numeric[2]) {
    const month = parseInt(numeric[1], 10);
    const year = parseInt(numeric[2], 10);
    if (month >= 1 && month <= 12 && year >= 2020 && year <= 2030) {
      return `${year}-${String(month).padStart(2, "0")}`;
    }
  }

  // Try reverse numeric: "Período: 2026/01"
  const reversePattern = PERIOD_PATTERNS[1]!;
  reversePattern.lastIndex = 0;
  const reverse = reversePattern.exec(text);
  if (reverse?.[1] && reverse[2]) {
    const year = parseInt(reverse[1], 10);
    const month = parseInt(reverse[2], 10);
    if (month >= 1 && month <= 12 && year >= 2020 && year <= 2030) {
      return `${year}-${String(month).padStart(2, "0")}`;
    }
  }

  // Try verbal: "Mes: Febrero 2026" or "Período Enero 2026"
  for (const pattern of PERIOD_PATTERNS.slice(2)) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match?.[1] && match[2]) {
      const monthName = match[1].toLowerCase();
      const month = MONTH_NAMES[monthName];
      const year = parseInt(match[2], 10);
      if (month && year >= 2020 && year <= 2030) {
        return `${year}-${String(month).padStart(2, "0")}`;
      }
    }
  }

  return null;
}

// ─── Client number extraction ───────────────────────────────────────

const CLIENT_NUMBER_PATTERNS = [
  // "Nro. Cliente: 123456" or "N° Cliente: 123456" or "Nro de cliente: 123456"
  /n(?:ro\.?|°|úmero)\s*(?:de\s+)?cliente[:\s]+([A-Za-z0-9\-/.]+)/gi,
  // "NIS: 123456" or "NIS 123456"
  /\bNIS[:\s]+(\d[\d\-/.]+)/gi,
  // "Nro. Suministro: 123456"
  /n(?:ro\.?|°|úmero)\s*(?:de\s+)?suministro[:\s]+([A-Za-z0-9\-/.]+)/gi,
  // "Cuenta Nro: 123456" or "Cuenta: 123456"
  /cuenta\s*(?:n(?:ro\.?|°)[:\s]*)?[:\s]+([A-Za-z0-9\-/.]+)/gi,
  // "Nro. de cuenta: 123456"
  /n(?:ro\.?|°)\s*de\s+cuenta[:\s]+([A-Za-z0-9\-/.]+)/gi,
];

/**
 * Extract client/customer number from text.
 * Returns the first match or null.
 */
export function extractClientNumber(text: string): string | null {
  for (const pattern of CLIENT_NUMBER_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match?.[1]) {
      const value = match[1].trim();
      // Must be at least 3 chars and max 50
      if (value.length >= 3 && value.length <= 50) {
        return value;
      }
    }
  }
  return null;
}
