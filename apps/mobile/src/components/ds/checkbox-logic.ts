export type CheckboxState = "pending" | "pressed" | "done" | "toVerify" | "transferred";

/**
 * §7 "Tildar tarea" / "Destildar": toggling a pending checkbox completes it
 * (or routes to `toVerify` for TEEN/CHILD per §7); toggling a completed one
 * reverses it. `transferred` is driven externally and never toggles locally.
 */
export function getToggledState(current: CheckboxState, requiresVerification: boolean): CheckboxState {
  if (current === "transferred") return current;
  if (current === "done" || current === "toVerify") return "pending";
  return requiresVerification ? "toVerify" : "done";
}

export function isCheckboxInteractive(state: CheckboxState): boolean {
  return state !== "transferred";
}
