import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { updateServiceSchema } from "@/lib/validations/service";
import { calculateNextDueDate } from "@/lib/service-utils";
import { handleApiError } from "@/lib/api-response";
import { Prisma } from "@prisma/client";

import type { NextRequest } from "next/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/services/[id]
 * Update a service.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const member = await requireMember();
    const { id } = await context.params;

    const existing = await prisma.service.findFirst({
      where: { id, householdId: member.householdId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
    }

    const body = (await request.json()) as unknown;
    const validation = updateServiceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const data = validation.data;

    // If frequency changed, recalculate nextDueDate
    let nextDueDate = data.nextDueDate ? new Date(data.nextDueDate) : undefined;
    if (data.frequency && data.frequency !== existing.frequency && !data.nextDueDate) {
      nextDueDate = calculateNextDueDate(
        data.frequency,
        new Date(),
        data.dayOfMonth ?? existing.dayOfMonth,
        data.dayOfWeek ?? existing.dayOfWeek,
      );
    }

    // If paidById changed, verify membership
    if (data.paidById && data.paidById !== existing.paidById) {
      const paidByMember = await prisma.member.findFirst({
        where: { id: data.paidById, householdId: member.householdId, isActive: true },
      });
      if (!paidByMember) {
        return NextResponse.json(
          { error: "El miembro que paga no pertenece al hogar" },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.service.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.provider !== undefined && { provider: data.provider }),
        ...(data.accountNumber !== undefined && { accountNumber: data.accountNumber }),
        ...(data.lastAmount !== undefined && {
          lastAmount: data.lastAmount != null
            ? new Prisma.Decimal(data.lastAmount.toFixed(2))
            : null,
        }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.splitType !== undefined && { splitType: data.splitType }),
        ...(data.paidById !== undefined && { paidById: data.paidById }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.frequency !== undefined && { frequency: data.frequency }),
        ...(data.dayOfMonth !== undefined && { dayOfMonth: data.dayOfMonth }),
        ...(data.dayOfWeek !== undefined && { dayOfWeek: data.dayOfWeek }),
        ...(data.autoGenerate !== undefined && { autoGenerate: data.autoGenerate }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(nextDueDate && { nextDueDate }),
      },
      include: { paidBy: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      ...updated,
      lastAmount: updated.lastAmount?.toNumber() ?? null,
      nextDueDate: updated.nextDueDate.toISOString(),
      lastGeneratedAt: updated.lastGeneratedAt?.toISOString() ?? null,
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/services/[id]", method: "PATCH" });
  }
}

/**
 * DELETE /api/services/[id]
 * Delete a service and its invoices (cascaded).
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const member = await requireMember();
    const { id } = await context.params;

    const existing = await prisma.service.findFirst({
      where: { id, householdId: member.householdId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
    }

    await prisma.service.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { route: "/api/services/[id]", method: "DELETE" });
  }
}
