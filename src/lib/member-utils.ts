import { cyclingColors } from "@/lib/design-tokens";

/** Returns a stable color for a member based on their position in the members list. */
export function getMemberColor(memberId: string, allMembers: { id: string }[]): string {
  const index = allMembers.findIndex((m) => m.id === memberId);
  const safeIndex = index === -1 ? 0 : index;
  return cyclingColors[safeIndex % cyclingColors.length]!;
}

/** Returns the first letter of a name, uppercased. */
export function getInitial(name: string): string {
  return (name[0] ?? "?").toUpperCase();
}
