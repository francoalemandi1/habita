import { z } from "zod";
import { expenseCategorySchema } from "@habita/contracts";

/** Dispatched by the sidebar and bottom tab bar's "Anotar" buttons; AnotarSheet listens globally. */
export const ANOTAR_OPEN_EVENT = "habita:anotar-open";

const anotarOpenDetailSchema = z.object({
  text: z.string().optional(),
  kind: z.enum(["expense", "task", "item"]).optional(),
  expense: z
    .object({
      title: z.string().optional(),
      amount: z.number().optional(),
      category: expenseCategorySchema.optional(),
    })
    .optional(),
});

export type AnotarOpenDetail = z.infer<typeof anotarOpenDetailSchema>;

/**
 * Opens the Anotar sheet, optionally prefilled — e.g. a detected invoice's
 * "Agregar" action. With no detail this is the same as the plain open event
 * the sidebar/tab bar dispatch today.
 */
export function openAnotar(detail?: AnotarOpenDetail): void {
  if (!detail) {
    window.dispatchEvent(new Event(ANOTAR_OPEN_EVENT));
    return;
  }
  const parsed = anotarOpenDetailSchema.safeParse(detail);
  if (!parsed.success) {
    console.warn("openAnotar: invalid detail", parsed.error);
    return;
  }
  window.dispatchEvent(new CustomEvent<AnotarOpenDetail>(ANOTAR_OPEN_EVENT, { detail: parsed.data }));
}

/** Reads and validates an ANOTAR_OPEN_EVENT's detail; null for a plain (non-custom) open event. */
export function readAnotarOpenDetail(event: Event): AnotarOpenDetail | null {
  const detail: unknown = event instanceof CustomEvent ? event.detail : undefined;
  if (detail === undefined) return null;
  const parsed = anotarOpenDetailSchema.safeParse(detail);
  if (!parsed.success) {
    console.warn("readAnotarOpenDetail: invalid detail", parsed.error);
    return null;
  }
  return parsed.data;
}
