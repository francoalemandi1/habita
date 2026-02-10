import { NextResponse } from "next/server";

import {
  AppError,
  mapPrismaError,
  mapSessionError,
  logApiError,
} from "./errors";

interface ErrorResponseContext {
  route: string;
  method: string;
  userId?: string;
  householdId?: string;
  [key: string]: unknown;
}

/**
 * Centralized error handler for API routes.
 * Maps known errors (session, Prisma, AppError) to proper HTTP responses
 * and logs with structured context.
 *
 * Usage:
 *   catch (error) {
 *     return handleApiError(error, { route: "/api/tasks", method: "POST" });
 *   }
 */
export function handleApiError(
  error: unknown,
  context: ErrorResponseContext,
): NextResponse {
  // 1. AppError — already typed with status code
  if (error instanceof AppError) {
    logApiError(error, context);
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode },
    );
  }

  // 2. Session/auth errors (thrown as plain Error by requireAuth/requireMember)
  const sessionError = mapSessionError(error);
  if (sessionError) {
    logApiError(sessionError, context);
    return NextResponse.json(
      { error: sessionError.message, code: sessionError.code },
      { status: sessionError.statusCode },
    );
  }

  // 3. Prisma errors
  const prismaError = mapPrismaError(error);
  if (prismaError) {
    logApiError(prismaError, context);
    return NextResponse.json(
      { error: prismaError.message, code: prismaError.code },
      { status: prismaError.statusCode },
    );
  }

  // 4. JSON parse errors
  if (error instanceof SyntaxError && error.message.includes("JSON")) {
    logApiError(error, context);
    return NextResponse.json(
      { error: "Cuerpo de la petición inválido (JSON malformado)", code: "INVALID_JSON" },
      { status: 400 },
    );
  }

  // 5. Unknown errors — 500
  logApiError(error, context);
  return NextResponse.json(
    { error: "Error interno del servidor", code: "INTERNAL_ERROR" },
    { status: 500 },
  );
}
