import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { Prisma } from "@prisma/client";

import type { NextRequest } from "next/server";

const importServiceSchema = z.object({
  title: z.string().min(1).max(100),
  provider: z.string().max(100),
  accountNumber: z.string().max(100).nullable().optional(),
  category: z.enum([
    "GROCERIES", "UTILITIES", "RENT", "FOOD", "TRANSPORT",
    "HEALTH", "ENTERTAINMENT", "EDUCATION", "HOME", "OTHER",
  ]),
  frequency: z.enum(["WEEKLY", "MONTHLY", "BIMONTHLY", "QUARTERLY", "YEARLY"]),
  lastAmount: z.number().positive().nullable(),
  currency: z.enum(["ARS", "USD"]).optional().default("ARS"),
});

const importRequestSchema = z.object({
  services: z.array(importServiceSchema).min(1).max(50),
});

/**
 * POST /api/services/import
 * Bulk-create services that were detected via Gmail scan.
 * The user confirms which services to import from the scan results.
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();
    const body = (await request.json()) as unknown;
    const validation = importRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const { services } = validation.data;

    // Calculate next due date: next month, day 1
    const nextDue = new Date();
    nextDue.setMonth(nextDue.getMonth() + 1);
    nextDue.setDate(1);
    nextDue.setHours(0, 0, 0, 0);

    const created = await prisma.$transaction(
      services.map((svc) =>
        prisma.service.create({
          data: {
            householdId: member.householdId,
            title: svc.title,
            provider: svc.provider,
            accountNumber: svc.accountNumber ?? null,
            lastAmount: svc.lastAmount != null
              ? new Prisma.Decimal(svc.lastAmount.toFixed(2))
              : null,
            category: svc.category,
            currency: svc.currency,
            frequency: svc.frequency,
            splitType: "EQUAL",
            paidById: member.id,
            autoGenerate: false,
            nextDueDate: nextDue,
            dayOfMonth: 1,
          },
        }),
      ),
    );

    return NextResponse.json(
      { imported: created.length },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error, { route: "/api/services/import", method: "POST" });
  }
}
