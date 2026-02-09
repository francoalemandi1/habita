// Re-export Prisma types for convenience
export type {
  User,
  Household,
  Member,
  Task,
  Assignment,
  MemberType,
  TaskFrequency,
  AssignmentStatus,
  PreferenceType,
} from "@prisma/client";

// Custom type definitions

/** Member with capacity based on type */
export interface MemberWithCapacity {
  id: string;
  name: string;
  memberType: "ADULT" | "TEEN" | "CHILD";
  capacity: number; // 1.0, 0.6, or 0.3
}

/** Assignment with related task and member info */
export interface AssignmentWithDetails {
  id: string;
  taskId: string;
  memberId: string;
  dueDate: Date;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "VERIFIED" | "OVERDUE" | "CANCELLED";
  completedAt: Date | null;
  pointsEarned: number | null;
  task: {
    id: string;
    name: string;
    weight: number;
  };
  member: {
    id: string;
    name: string;
  };
}

/** Member capacity constants */
export const MEMBER_CAPACITY = {
  ADULT: 1.0,
  TEEN: 0.6,
  CHILD: 0.3,
} as const;

/** Points calculation constants */
export const POINTS = {
  BASE_MULTIPLIER: 10,
  XP_PER_LEVEL: 100,
} as const;
