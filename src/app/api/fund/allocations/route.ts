import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { Prisma } from "@prisma/client";

import type { NextRequest } from "next/server";

const allocationsSchema = z.object({
  allocations: z.array(
    z.object({
      memberId: z.string(),
      amount: z.number().min(0),
    }),
  ).min(1),
});

/**
 * PUT /api/fund/allocations
 * Update monthly allocations for all members.
 * Members with amount=0 will have their allocation deleted.
 */
export async function PUT(request: NextRequest) {
  try {
    const member = await requireMember();
    const body = (await request.json()) as unknown;
    const validation = allocationsSchema.safeParse(body);

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

    const { allocations } = validation.data;

    await Promise.all(
      allocations.map((alloc) => {
        if (alloc.amount === 0) {
          return prisma.fundAllocation.deleteMany({
            where: { fundId: fund.id, memberId: alloc.memberId },
          });
        }
        return prisma.fundAllocation.upsert({
          where: { fundId_memberId: { fundId: fund.id, memberId: alloc.memberId } },
          create: {
            fundId: fund.id,
            memberId: alloc.memberId,
            amount: new Prisma.Decimal(alloc.amount.toFixed(2)),
          },
          update: {
            amount: new Prisma.Decimal(alloc.amount.toFixed(2)),
          },
        });
      }),
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, { route: "/api/fund/allocations", method: "PUT" });
  }
}
