import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createSettlementsSchema } from "@habita/contracts";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { verifyCsrfOrigin } from "@/lib/csrf";
import { ForbiddenError, BadRequestError } from "@/lib/errors";
import { assertMembersBelongToHousehold } from "@/lib/member-utils";
import { getHouseholdBalances } from "@/lib/expense-balances";
import { createNotification } from "@/lib/notification-service";
import { buildSettlementNotices } from "@/lib/settlement-notifications";

import type { NextRequest } from "next/server";
import type { CurrentMember } from "@/lib/session";
import type { CreateSettlementsInput } from "@habita/contracts";

const settlementInclude = {
  fromMember: { select: { name: true } },
  toMember: { select: { name: true } },
  createdBy: { select: { name: true } },
} as const;

type SettlementWithNames = Prisma.SettlementGetPayload<{ include: typeof settlementInclude }>;

function serializeSettlement(settlement: SettlementWithNames) {
  return {
    id: settlement.id,
    fromMemberId: settlement.fromMemberId,
    fromMemberName: settlement.fromMember.name,
    toMemberId: settlement.toMemberId,
    toMemberName: settlement.toMember.name,
    amount: settlement.amount.toNumber(),
    currency: settlement.currency,
    settledAt: settlement.settledAt.toISOString(),
    createdById: settlement.createdById,
    createdByName: settlement.createdBy.name,
    note: settlement.note,
  };
}

/** A transfer may be recorded by either of its members, or by an ADULT. */
function assertCanRecordTransfer(member: CurrentMember, transfer: CreateSettlementsInput["transfers"][number]): void {
  if (member.memberType === "ADULT") return;
  if (member.id === transfer.fromMemberId || member.id === transfer.toMemberId) return;
  throw new ForbiddenError("Solo un adulto o alguien involucrado puede registrar este pago");
}

/**
 * POST /api/settlements
 * Record one or more settlement transfers in a single transaction.
 * Idempotent: replaying the same idempotencyKey returns the existing rows.
 */
export async function POST(request: NextRequest) {
  try {
    const csrfBlocked = verifyCsrfOrigin(request);
    if (csrfBlocked) return csrfBlocked;

    const member = await requireMember();
    const body = (await request.json()) as unknown;
    const validation = createSettlementsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const { transfers, idempotencyKey, note } = validation.data;
    const householdId = member.householdId;

    for (const transfer of transfers) {
      assertCanRecordTransfer(member, transfer);
    }

    const memberIds = transfers.flatMap((t) => [t.fromMemberId, t.toMemberId]);
    const belongs = await assertMembersBelongToHousehold(memberIds, householdId);
    if (!belongs) {
      throw new BadRequestError("Todos los miembros deben pertenecer al hogar");
    }

    const keyPrefix = `${idempotencyKey}:`;
    const existing = await prisma.settlement.findMany({
      where: { householdId, idempotencyKey: { startsWith: keyPrefix } },
      include: settlementInclude,
      orderBy: { createdAt: "asc" },
    });

    const recorded =
      existing.length > 0
        ? { rows: existing, isNew: false }
        : await insertSettlements({ householdId, transfers, idempotencyKey: keyPrefix, note, createdById: member.id });
    const settlements = recorded.rows;
    // Replays (retries of the same sheet) must not notify a second time.
    if (recorded.isNew) {
      await notifySettlementParties(settlements, member);
    }

    const balances = await getHouseholdBalances(householdId);
    const primary = balances.byCurrency[balances.primaryCurrency] ?? { balances: [], transactions: [] };

    return NextResponse.json({
      settlements: settlements.map(serializeSettlement),
      balances: { ...primary, byCurrency: balances.byCurrency, primaryCurrency: balances.primaryCurrency },
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/settlements", method: "POST" });
  }
}

async function insertSettlements(params: {
  householdId: string;
  transfers: CreateSettlementsInput["transfers"];
  idempotencyKey: string;
  note: string | undefined;
  createdById: string;
}): Promise<{ rows: SettlementWithNames[]; isNew: boolean }> {
  const { householdId, transfers, idempotencyKey, note, createdById } = params;

  try {
    const rows = await prisma.$transaction(
      transfers.map((transfer, index) =>
        prisma.settlement.create({
          data: {
            householdId,
            fromMemberId: transfer.fromMemberId,
            toMemberId: transfer.toMemberId,
            amount: new Prisma.Decimal(transfer.amount.toFixed(2)),
            currency: transfer.currency,
            createdById,
            note: note ?? null,
            idempotencyKey: `${idempotencyKey}${index}`,
          },
          include: settlementInclude,
        }),
      ),
    );
    return { rows, isNew: true };
  } catch (error) {
    // Race: another request inserted the same idempotencyKey first.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const rows = await prisma.settlement.findMany({
        where: { householdId, idempotencyKey: { startsWith: idempotencyKey } },
        include: settlementInclude,
        orderBy: { createdAt: "asc" },
      });
      return { rows, isNew: false };
    }
    throw error;
  }
}

async function notifySettlementParties(rows: SettlementWithNames[], recorder: CurrentMember): Promise<void> {
  const notices = buildSettlementNotices(
    rows.map((row) => ({ ...row, amount: row.amount.toNumber() })),
    { id: recorder.id, name: recorder.name },
  );
  await Promise.all(
    notices.map((notice) =>
      createNotification({
        memberId: notice.memberId,
        type: "SETTLEMENT_RECORDED",
        title: "Pago registrado",
        message: notice.message,
        actionUrl: "/plata?v=saldos",
      }),
    ),
  );
}

const historyQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

/**
 * GET /api/settlements
 * Household settlement history, newest first, cursor pagination.
 */
export async function GET(request: NextRequest) {
  try {
    const member = await requireMember();
    const { searchParams } = new URL(request.url);
    const validation = historyQuerySchema.safeParse({
      cursor: searchParams.get("cursor") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Parámetros inválidos" },
        { status: 400 },
      );
    }

    const limit = validation.data.limit ?? 20;
    const { cursor } = validation.data;

    const rows = await prisma.settlement.findMany({
      where: { householdId: member.householdId },
      include: settlementInclude,
      orderBy: [{ settledAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;

    return NextResponse.json({ settlements: page.map(serializeSettlement), nextCursor });
  } catch (error) {
    return handleApiError(error, { route: "/api/settlements", method: "GET" });
  }
}
