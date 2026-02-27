/**
 * Invoice data extractor — LLM-first with regex fallback.
 *
 * Two modes:
 * 1. Catalog extraction: Known service name → classify + extract billing data
 * 2. Discovery extraction: Unknown service → identify name + category + extract billing data
 *
 * Primary path: Uses generateObject + Zod schema via DeepSeek/Gemini
 * Fallback (catalog only): Regex extraction (extractAmount, extractDueDate, etc.)
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { isAIEnabled, getAIProviderType } from "@/lib/llm/provider";
import { getDeepSeekModel } from "@/lib/llm/deepseek-provider";
import {
  extractAmount,
  extractDueDate,
  extractPeriod,
  extractClientNumber,
} from "./body-parser";

import type { LanguageModel } from "ai";
import type { ServiceSection } from "@/lib/service-catalog";
import type { ExpenseCategory } from "@prisma/client";

// ─── Types ──────────────────────────────────────────────────────────

export interface ExtractedInvoiceData {
  isBillingEmail: boolean;
  amount: number | null;
  currency: "ARS" | "USD";
  dueDate: string | null;       // YYYY-MM-DD
  period: string | null;         // YYYY-MM
  clientNumber: string | null;
  extractionMethod: "llm" | "regex";
}

export interface DiscoveredServiceData {
  isBillingEmail: boolean;
  serviceName: string | null;
  category: ExpenseCategory | null;
  amount: number | null;
  currency: "ARS" | "USD";
  dueDate: string | null;       // YYYY-MM-DD
  period: string | null;         // YYYY-MM
}

// ─── Zod schemas ────────────────────────────────────────────────────

const CURRENCY_DESC = "Moneda del monto. 'USD' si el email menciona USD, US$, dollars, o el servicio cobra internacionalmente. 'ARS' si menciona pesos, $ sin calificador USD, o el servicio es argentino.";

const invoiceSchema = z.object({
  isBillingEmail: z.boolean()
    .describe("true si este email es una factura, cobro, resumen de cuenta o notificación de pago del servicio indicado. false si es publicidad, newsletter, confirmación de login, o mención casual del servicio."),
  amount: z.number().positive().max(10_000_000).nullable()
    .describe("Monto total a pagar, solo el número sin símbolo $. null si isBillingEmail es false."),
  currency: z.enum(["ARS", "USD"]).describe(CURRENCY_DESC),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()
    .describe("Fecha de vencimiento (NO emisión) en formato YYYY-MM-DD. null si isBillingEmail es false."),
  period: z.string().regex(/^\d{4}-\d{2}$/).nullable()
    .describe("Período de facturación en formato YYYY-MM (ej: 2026-02). null si isBillingEmail es false."),
  clientNumber: z.string().max(50).nullable()
    .describe("Número de cliente, suministro, NIS o cuenta. null si isBillingEmail es false."),
});

const discoverySchema = z.object({
  isBillingEmail: z.boolean()
    .describe("true si este email notifica un cobro, pago procesado, cargo a tarjeta, factura, renovación de suscripción, o cualquier transacción monetaria. false si es publicidad, newsletter, notificación de seguridad, actualización de producto, o no implica un cobro."),
  serviceName: z.string().max(60).nullable()
    .describe("Nombre comercial corto del servicio o empresa que cobra. Ej: 'Cursor', 'GitHub', 'Anthropic', 'AWS', 'Notion', 'ChatGPT'. null si isBillingEmail es false."),
  category: z.enum([
    "GROCERIES", "UTILITIES", "RENT", "FOOD", "TRANSPORT",
    "HEALTH", "ENTERTAINMENT", "EDUCATION", "HOME", "OTHER",
  ]).nullable()
    .describe("Categoría del servicio. ENTERTAINMENT para streaming/suscripciones digitales. UTILITIES para servicios públicos. EDUCATION para herramientas de aprendizaje. HOME para servicios del hogar. OTHER si no encaja. null si isBillingEmail es false."),
  amount: z.number().positive().max(10_000_000).nullable()
    .describe("Monto total cobrado, solo el número. null si isBillingEmail es false."),
  currency: z.enum(["ARS", "USD"]).describe(CURRENCY_DESC),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()
    .describe("Fecha del cobro o vencimiento en formato YYYY-MM-DD. null si isBillingEmail es false."),
  period: z.string().regex(/^\d{4}-\d{2}$/).nullable()
    .describe("Período facturado en formato YYYY-MM. null si isBillingEmail es false."),
});

// ─── Model selection ────────────────────────────────────────────────

const LLM_TIMEOUT_MS = 15_000;

function getModel(): LanguageModel {
  const providerType = getAIProviderType();
  if (providerType === "gemini") {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });
    return google("gemini-1.5-flash");
  }
  return getDeepSeekModel();
}

// ─── Catalog extraction (known services) ────────────────────────────

/** Sections where emails are formal invoices — strict classification */
const STRICT_SECTIONS = new Set<ServiceSection>(["local", "telecom", "salud", "impuestos"]);

function buildClassificationCriteria(serviceName: string, section: ServiceSection): string {
  if (STRICT_SECTIONS.has(section)) {
    return `- isBillingEmail: true SOLO si el email es una factura, cobro, resumen de cuenta o notificación de pago DIRECTAMENTE de "${serviceName}".
- isBillingEmail: false si es publicidad, newsletter, spam, confirmación de cuenta, o simplemente menciona "${serviceName}" sin ser un cobro.`;
  }

  return `- isBillingEmail: true si el email indica que se realizó un cobro, pago, cargo, renovación de suscripción, recibo de pago, o cualquier transacción monetaria relacionada con "${serviceName}". Incluye "payment receipt", "renewal", "tu pago fue procesado", "cargo realizado", "suscripción renovada", etc.
- isBillingEmail: false si es publicidad, newsletter, recomendaciones de contenido, novedades del catálogo, o no tiene relación con un cobro/pago.`;
}

function buildCatalogPrompt(bodyContent: string, subject: string, serviceName: string, section: ServiceSection): string {
  const classificationCriteria = buildClassificationCriteria(serviceName, section);

  return `Sos un extractor de datos de facturas y cobros.
Analizá el siguiente email de "${serviceName}".

PASO 1 - CLASIFICACIÓN:
${classificationCriteria}
- Si isBillingEmail es false, poné null en todos los demás campos (excepto currency).

PASO 2 - EXTRACCIÓN (solo si isBillingEmail es true):
- amount: monto TOTAL a pagar (no subtotales ni impuestos individuales). Solo el número.
- currency: "USD" si el cobro es en dólares (USD, US$, dollars). "ARS" si es en pesos argentinos.
- dueDate: fecha de VENCIMIENTO o fecha del cobro/pago. Formato YYYY-MM-DD.
- period: período que cubre la factura (ej: enero 2026 → "2026-01"). Formato YYYY-MM.
- clientNumber: número de cliente, suministro, NIS o cuenta.
- Si un dato no aparece claramente en el email, poné null. No inventes datos.

ASUNTO: ${subject}

CONTENIDO DEL EMAIL:
${bodyContent.slice(0, 6000)}`;
}

async function extractWithLLM(
  bodyContent: string,
  subject: string,
  serviceName: string,
  section: ServiceSection,
): Promise<ExtractedInvoiceData> {
  const model = getModel();
  const prompt = buildCatalogPrompt(bodyContent, subject, serviceName, section);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    const result = await generateObject({
      model,
      schema: invoiceSchema,
      prompt,
      abortSignal: controller.signal,
    });

    return {
      isBillingEmail: result.object.isBillingEmail,
      amount: result.object.amount,
      currency: result.object.currency as "ARS" | "USD",
      dueDate: result.object.dueDate,
      period: result.object.period,
      clientNumber: result.object.clientNumber,
      extractionMethod: "llm",
    };
  } finally {
    clearTimeout(timer);
  }
}

// ─── Regex fallback ─────────────────────────────────────────────────

function extractWithRegex(plainText: string, subject: string): ExtractedInvoiceData {
  const searchText = `${subject}\n${plainText}`;
  return {
    isBillingEmail: true, // Regex path assumes matched email is billing
    amount: extractAmount(searchText),
    currency: "ARS",      // Regex path is only used for catalog (Argentine) services
    dueDate: extractDueDate(searchText),
    period: extractPeriod(searchText),
    clientNumber: extractClientNumber(searchText),
    extractionMethod: "regex",
  };
}

// ─── Catalog entry point ────────────────────────────────────────────

/**
 * Classify and extract structured invoice data from a known service email.
 * Classification strictness varies by section.
 */
export async function extractInvoiceData(
  plainText: string,
  subject: string,
  serviceName: string,
  section: ServiceSection,
): Promise<ExtractedInvoiceData> {
  if (isAIEnabled() && plainText.length > 50) {
    try {
      return await extractWithLLM(plainText, subject, serviceName, section);
    } catch (error) {
      console.error("[extractor] LLM failed, falling back to regex:", error);
    }
  }

  return extractWithRegex(plainText, subject);
}

// ─── Discovery extraction (unknown services) ────────────────────────

function buildDiscoveryPrompt(bodyContent: string, subject: string, senderEmail: string): string {
  return `Sos un clasificador de emails de cobros y facturación.
Analizá el siguiente email y determiná si es una factura, cobro, recibo de pago, renovación de suscripción o cargo monetario.

PASO 1 - CLASIFICACIÓN:
- isBillingEmail: true si el email notifica un cobro, pago procesado, cargo a tarjeta, factura, renovación de suscripción, o cualquier transacción monetaria.
- isBillingEmail: false si es publicidad, newsletter, notificación de seguridad, confirmación de registro/login, actualización de producto, o cualquier email que NO implique un cobro o pago.
- Si isBillingEmail es false, poné null en todos los demás campos (excepto currency).

PASO 2 - IDENTIFICACIÓN (solo si isBillingEmail es true):
- serviceName: nombre comercial corto del servicio o empresa que cobra (ej: "Cursor", "GitHub", "AWS", "Notion"). No uses el nombre legal completo.
- category: categoría que mejor describe el servicio.
- amount: monto total cobrado (solo el número).
- currency: "USD" si el cobro es en dólares (USD, US$, dollars). "ARS" si es en pesos argentinos.
- dueDate: fecha del cobro o vencimiento. Formato YYYY-MM-DD.
- period: período facturado. Formato YYYY-MM.
- Si un dato no aparece claramente, poné null. No inventes datos.

REMITENTE: ${senderEmail}
ASUNTO: ${subject}

CONTENIDO DEL EMAIL:
${bodyContent.slice(0, 6000)}`;
}

const DISCOVERY_FALLBACK: DiscoveredServiceData = {
  isBillingEmail: false,
  serviceName: null,
  category: null,
  amount: null,
  currency: "ARS",
  dueDate: null,
  period: null,
};

/**
 * Classify and extract data from an unknown email (discovery mode).
 * LLM identifies the service name and category in addition to billing data.
 * No regex fallback — if LLM fails, returns non-billing.
 */
export async function extractDiscoveryData(
  plainText: string,
  subject: string,
  senderEmail: string,
): Promise<DiscoveredServiceData> {
  if (!isAIEnabled() || plainText.length <= 50) {
    return DISCOVERY_FALLBACK;
  }

  const model = getModel();
  const prompt = buildDiscoveryPrompt(plainText, subject, senderEmail);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    const result = await generateObject({
      model,
      schema: discoverySchema,
      prompt,
      abortSignal: controller.signal,
    });

    return {
      isBillingEmail: result.object.isBillingEmail,
      serviceName: result.object.serviceName,
      category: result.object.category as ExpenseCategory | null,
      amount: result.object.amount,
      currency: result.object.currency as "ARS" | "USD",
      dueDate: result.object.dueDate,
      period: result.object.period,
    };
  } catch (error) {
    console.error("[extractor] Discovery LLM failed:", error);
    return DISCOVERY_FALLBACK;
  } finally {
    clearTimeout(timer);
  }
}
