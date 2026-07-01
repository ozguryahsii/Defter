import { prisma } from "./prisma";
import {
  calculateSettlement,
  type SettlementResult,
} from "./settlement";

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
    },
  });
}

function settlementFor(group: GroupWithData): SettlementResult {
  return calculateSettlement({
    members: group.members.map((m) => ({
      userId: m.userId,
      userName: m.user.displayName ?? m.user.username,
    })),
    expenses: group.expenses.map((e) => ({
      payerId: e.payerId,
      amount: e.amount,
      shares: e.shares.map((s) => ({ userId: s.userId, amount: s.amount })),
    })),
  });
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
};

export function summarize(group: GroupWithData, userId: string): GroupSummary {
  const settlement = settlementFor(group);
  const yourBalance =
    settlement.balances.find((b) => b.userId === userId)?.amount ?? 0;
  return {
    id: group.id,
    name: group.name,
    type: group.type,
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
  const groups = await loadUserGroups(userId);
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

  for (const g of groups) {
    const settlement = calculateSettlement({
      members: g.members.map((m) => ({
        userId: m.userId,
        userName: m.user.displayName ?? m.user.username,
      })),
      expenses: g.expenses.map((e) => ({
        payerId: e.payerId,
        amount: e.amount,
        shares: e.shares.map((s) => ({ userId: s.userId, amount: s.amount })),
      })),
    });
    pendingSettlements += settlement.transfers.filter(
      (t) => t.fromUserId === userId || t.toUserId === userId,
    ).length;

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
      owedToYou: netBalance > 0 ? netBalance : 0,
      youOwe: netBalance < 0 ? -netBalance : 0,
      pendingSettlements,
    },
    monthlySpend,
    categoryBreakdown,
    memberSpend,
    recentExpenses: recent.slice(0, 6),
    primaryCurrency,
  };
}

export type GroupDetail = {
  group: GroupWithData;
  settlement: SettlementResult;
  total: number;
};

export async function getGroupDetail(
  groupId: string,
  userId: string,
): Promise<GroupDetail | null> {
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
    },
  });
  if (!group) return null;

  return {
    group,
    settlement: settlementFor(group),
    total: groupTotal(group),
  };
}

export async function getGroupsList(userId: string): Promise<GroupSummary[]> {
  const groups = await loadUserGroups(userId);
  return groups.map((g) => summarize(g, userId));
}
