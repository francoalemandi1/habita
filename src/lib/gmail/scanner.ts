import { ALL_PRESETS } from "@/lib/service-catalog";
import { prisma } from "@/lib/prisma";
import { buildServiceQueries } from "./query-builder";
import { decodeGmailBody } from "./body-parser";
import { extractInvoiceData, extractDiscoveryData } from "./extractor";

import type { GmailPayload } from "./body-parser";
import type { ExtractedInvoiceData } from "./extractor";
import type { ServiceSection } from "@/lib/service-catalog";
import type { ExpenseCategory, RecurringFrequency } from "@prisma/client";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

export interface DetectedService {
  title: string;
  provider: string;
  category: ExpenseCategory;
  section: ServiceSection;
  frequency: RecurringFrequency;
  lastAmount: number | null;
  currency: "ARS" | "USD";
  dueDate: string | null;
  period: string | null;
  clientNumber: string | null;
  senderEmail: string;
  emailCount: number;
  latestEmailDate: string;
}

// ─── Gmail API types ────────────────────────────────────────────────

interface GmailMessageListResponse {
  messages?: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

interface GmailMessageHeader {
  name: string;
  value: string;
}

interface GmailMessageResponse {
  id: string;
  payload?: GmailPayload & { headers?: GmailMessageHeader[] };
  internalDate?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────

function getHeader(headers: GmailMessageHeader[], name: string): string {
  const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return header?.value ?? "";
}

/** Infer frequency from email count and time span. */
function inferFrequency(emailCount: number, oldestDate: Date, newestDate: Date): RecurringFrequency {
  const spanDays = Math.max(1, (newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));
  const avgDaysBetween = spanDays / Math.max(1, emailCount - 1);

  if (avgDaysBetween <= 10) return "WEEKLY";
  if (avgDaysBetween <= 45) return "MONTHLY";
  if (avgDaysBetween <= 75) return "BIMONTHLY";
  if (avgDaysBetween <= 120) return "QUARTERLY";
  return "YEARLY";
}

/**
 * Match an email (subject + from) to a known service from the catalog.
 * Returns the matching preset title, or null.
 */
function matchToService(subject: string, from: string, serviceNames: string[]): string | null {
  const searchText = `${subject} ${from}`.toLowerCase();

  // Sort by length descending so "Aguas Cordobesas" matches before "Aguas"
  const sorted = [...serviceNames].sort((a, b) => b.length - a.length);

  for (const name of sorted) {
    if (searchText.includes(name.toLowerCase())) {
      return name;
    }
  }
  return null;
}

// ─── Gmail API calls ────────────────────────────────────────────────

const MAX_RETRIES = 3;
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 150;

async function gmailFetch<T>(accessToken: string, path: string, params?: Record<string, string | string[]>): Promise<T> {
  const url = new URL(`${GMAIL_API_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        for (const v of value) {
          url.searchParams.append(key, v);
        }
      } else {
        url.searchParams.set(key, value);
      }
    }
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 429 && attempt < MAX_RETRIES) {
      const delayMs = 1000 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gmail API error (${response.status}): ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  throw new Error("Gmail API: max retries exceeded");
}

/** Fetch messages in small batches with delays */
async function fetchInBatches<T>(
  accessToken: string,
  messageIds: string[],
  params: Record<string, string | string[]>,
): Promise<T[]> {
  const results: T[] = [];

  for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
    const batch = messageIds.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((id) => gmailFetch<T>(accessToken, `/messages/${id}`, params)),
    );
    results.push(...batchResults);

    if (i + BATCH_SIZE < messageIds.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  return results;
}

// ─── Main scanner ───────────────────────────────────────────────────

/**
 * Scan Gmail for billing emails from known services.
 * Uses keyword-based search (service names) instead of sender domains.
 * Classifies + extracts invoice data via LLM (primary) or regex (fallback).
 * Tracks processed emails for idempotency.
 *
 * @param accessToken - Valid Gmail access token
 * @param householdCity - User's city for province-based filtering
 * @param userId - User ID for idempotency tracking
 * @param newerThan - Gmail time filter (e.g. "6m" for 6 months, "7d" for 7 days)
 */
export async function scanGmailForServices(
  accessToken: string,
  householdCity: string | null,
  userId: string,
  newerThan = "3m",
): Promise<DetectedService[]> {
  const queries = buildServiceQueries(householdCity, newerThan);

  // 1. Execute queries sequentially, collect message IDs + which query they came from
  const messageEntries: Array<{ id: string; serviceNames: string[] }> = [];
  const seenIds = new Set<string>();

  for (const sq of queries) {
    try {
      console.log(`[scan-gmail] Query for ${sq.categoryLabel}: ${sq.query}`);
      const listResponse = await gmailFetch<GmailMessageListResponse>(
        accessToken,
        "/messages",
        { q: sq.query, maxResults: "20" },
      );

      const count = listResponse.messages?.length ?? 0;
      console.log(`[scan-gmail] ${sq.categoryLabel}: ${count} messages found`);

      if (listResponse.messages) {
        for (const msg of listResponse.messages) {
          if (!seenIds.has(msg.id)) {
            seenIds.add(msg.id);
            messageEntries.push({ id: msg.id, serviceNames: sq.serviceNames });
          }
        }
      }
    } catch (error) {
      console.error("[scan-gmail] Query failed for", sq.categoryLabel, error);
    }

    // Delay between queries to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  if (messageEntries.length === 0) {
    return [];
  }

  // 1.5. Filter out already-processed emails (idempotency)
  const allIds = messageEntries.map((e) => e.id);
  const processedRows = await prisma.processedEmail.findMany({
    where: { userId, gmailMessageId: { in: allIds } },
    select: { gmailMessageId: true },
  });
  const processedSet = new Set<string>(processedRows.map((p: { gmailMessageId: string }) => p.gmailMessageId));
  const newEntries = messageEntries.filter((e) => !processedSet.has(e.id));

  if (newEntries.length === 0) {
    return [];
  }

  // 2. Fetch metadata (From, Subject, Date) for new messages only
  const newIds = newEntries.map((e) => e.id);
  const metadataResults = await fetchInBatches<GmailMessageResponse>(
    accessToken,
    newIds,
    { format: "metadata", metadataHeaders: ["From", "Subject", "Date"] },
  );

  // 3. Match each message to a service and group
  const idToServiceNames = new Map<string, string[]>();
  for (const entry of newEntries) {
    idToServiceNames.set(entry.id, entry.serviceNames);
  }

  interface EmailInfo {
    messageId: string;
    from: string;
    subject: string;
    date: Date;
    serviceName: string;
  }

  const matchedEmails: EmailInfo[] = [];

  for (const msg of metadataResults) {
    const headers = msg.payload?.headers ?? [];
    const from = getHeader(headers, "From");
    const subject = getHeader(headers, "Subject");
    const dateStr = getHeader(headers, "Date");
    const date = dateStr ? new Date(dateStr) : new Date(Number(msg.internalDate ?? 0));

    if (!from && !subject) continue;

    const serviceNames = idToServiceNames.get(msg.id) ?? [];
    const matched = matchToService(subject, from, serviceNames);

    if (matched) {
      matchedEmails.push({ messageId: msg.id, from, subject, date, serviceName: matched });
    } else {
      console.log(`[scan-gmail] No match for: subject="${subject}" from="${from}"`);
    }
  }

  // 4. Group by service, keep the most recent email per service
  const serviceGroups = new Map<string, {
    emails: EmailInfo[];
    senderEmail: string;
  }>();

  for (const email of matchedEmails) {
    const existing = serviceGroups.get(email.serviceName);
    if (existing) {
      existing.emails.push(email);
    } else {
      const emailMatch = /<([^>]+)>/.exec(email.from);
      const senderEmail = emailMatch?.[1] ?? email.from;
      serviceGroups.set(email.serviceName, {
        emails: [email],
        senderEmail,
      });
    }
  }

  // 5. Sort emails per service by date (newest first), pick top N candidates
  const MAX_CANDIDATES_PER_SERVICE = 5;

  const candidatesByService: Array<{ serviceName: string; messageIds: string[] }> = [];
  for (const [serviceName, group] of serviceGroups) {
    group.emails.sort((a, b) => b.date.getTime() - a.date.getTime());
    const topIds = group.emails
      .slice(0, MAX_CANDIDATES_PER_SERVICE)
      .map((e) => e.messageId);
    candidatesByService.push({ serviceName, messageIds: topIds });
  }

  // Fetch full bodies for all candidates
  const allCandidateIds = candidatesByService.flatMap((c) => c.messageIds);
  const bodyResults = await fetchInBatches<GmailMessageResponse>(
    accessToken,
    allCandidateIds,
    { format: "full" },
  );

  const bodyResultMap = new Map<string, GmailMessageResponse>();
  for (const msg of bodyResults) {
    bodyResultMap.set(msg.id, msg);
  }

  // Build a quick lookup from service catalog (needed for section-aware extraction)
  const presetMap = new Map<string, {
    provider: string;
    category: ExpenseCategory;
    frequency: RecurringFrequency;
    section: ServiceSection;
  }>();
  for (const preset of ALL_PRESETS) {
    presetMap.set(preset.title, {
      provider: preset.provider ?? preset.title,
      category: preset.category,
      frequency: preset.frequency,
      section: preset.section,
    });
  }

  // Classify candidates sequentially per service — stop at first billing email
  const billingData = new Map<string, { messageId: string; data: ExtractedInvoiceData }>();

  for (const { serviceName, messageIds } of candidatesByService) {
    const section = presetMap.get(serviceName)?.section ?? "local";

    for (const messageId of messageIds) {
      const msg = bodyResultMap.get(messageId);
      if (!msg?.payload) continue;

      const plainText = decodeGmailBody(msg.payload);
      const headers = msg.payload.headers ?? [];
      const subject = getHeader(headers, "Subject");

      const extracted = await extractInvoiceData(plainText, subject, serviceName, section);

      if (!extracted.isBillingEmail) {
        console.log(`[scan-gmail] Discarded non-billing email for "${serviceName}" (subject: "${subject}")`);
        continue;
      }

      // Found a billing email — use it and stop searching for this service
      console.log(`[scan-gmail] Found billing email for "${serviceName}" (subject: "${subject}")`);
      billingData.set(serviceName, { messageId, data: extracted });
      break;
    }
  }

  // 5.5. Mark all matched emails as processed (even non-billing, to avoid re-scanning)
  const emailsToMark = matchedEmails.map((e) => ({
    gmailMessageId: e.messageId,
    userId,
    serviceName: e.serviceName,
  }));

  if (emailsToMark.length > 0) {
    await prisma.processedEmail.createMany({
      data: emailsToMark,
      skipDuplicates: true,
    });
  }

  // 6. Build final results
  const detected: DetectedService[] = [];

  for (const [serviceName, group] of serviceGroups) {
    const preset = presetMap.get(serviceName);
    if (!preset) continue;

    const billing = billingData.get(serviceName);
    if (!billing) continue;

    const sortedEmails = group.emails;
    const latestEmail = sortedEmails[0];
    if (!latestEmail) continue;

    // Infer frequency from email pattern if we have enough data
    const frequency = group.emails.length >= 3
      ? inferFrequency(
          group.emails.length,
          sortedEmails.at(-1)?.date ?? latestEmail.date,
          latestEmail.date,
        )
      : preset.frequency;

    detected.push({
      title: serviceName,
      provider: preset.provider,
      category: preset.category,
      section: preset.section,
      frequency,
      lastAmount: billing.data.amount,
      currency: billing.data.currency,
      dueDate: billing.data.dueDate,
      period: billing.data.period,
      clientNumber: billing.data.clientNumber,
      senderEmail: group.senderEmail,
      emailCount: group.emails.length,
      latestEmailDate: latestEmail.date.toISOString(),
    });
  }

  // 7. Discovery pass — find billing services not in the catalog
  try {
    const discovered = await discoverUnknownServices(accessToken, userId, seenIds, processedSet, newerThan);

    const catalogTitles = new Set(detected.map((d) => d.title.toLowerCase()));
    const catalogSenders = new Set(detected.map((d) => d.senderEmail.toLowerCase()));

    for (const d of discovered) {
      if (!catalogTitles.has(d.title.toLowerCase()) && !catalogSenders.has(d.senderEmail.toLowerCase())) {
        detected.push(d);
      }
    }
  } catch (error) {
    console.error("[scan-gmail] Discovery pass failed:", error);
  }

  // Sort: most emails first (higher confidence)
  detected.sort((a, b) => b.emailCount - a.emailCount);

  return detected;
}

// ─── Discovery scanner ──────────────────────────────────────────────

const DISCOVERY_QUERY = "(receipt OR invoice OR payment OR charge OR factura OR cobro OR cargo OR recibo OR suscripción OR subscription)";
const MAX_DISCOVERY_MESSAGES = 100;
const MAX_DISCOVERY_SENDERS = 20;

/**
 * Discover billing services not in the catalog via broad Gmail search + LLM.
 * Groups emails by sender, picks the most recent per sender,
 * and asks the LLM to identify the service and extract billing data.
 */
async function discoverUnknownServices(
  accessToken: string,
  userId: string,
  catalogSeenIds: Set<string>,
  processedIds: Set<string>,
  newerThan: string,
): Promise<DetectedService[]> {
  const query = `${DISCOVERY_QUERY} newer_than:${newerThan}`;
  console.log(`[scan-gmail] Discovery query: ${query}`);

  // 1. Fetch message IDs
  let allMessageIds: string[] = [];
  let pageToken: string | undefined;

  while (allMessageIds.length < MAX_DISCOVERY_MESSAGES) {
    const params: Record<string, string> = {
      q: query,
      maxResults: "50",
    };
    if (pageToken) params.pageToken = pageToken;

    const listResponse = await gmailFetch<GmailMessageListResponse>(
      accessToken,
      "/messages",
      params,
    );

    if (listResponse.messages) {
      allMessageIds.push(...listResponse.messages.map((m) => m.id));
    }

    pageToken = listResponse.nextPageToken;
    if (!pageToken) break;

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.log(`[scan-gmail] Discovery: ${allMessageIds.length} total messages`);

  // 2. Filter out IDs already seen by catalog scan or already processed
  const newIds = allMessageIds.filter((id) => !catalogSeenIds.has(id) && !processedIds.has(id));
  if (newIds.length === 0) return [];

  console.log(`[scan-gmail] Discovery: ${newIds.length} new messages after filtering`);

  // 3. Fetch metadata for new messages
  const metadataResults = await fetchInBatches<GmailMessageResponse>(
    accessToken,
    newIds.slice(0, MAX_DISCOVERY_MESSAGES),
    { format: "metadata", metadataHeaders: ["From", "Subject", "Date"] },
  );

  // 4. Group by sender email, count frequency
  interface DiscoveryEmailInfo {
    messageId: string;
    from: string;
    senderEmail: string;
    subject: string;
    date: Date;
  }

  const senderGroups = new Map<string, DiscoveryEmailInfo[]>();

  for (const msg of metadataResults) {
    const headers = msg.payload?.headers ?? [];
    const from = getHeader(headers, "From");
    const subject = getHeader(headers, "Subject");
    const dateStr = getHeader(headers, "Date");
    const date = dateStr ? new Date(dateStr) : new Date(Number(msg.internalDate ?? 0));

    if (!from) continue;

    const emailMatch = /<([^>]+)>/.exec(from);
    const senderEmail = (emailMatch?.[1] ?? from).toLowerCase();

    // Skip noreply-style addresses from common non-billing sources
    if (isNonBillingSender(senderEmail)) continue;

    const existing = senderGroups.get(senderEmail) ?? [];
    existing.push({ messageId: msg.id, from, senderEmail, subject, date });
    senderGroups.set(senderEmail, existing);
  }

  // 5. Pick top senders by frequency, sort each group by date (newest first)
  const topSenders = [...senderGroups.entries()]
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, MAX_DISCOVERY_SENDERS);

  // 6. For each sender: fetch the most recent email body, run discovery extraction
  const senderCandidates: Array<{ senderEmail: string; emails: DiscoveryEmailInfo[]; messageId: string }> = [];

  for (const [senderEmail, emails] of topSenders) {
    emails.sort((a, b) => b.date.getTime() - a.date.getTime());
    const mostRecent = emails[0];
    if (mostRecent) {
      senderCandidates.push({ senderEmail, emails, messageId: mostRecent.messageId });
    }
  }

  const candidateIds = senderCandidates.map((c) => c.messageId);
  const bodyResults = await fetchInBatches<GmailMessageResponse>(
    accessToken,
    candidateIds,
    { format: "full" },
  );

  const bodyMap = new Map<string, GmailMessageResponse>();
  for (const msg of bodyResults) {
    bodyMap.set(msg.id, msg);
  }

  // 7. Extract billing data via LLM
  const discovered: DetectedService[] = [];
  const discoveredNames = new Set<string>();

  for (const { senderEmail, emails, messageId } of senderCandidates) {
    const msg = bodyMap.get(messageId);
    if (!msg?.payload) continue;

    const plainText = decodeGmailBody(msg.payload);
    const headers = msg.payload.headers ?? [];
    const subject = getHeader(headers, "Subject");

    const result = await extractDiscoveryData(plainText, subject, senderEmail);

    if (!result.isBillingEmail || !result.serviceName) {
      console.log(`[scan-gmail] Discovery: skipped sender="${senderEmail}" (not billing)`);
      continue;
    }

    // Dedup by service name
    const normalizedName = result.serviceName.toLowerCase();
    if (discoveredNames.has(normalizedName)) continue;
    discoveredNames.add(normalizedName);

    const latestEmail = emails[0];
    if (!latestEmail) continue;

    console.log(`[scan-gmail] Discovery: found "${result.serviceName}" from sender="${senderEmail}"`);

    discovered.push({
      title: result.serviceName,
      provider: result.serviceName,
      category: result.category ?? "OTHER",
      section: "otros",
      frequency: "MONTHLY",
      lastAmount: result.amount,
      currency: result.currency,
      dueDate: result.dueDate,
      period: result.period,
      clientNumber: null,
      senderEmail,
      emailCount: emails.length,
      latestEmailDate: latestEmail.date.toISOString(),
    });
  }

  // 8. Mark all discovery emails as processed
  const discoveryEmailsToMark = metadataResults.map((msg) => ({
    gmailMessageId: msg.id,
    userId,
    serviceName: null,
  }));

  if (discoveryEmailsToMark.length > 0) {
    await prisma.processedEmail.createMany({
      data: discoveryEmailsToMark,
      skipDuplicates: true,
    });
  }

  return discovered;
}

/** Sender domains that are unlikely to be billing emails */
const NON_BILLING_DOMAINS = new Set([
  "accounts.google.com", "googlemail.com", "facebookmail.com",
  "twitter.com", "x.com", "linkedin.com", "pinterest.com",
  "reddit.com", "quora.com", "medium.com",
]);

function isNonBillingSender(senderEmail: string): boolean {
  const domain = senderEmail.split("@")[1] ?? "";
  return NON_BILLING_DOMAINS.has(domain);
}
