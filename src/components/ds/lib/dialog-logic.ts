/**
 * §6.16 — destructive household confirmation requires typing the exact name;
 * trimmed so trailing whitespace from the input doesn't block the match.
 */
export function isConfirmNameMatch(input: string, expectedName: string): boolean {
  return input.trim() === expectedName.trim() && expectedName.trim().length > 0;
}
