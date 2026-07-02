import { prisma } from "./prisma";
import {
  calculateSettlement,
  type SettlementResult,
} from "./settlement";
import { materializeRecurring } from "./recurring";
import { formatCurrency } from "./format";

export type GroupWithData = Awaited<
  ReturnType<typeof loadUserGroups>
>[number];

/** Loads every group the user belongs to, with members + expenses fully hydrated. */
export async function loadUserGroups(userId: string) {
  return prisma.group.findMany({
    where: { members: { some: { userId } } },
    orderBy: { createdAt: "desc" },
    include: {
      members: { include: { user: true } },
      expenses: {
        orderBy: { date: "desc" },
        include: {
          payer: true,
          shares: { include: { user: true } },
        },
      },
      settlements: {
        orderBy: { createdAt: "desc" },
        include: { fromUser: true, toUser: true },
      },
    },
  });
}

function settlementInputFor(group: GroupWithData) {
  return {
    members: group.members.map((m) => ({
      userId: m.userId,
      userName: m.user.displayName ?? m.user.username,
    })),
    expenses: group.expenses.map((e) => ({
      payerId: e.payerId,
      amount: e.amount,
      shares: e.shares.map((s) => ({ userId: s.userId, amount: s.amount })),
    })),
    settlements: group.settlements.map((p) => ({
      fromUserId: p.fromUserId,
      toUserId: p.toUserId,
      amount: p.amount,
    })),
  };
}

function settlementFor(group: GroupWithData): SettlementResult {
  return calculateSettlement(settlementInputFor(group));
}

export function groupTotal(group: GroupWithData): number {
  return group.expenses.reduce((sum, e) => sum + e.amount, 0);
}

export type GroupSummary = {
  id: string;
  name: string;
  type: string;
  currency: string;
  memberCount: number;
  expenseCount: number;
  total: number;
  yourBalance: number;
  members: { id: string; name: string }[];
  lastActivity: Date | null;
  archived: boolean;
};

export function summarize(group: GroupWithData, userId: string): GroupSummary {
  const settlement = settlementFor(group);
  const yourBalance =
    settlement.balances.find((b) => b.userId === userId)?.amount ?? 0;
  return {
    id: group.id,
    name: group.name,
    type: group.type,
    archived: group.archivedAt != null,
    currency: group.currency,
    memberCount: group.members.length,
    expenseCount: group.expenses.length,
    total: groupTotal(group),
    yourBalance,
    members: group.members.map((m) => ({
      id: m.userId,
      name: m.user.displayName ?? m.user.username,
    })),
    lastActivity: group.expenses[0]?.date ?? group.createdAt,
  };
}

export type DetailRow = { left: string; sub?: string; right: string };

export type DashboardDetails = {
  spent: DetailRow[];
  paid: DetailRow[];
  owedToYou: DetailRow[];
  youOwe: DetailRow[];
  pending: DetailRow[];
};

export type DashboardData = {
  groups: GroupSummary[];
  kpis: {
    totalGroups: number;
    totalSpent: number;
    youPaid: number;
    netBalance: number;
    owedToYou: number;
    youOwe: number;
    pendingSettlements: number;
  };
  details: DashboardDetails;
  monthlySpend: { month: string; amount: number }[];
  categoryBreakdown: { category: string; amount: number }[];
  memberSpend: { name: string; paid: number }[];
  recentExpenses: {
    id: string;
    description: string;
    category: string | null;
    amount: number;
    currency: string;
    date: Date;
    payerName: string;
    groupName: string;
  }[];
  primaryCurrency: string;
};

const MONTH_LABELS = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];

export async function getDashboardData(userId: string): Promise<DashboardData> {
  // Personal budget groups live on their own screen; the dashboard is for
  // shared groups only.
  const groups = (await loadUserGroups(userId)).filter(
    (g) => g.type !== "Kisisel" && g.archivedAt == null,
  );
  const summaries = groups.map((g) => summarize(g, userId));

  const totalSpent = summaries.reduce((s, g) => s + g.total, 0);
  const netBalance = summaries.reduce((s, g) => s + g.yourBalance, 0);
  const primaryCurrency = groups[0]?.currency ?? "TRY";

  let youPaid = 0;
  let pendingSettlements = 0;
  const categoryMap = new Map<string, number>();
  const memberMap = new Map<string, number>();
  const monthMap = new Map<string, number>();
  const recent: DashboardData["recentExpenses"] = [];

  // Seed last 6 months so the chart is never empty.
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthMap.set(`${d.getFullYear()}-${d.getMonth()}`, 0);
  }

  const details: DashboardDetails = {
    spent: [],
    paid: [],
    owedToYou: [],
    youOwe: [],
    pending: [],
  };
  let owedToYouTotal = 0;
  let youOweTotal = 0;

  for (const g of groups) {
    const settlement = calculateSettlement(settlementInputFor(g));
    pendingSettlements += settlement.transfers.filter(
      (t) => t.fromUserId === userId || t.toUserId === userId,
    ).length;

    // KPI drill-down rows
    if (g.expenses.length > 0) {
      details.spent.push({
        left: g.name,
        sub: `${g.expenses.length} harcama`,
        right: formatCurrency(groupTotal(g), g.currency),
      });
    }
    const paidInGroup = g.expenses
      .filter((e) => e.payerId === userId)
      .reduce((s, e) => s + e.amount, 0);
    if (paidInGroup > 0) {
      details.paid.push({
        left: g.name,
        right: formatCurrency(paidInGroup, g.currency),
      });
    }
    for (const t of settlement.transfers) {
      if (t.toUserId === userId) {
        owedToYouTotal += t.amount;
        details.owedToYou.push({
          left: t.fromUserName,
          sub: g.name,
          right: formatCurrency(t.amount, g.currency),
        });
      }
      if (t.fromUserId === userId) {
        youOweTotal += t.amount;
        details.youOwe.push({
          left: t.toUserName,
          sub: g.name,
          right: formatCurrency(t.amount, g.currency),
        });
      }
      if (t.fromUserId === userId || t.toUserId === userId) {
        details.pending.push({
          left: `${t.fromUserName} → ${t.toUserName}`,
          sub: g.name,
          right: formatCurrency(t.amount, g.currency),
        });
      }
    }

    for (const e of g.expenses) {
      if (e.payerId === userId) youPaid += e.amount;

      const cat = e.category?.trim() || "Diğer";
      categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + e.amount);

      const payerName = e.payer.displayName ?? e.payer.username;
      memberMap.set(payerName, (memberMap.get(payerName) ?? 0) + e.amount);

      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (monthMap.has(key)) monthMap.set(key, (monthMap.get(key) ?? 0) + e.amount);

      recent.push({
        id: e.id,
        description: e.description,
        category: e.category,
        amount: e.amount,
        currency: g.currency,
        date: e.date,
        payerName,
        groupName: g.name,
      });
    }
  }

  const monthlySpend = [...monthMap.entries()].map(([key, amount]) => {
    const [, m] = key.split("-").map(Number);
    return { month: MONTH_LABELS[m], amount: Math.round(amount) };
  });

  const categoryBreakdown = [...categoryMap.entries()]
    .map(([category, amount]) => ({ category, amount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  const memberSpend = [...memberMap.entries()]
    .map(([name, paid]) => ({ name, paid: Math.round(paid) }))
    .sort((a, b) => b.paid - a.paid)
    .slice(0, 6);

  recent.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    groups: summaries,
    kpis: {
      totalGroups: summaries.length,
      totalSpent,
      youPaid,
      netBalance,
      owedToYou: owedToYouTotal,
      youOwe: youOweTotal,
      pendingSettlements,
    },
    details,
    monthlySpend,
    categoryBreakdown,
    memberSpend,
    recentExpenses: recent.slice(0, 6),
    primaryCurrency,
  };
}

export type SettledItem = {
  id: string;
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
  confirmedById: string;
  createdAt: Date;
};

export type ActivityItem = {
  id: string;
  type: string;
  summary: string;
  actorName: string;
  createdAt: Date;
};

export type RecurringItem = {
  id: string;
  description: string;
  category: string | null;
  amount: number;
  interval: string;
  nextRunAt: Date;
  payerName: string;
};

export type PendingInvite = { id: string; toName: string; fromName: string };

export type GroupDetail = {
  group: GroupWithData;
  settlement: SettlementResult;
  total: number;
  settled: SettledItem[];
  activities: ActivityItem[];
  recurring: RecurringItem[];
  monthSpend: number;
  budget: number | null;
  pendingInvites: PendingInvite[];
};

export async function getGroupDetail(
  groupId: string,
  userId: string,
): Promise<GroupDetail | null> {
  // Confirm membership before doing any work (also gates materialization).
  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId },
    select: { id: true },
  });
  if (!membership) return null;

  // Create any due recurring occurrences before loading the group.
  await materializeRecurring(groupId);

  const group = await prisma.group.findFirst({
    where: { id: groupId, members: { some: { userId } } },
    include: {
      members: { include: { user: true } },
      expenses: {
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        include: {
          payer: true,
          shares: { include: { user: true } },
        },
      },
      settlements: {
        orderBy: { createdAt: "desc" },
        include: { fromUser: true, toUser: true },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { actor: true },
      },
      recurring: { orderBy: { nextRunAt: "asc" } },
    },
  });
  if (!group) return null;

  const settled: SettledItem[] = group.settlements.map((p) => ({
    id: p.id,
    fromUserId: p.fromUserId,
    fromName: p.fromUser.displayName ?? p.fromUser.username,
    toUserId: p.toUserId,
    toName: p.toUser.displayName ?? p.toUser.username,
    amount: p.amount,
    confirmedById: p.confirmedById,
    createdAt: p.createdAt,
  }));

  const activities: ActivityItem[] = group.activities.map((a) => ({
    id: a.id,
    type: a.type,
    summary: a.summary,
    actorName: a.actor.displayName ?? a.actor.username,
    createdAt: a.createdAt,
  }));

  const nameById = new Map(
    group.members.map((m) => [m.userId, m.user.displayName ?? m.user.username]),
  );
  const recurring: RecurringItem[] = group.recurring.map((r) => ({
    id: r.id,
    description: r.description,
    category: r.category,
    amount: r.amount,
    interval: r.interval,
    nextRunAt: r.nextRunAt,
    payerName: nameById.get(r.payerId) ?? "—",
  }));

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthSpend = group.expenses
    .filter((e) => e.kind !== "income" && new Date(e.date) >= monthStart)
    .reduce((s, e) => s + e.amount, 0);

  const pendingReqs = await prisma.groupJoinRequest.findMany({
    where: { groupId, status: "pending" },
    include: { to: true, from: true },
    orderBy: { createdAt: "desc" },
  });
  const pendingInvites: PendingInvite[] = pendingReqs.map((r) => ({
    id: r.id,
    toName: r.to.displayName ?? r.to.username,
    fromName: r.from.displayName ?? r.from.username,
  }));

  return {
    group,
    settlement: settlementFor(group),
    total: groupTotal(group),
    settled,
    activities,
    recurring,
    monthSpend,
    budget: group.monthlyBudget ?? null,
    pendingInvites,
  };
}

export async function getGroupsList(userId: string): Promise<GroupSummary[]> {
  const groups = await loadUserGroups(userId);
  return groups
    .filter((g) => g.type !== "Kisisel")
    .map((g) => summarize(g, userId));
}
