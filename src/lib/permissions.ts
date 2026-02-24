import type { MemberType } from "@prisma/client";

/**
 * Define what actions each member type can perform.
 */
export const MEMBER_PERMISSIONS: Record<MemberType, Set<string>> = {
  ADULT: new Set([
    // Full access
    "task:create",
    "task:edit",
    "task:delete",
    "task:assign",
    "assignment:complete",
    "assignment:verify",
    "rotation:manage",
    "transfer:request",
    "transfer:respond",
    "preference:manage",
    "absence:manage",
    "member:manage",
  ]),
  TEEN: new Set([
    // Limited access
    "assignment:complete",
    "transfer:request",
    "transfer:respond",
    "preference:manage",
  ]),
  CHILD: new Set([
    // Very limited access
    "assignment:complete",
  ]),
};

/**
 * Check if a member type has a specific permission.
 */
export function hasPermission(memberType: MemberType, permission: string): boolean {
  return MEMBER_PERMISSIONS[memberType].has(permission);
}

/**
 * Get all permissions for a member type.
 */
export function getPermissions(memberType: MemberType): string[] {
  return Array.from(MEMBER_PERMISSIONS[memberType]);
}
