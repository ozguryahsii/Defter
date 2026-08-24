import { prisma } from "./prisma";
import { equalShares } from "./settlement";
import { logActivity } from "./activity";
import { getT } from "./i18n/server";

function advance(date: Date, interval: string): Date {
  const d = new Date(date);
  if (interval === "weekly") {
    d.setDate(d.getDate() + 7);
  } else {
    d.setMonth(d.getMonth() + 1); // monthly (default)
  }
  return d;
}

/**
 * Materializes any due occurrences of a group's recurring expense templates.
 * Idempotent: each call only creates occurrences whose scheduled date has
 * already passed, then advances the template's nextRunAt. Safe to call on load.
 */
export async function materializeRecurring(groupId: string): Promise<void> {
  const now = new Date();
  const due = await prisma.recurringExpense.findMany({
    where: { groupId, active: true, nextRunAt: { lte: now } },
  });
  if (due.length === 0) return;

  const members = await prisma.groupMember.findMany({ where: { groupId } });
  const memberIds = new Set(members.map((m) => m.userId));

  for (const tpl of due) {
    if (!memberIds.has(tpl.payerId)) continue; // payer left the group

    let participants: string[] = [];
    try {
      participants = (JSON.parse(tpl.participantIds) as string[]).filter((id) =>
        memberIds.has(id),
      );
    } catch {
      participants = [];
    }
    if (participants.length === 0) participants = [...memberIds];

    let runAt = new Date(tpl.nextRunAt);
    let created = 0;
    // Cap iterations so a long-dormant template can't create hundreds at once.
    for (let guard = 0; guard < 60 && runAt <= now; guard++) {
      await prisma.expense.create({
        data: {
          groupId,
          payerId: tpl.payerId,
          amount: tpl.amount,
          description: tpl.description,
          category: tpl.category,
          date: runAt,
          splitType: "Equal",
          recurringId: tpl.id,
          shares: { create: equalShares(tpl.amount, participants) },
        },
      });
      created++;
      runAt = advance(runAt, tpl.interval);
    }

    await prisma.recurringExpense.update({
      where: { id: tpl.id },
      data: { nextRunAt: runAt },
    });

    if (created > 0) {
      await logActivity({
        groupId,
        actorId: tpl.payerId,
        type: "recurring.run",
        summary: getT()('Tekrarlayan "{desc}" {n} kez işlendi', { desc: tpl.description, n: created }),
      });
    }
  }
}
