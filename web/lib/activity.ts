import { prisma } from "./prisma";

export type ActivityType =
  | "group.create"
  | "member.add"
  | "member.join"
  | "expense.add"
  | "expense.edit"
  | "expense.delete"
  | "settle"
  | "unsettle"
  | "budget.set"
  | "recurring.add"
  | "recurring.run";

/**
 * Records a group activity / audit entry. Never throws — activity logging must
 * not break the primary action it accompanies.
 */
export async function logActivity(input: {
  groupId: string;
  actorId: string;
  type: ActivityType;
  summary: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.activity.create({
      data: {
        groupId: input.groupId,
        actorId: input.actorId,
        type: input.type,
        summary: input.summary,
        meta: input.meta ? JSON.stringify(input.meta) : null,
      },
    });
  } catch {
    // swallow — logging is best-effort
  }
}
