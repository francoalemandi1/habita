import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { createServiceSchema } from "@/lib/validations/service";
import { handleApiError } from "@/lib/api-response";
import { Prisma } from "@prisma/client";

import type { NextRequest } from "next/server";
import type { SerializedService } from "@/types/expense";

function serializeService(service: {
  id: string;
  title: string;
  provider: string | null;
  accountNumber: string | null;
  lastAmount: Prisma.Decimal | null;
  currency: string;
  category: string;
  splitType: string;
  paidById: string;
  paidBy: { id: string; name: string };
  notes: string | null;
  frequency: string;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  autoGenerate: boolean;
  nextDueDate: Date;
  lastGeneratedAt: Date | null;
  isActive: boolean;
}): SerializedService {
  return {
    ...service,
    lastAmount: service.lastAmount?.toNumber() ?? null,
    nextDueDate: service.nextDueDate.toISOString(),
    lastGeneratedAt: service.lastGeneratedAt?.toISOString() ?? null,
  } as SerializedService;
}

/**
 * GET /api/services
 * List all services for the household.
 */
export async function GET() {
  try {
    const member = await requireMember();

    const services = await prisma.service.findMany({
      where: { householdId: member.householdId },
      include: { paidBy: { select: { id: true, name: true } } },
      orderBy: [{ isActive: "desc" }, { nextDueDate: "asc" }],
    });

    return NextResponse.json(services.map(serializeService));
  } catch (error) {
    return handleApiError(error, { route: "/api/services", method: "GET" });
  }
}

/**
 * POST /api/services
 * Create a new service.
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();
    const body = (await request.json()) as unknown;
    const validation = createServiceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const data = validation.data;

    const paidByMember = await prisma.member.findFirst({
      where: { id: data.paidById, householdId: member.householdId, isActive: true },
    });

    if (!paidByMember) {
      return NextResponse.json(
        { error: "El miembro que paga no pertenece al hogar" },
        { status: 400 },
      );
    }

    const service = await prisma.service.create({
      data: {
        householdId: member.householdId,
        title: data.title,
        provider: data.provider ?? null,
        accountNumber: data.accountNumber ?? null,
        lastAmount: data.lastAmount != null
          ? new Prisma.Decimal(data.lastAmount.toFixed(2))
          : null,
        category: data.category,
        splitType: data.splitType,
        paidById: data.paidById,
        notes: data.notes ?? null,
        frequency: data.frequency,
        dayOfMonth: data.dayOfMonth ?? null,
        dayOfWeek: data.dayOfWeek ?? null,
        autoGenerate: data.autoGenerate,
        nextDueDate: new Date(data.nextDueDate),
      },
      include: { paidBy: { select: { id: true, name: true } } },
    });

    return NextResponse.json(serializeService(service), { status: 201 });
  } catch (error) {
    return handleApiError(error, { route: "/api/services", method: "POST" });
  }
}
