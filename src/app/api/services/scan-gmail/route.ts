import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { getGmailAccessToken } from "@/lib/gmail/token";
import { scanGmailForServices } from "@/lib/gmail/scanner";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/services/scan-gmail
 * Scan the user's Gmail for known service senders and return detected services.
 * Does NOT create anything — the user must confirm via /api/services/import.
 */
export async function POST() {
  try {
    const member = await requireMember();
    const userId = member.userId;

    const accessToken = await getGmailAccessToken(userId);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Gmail no conectado", code: "GMAIL_NOT_CONNECTED" },
        { status: 400 },
      );
    }

    // Get household city for province-based query filtering
    const household = await prisma.household.findUnique({
      where: { id: member.householdId },
      select: { city: true },
    });

    let detected;
    try {
      detected = await scanGmailForServices(accessToken, household?.city ?? null, userId);
    } catch (scanError) {
      console.error("[scan-gmail] Gmail API scan failed:", scanError);
      return NextResponse.json(
        { error: "Error al escanear Gmail. Intenta reconectar tu cuenta.", code: "GMAIL_SCAN_FAILED" },
        { status: 502 },
      );
    }

    // Filter out services that already exist in the household
    const existingServices = await prisma.service.findMany({
      where: { householdId: member.householdId },
      select: { id: true, title: true, provider: true },
    });

    const existingByTitle = new Map(
      existingServices.map((s) => [s.title.toLowerCase(), s]),
    );
    const existingByProvider = new Map(
      existingServices
        .filter((s) => s.provider)
        .map((s) => [s.provider!.toLowerCase(), s]),
    );

    const alreadyExists: Array<{ id: string; title: string }> = [];
    const newDetected = detected.filter((d) => {
      const byTitle = existingByTitle.get(d.title.toLowerCase());
      const byProvider = existingByProvider.get(d.provider.toLowerCase());
      const match = byTitle ?? byProvider;

      if (match) {
        alreadyExists.push({ id: match.id, title: d.title });
        return false;
      }
      return true;
    });

    // Update lastScanAt
    await prisma.gmailConnection.update({
      where: { userId },
      data: { lastScanAt: new Date() },
    });

    return NextResponse.json({ detected: newDetected, alreadyExists });
  } catch (error) {
    return handleApiError(error, { route: "/api/services/scan-gmail", method: "POST" });
  }
}
