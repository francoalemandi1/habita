import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";
import type { SerializedInvoice } from "@/types/expense";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/services/[id]/invoices
 * List invoices for a specific service.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const member = await requireMember();
    const { id } = await context.params;

    const service = await prisma.service.findFirst({
      where: { id, householdId: member.householdId },
      select: { id: true },
    });

    if (!service) {
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
    }

    const invoices = await prisma.invoice.findMany({
      where: { serviceId: id },
      orderBy: { dueDate: "desc" },
      take: 24,
    });

    const serialized: SerializedInvoice[] = invoices.map((inv) => ({
      id: inv.id,
      serviceId: inv.serviceId,
      period: inv.period,
      amount: inv.amount.toNumber(),
      dueDate: inv.dueDate.toISOString(),
      status: inv.status,
      pdfUrl: inv.pdfUrl,
      expenseId: inv.expenseId,
      notes: inv.notes,
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    return handleApiError(error, { route: "/api/services/[id]/invoices", method: "GET" });
  }
}
