export type TelemetryLevel = "info" | "warn" | "error";

export function trackMobileEvent(level: TelemetryLevel, message: string, context?: Record<string, unknown>): void {
  const payload = context ? { message, ...context } : { message };
  if (level === "error") {
    console.error("[mobile]", payload);
    return;
  }
  if (level === "warn") {
    console.warn("[mobile]", payload);
    return;
  }
  console.log("[mobile]", payload);
}
