import { prisma } from "./prisma";

export type NotificationType =
  | "expense.add"
  | "settle"
  | "member.add"
  | "payment.reminder"
  | "payment.due";

/** Creates one notification. Best-effort: never throws into the caller. */
export async function notify(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  groupId?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        groupId: input.groupId ?? null,
        meta: input.meta ? JSON.stringify(input.meta) : null,
      },
    });
  } catch {
    // notifications must never break the primary action
  }
}

/** Notifies every member of a group except the actor. */
export async function notifyGroupMembers(input: {
  groupId: string;
  exceptUserId: string;
  type: NotificationType;
  title: string;
  body?: string;
}): Promise<void> {
  try {
    const members = await prisma.groupMember.findMany({
      where: { groupId: input.groupId, userId: { not: input.exceptUserId } },
      select: { userId: true },
    });
    if (members.length === 0) return;
    await prisma.notification.createMany({
      data: members.map((m) => ({
        userId: m.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        groupId: input.groupId,
      })),
    });
  } catch {
    // best-effort
  }
}
