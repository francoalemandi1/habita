import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { verifyCsrfOrigin } from "@/lib/csrf";
import { Prisma } from "@prisma/client";

import type { NextRequest } from "next/server";

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const contributeSchema = z.object({
  amount: z.number().positive(),
  period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  notes: z.string().max(500).optional(),
});

/**
 * POST /api/fund/contribute
 * Register a contribution from the current member for the given period.
 */
export async function POST(request: NextRequest) {
  try {
    const csrfBlocked = verifyCsrfOrigin(request);
    if (csrfBlocked) return csrfBlocked;

    const member = await requireMember();
    const body = (await request.json()) as unknown;
    const validation = contributeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const fund = await prisma.sharedFund.findUnique({
      where: { householdId: member.householdId },
    });

    if (!fund) {
      return NextResponse.json({ error: "El fondo no existe" }, { status: 404 });
    }

    if (!fund.isActive) {
      return NextResponse.json({ error: "El fondo está inactivo" }, { status: 400 });
    }

    const { amount, period, notes } = validation.data;

    const contribution = await prisma.fundContribution.create({
      data: {
        fundId: fund.id,
        memberId: member.id,
        amount: new Prisma.Decimal(amount.toFixed(2)),
        period: period ?? getCurrentPeriod(),
        notes: notes ?? null,
      },
    });

    return NextResponse.json(
      {
        id: contribution.id,
        amount: contribution.amount.toNumber(),
        period: contribution.period,
        createdAt: contribution.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error, { route: "/api/fund/contribute", method: "POST" });
  }
}
