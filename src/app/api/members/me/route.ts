import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { handleApiError } from "@/lib/api-response";
import { availabilitySchema, quietHourValueSchema } from "@habita/contracts";
import { Prisma } from "@prisma/client";

import type { NextRequest } from "next/server";

const updateMemberSchema = z
  .object({
    name: z.string().min(1, "El nombre es obligatorio").max(50, "Máximo 50 caracteres").optional(),
    quietHoursStart: quietHourValueSchema.nullable().optional(),
    quietHoursEnd: quietHourValueSchema.nullable().optional(),
    availability: availabilitySchema.nullable().optional(),
  })
  .superRefine((value, ctx) => {
    const hasStart = value.quietHoursStart !== undefined;
    const hasEnd = value.quietHoursEnd !== undefined;

    if (hasStart !== hasEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "quietHoursStart y quietHoursEnd deben enviarse juntos",
        path: [hasStart ? "quietHoursEnd" : "quietHoursStart"],
      });
      return;
    }

    if (!hasStart) return;

    const bothNull = value.quietHoursStart === null && value.quietHoursEnd === null;
    const bothSet = value.quietHoursStart !== null && value.quietHoursEnd !== null;

    if (!bothNull && !bothSet) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "quietHoursStart y quietHoursEnd deben ser ambos null o ambos un número",
        path: ["quietHoursStart"],
      });
      return;
    }

    if (bothSet && value.quietHoursStart === value.quietHoursEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "quietHoursStart y quietHoursEnd no pueden ser iguales",
        path: ["quietHoursEnd"],
      });
    }
  });

/**
 * GET /api/members/me
 * Get the current user's member record
 */
export async function GET() {
  try {
    const member = await getCurrentMember();

    if (!member) {
      return NextResponse.json({ member: null });
    }

    return NextResponse.json({ member });
  } catch (error) {
    return handleApiError(error, { route: "/api/members/me", method: "GET" });
  }
}

/**
 * PATCH /api/members/me
 * Update the current member's name
 */
export async function PATCH(request: NextRequest) {
  try {
    const member = await getCurrentMember();

    if (!member) {
      return NextResponse.json({ error: "No member found" }, { status: 404 });
    }

    const body: unknown = await request.json();
    const validation = updateMemberSchema.safeParse(body);

    if (!validation.success) {
      const message = validation.error.errors[0]?.message ?? "Datos inválidos";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { name, quietHoursStart, quietHoursEnd, availability } = validation.data;

    const updated = await prisma.member.update({
      where: { id: member.id },
      data: {
        ...(name !== undefined && { name }),
        ...(quietHoursStart !== undefined && { quietHoursStart }),
        ...(quietHoursEnd !== undefined && { quietHoursEnd }),
        ...(availability !== undefined && { availability: availability ?? Prisma.JsonNull }),
      },
    });

    return NextResponse.json({ member: updated });
  } catch (error) {
    return handleApiError(error, { route: "/api/members/me", method: "PATCH" });
  }
}
