import { Prisma } from "@prisma/client";

/**
 * Base application error with HTTP status code.
 * All domain errors should extend this.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Datos inválidos") {
    super(message, 400, "BAD_REQUEST");
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "No autenticado") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "No tienes permiso para esta acción") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Recurso") {
    super(`${resource} no encontrado`, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "El recurso ya existe") {
    super(message, 409, "CONFLICT");
    this.name = "ConflictError";
  }
}

export class InsufficientPointsError extends AppError {
  constructor(
    public needed: number,
    public available: number,
  ) {
    super(
      `No tienes suficientes puntos. Necesitas ${needed}, tienes ${available}`,
      400,
      "INSUFFICIENT_POINTS",
    );
    this.name = "InsufficientPointsError";
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = "Servicio no disponible temporalmente") {
    super(message, 503, "SERVICE_UNAVAILABLE");
    this.name = "ServiceUnavailableError";
  }
}

/**
 * Map Prisma client errors to typed AppErrors.
 */
export function mapPrismaError(error: unknown): AppError | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002": {
        const target = (error.meta?.target as string[]) ?? [];
        return new ConflictError(
          `Ya existe un registro con ${target.join(", ")}`,
        );
      }
      case "P2025":
        return new NotFoundError("Registro");
      case "P2003":
        return new BadRequestError("Referencia inválida: el recurso relacionado no existe");
      case "P2014":
        return new BadRequestError("Violación de relación requerida");
      default:
        return null;
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new BadRequestError("Error de validación en la consulta");
  }

  return null;
}

/**
 * Map session/auth thrown errors to typed AppErrors.
 * The session helpers throw plain Error with specific messages.
 */
export function mapSessionError(error: unknown): AppError | null {
  if (!(error instanceof Error)) return null;

  switch (error.message) {
    case "Unauthorized":
      return new UnauthorizedError();
    case "Not a member of any household":
      return new ForbiddenError("No eres miembro de ningún hogar");
    case "Forbidden":
      return new ForbiddenError();
    default:
      return null;
  }
}

interface LogContext {
  route: string;
  method: string;
  userId?: string;
  householdId?: string;
  [key: string]: unknown;
}

/**
 * Log an API error with structured context for debugging.
 * In development, logs full details. In production, omits stack traces for non-500s.
 */
export function logApiError(error: unknown, context: LogContext): void {
  const isDev = process.env.NODE_ENV === "development";

  const base = {
    route: `${context.method} ${context.route}`,
    ...(context.userId && { userId: context.userId }),
    ...(context.householdId && { householdId: context.householdId }),
  };

  // Strip known context keys to get extra fields
  const { route: _r, method: _m, userId: _u, householdId: _h, ...extra } = context;
  const hasExtra = Object.keys(extra).length > 0;

  if (error instanceof AppError && error.statusCode < 500) {
    // Client errors — log at warn level with minimal info in prod
    if (isDev) {
      console.warn(
        `[${error.statusCode}] ${base.route}:`,
        error.message,
        hasExtra ? extra : "",
      );
    }
    return;
  }

  // Server errors — always log full details
  console.error(
    `[500] ${base.route}:`,
    {
      ...base,
      ...(hasExtra ? extra : {}),
      error: error instanceof Error ? error.message : String(error),
      ...(isDev && error instanceof Error && { stack: error.stack }),
    },
  );
}
