import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { verifyCsrfOrigin } from "@/lib/csrf";
import { Prisma } from "@prisma/client";

import type { NextRequest } from "next/server";

const setupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  monthlyTarget: z.number().positive().nullable().optional(),
  fundCategories: z.array(z.string()).optional(),
  allocations: z
    .array(
      z.object({
        memberId: z.string(),
        amount: z.number().positive(),
      }),
    )
    .optional(),
});

/**
 * POST /api/fund/setup
 * Create or update the fund for the current household.
 * Also upserts member allocations if provided.
 */
export async function POST(request: NextRequest) {
  try {
    const csrfBlocked = verifyCsrfOrigin(request);
    if (csrfBlocked) return csrfBlocked;

    const member = await requireMember();
    const body = (await request.json()) as unknown;
    const validation = setupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const data = validation.data;

    // Upsert fund
    const fund = await prisma.sharedFund.upsert({
      where: { householdId: member.householdId },
      create: {
        householdId: member.householdId,
        name: data.name ?? "Fondo Común",
        monthlyTarget: data.monthlyTarget != null
          ? new Prisma.Decimal(data.monthlyTarget.toFixed(2))
          : null,
        fundCategories: data.fundCategories ?? ["RENT", "UTILITIES", "GROCERIES", "HOME"],
      },
      update: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.monthlyTarget !== undefined && {
          monthlyTarget: data.monthlyTarget != null
            ? new Prisma.Decimal(data.monthlyTarget.toFixed(2))
            : null,
        }),
        ...(data.fundCategories !== undefined && { fundCategories: data.fundCategories }),
      },
    });

    // Upsert allocations if provided
    if (data.allocations && data.allocations.length > 0) {
      await Promise.all(
        data.allocations.map((alloc) =>
          prisma.fundAllocation.upsert({
            where: { fundId_memberId: { fundId: fund.id, memberId: alloc.memberId } },
            create: {
              fundId: fund.id,
              memberId: alloc.memberId,
              amount: new Prisma.Decimal(alloc.amount.toFixed(2)),
            },
            update: {
              amount: new Prisma.Decimal(alloc.amount.toFixed(2)),
            },
          }),
        ),
      );
    }

    return NextResponse.json({ id: fund.id }, { status: 201 });
  } catch (error) {
    return handleApiError(error, { route: "/api/fund/setup", method: "POST" });
  }
}
