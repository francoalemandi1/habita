import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGmailAccessToken } from "@/lib/gmail/token";
import { scanGmailForServices } from "@/lib/gmail/scanner";

import type { NextRequest } from "next/server";

/**
 * POST /api/cron/scan-gmail
 * Weekly cron: scan Gmail for all connected users and log new detections.
 * Protected by CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
    }
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connections = await prisma.gmailConnection.findMany({
      select: { userId: true },
    });

    let scanned = 0;
    let newServicesFound = 0;
    let errors = 0;

    for (const connection of connections) {
      try {
        const accessToken = await getGmailAccessToken(connection.userId);
        if (!accessToken) continue;

        // Get household city for the first active membership
        const members = await prisma.member.findMany({
          where: { userId: connection.userId, isActive: true },
          select: { householdId: true, household: { select: { city: true } } },
        });

        const householdCity = members[0]?.household?.city ?? null;
        const detected = await scanGmailForServices(accessToken, householdCity, connection.userId, "7d");
        scanned++;

        if (detected.length === 0) continue;

        for (const member of members) {
          const existingServices = await prisma.service.findMany({
            where: { householdId: member.householdId },
            select: { title: true, provider: true },
          });

          const existingTitles = new Set(
            existingServices.map((s) => s.title.toLowerCase()),
          );

          const newOnes = detected.filter(
            (d) => !existingTitles.has(d.title.toLowerCase()),
          );

          newServicesFound += newOnes.length;

          if (newOnes.length > 0) {
            console.log(
              `[scan-gmail] User ${connection.userId}: ${newOnes.length} new service(s) detected:`,
              newOnes.map((s) => s.title).join(", "),
            );
          }
        }

        // Update lastScanAt
        await prisma.gmailConnection.update({
          where: { userId: connection.userId },
          data: { lastScanAt: new Date() },
        });
      } catch (error) {
        errors++;
        console.error(`[scan-gmail] Error scanning user ${connection.userId}:`, error);
      }
    }

    return NextResponse.json({
      scanned,
      newServicesFound,
      errors,
      totalConnections: connections.length,
    });
  } catch (error) {
    console.error("[scan-gmail] Cron error:", error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 },
    );
  }
}
