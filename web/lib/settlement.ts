// Core settlement math — the heart of Defter.
// Ported 1:1 from the original .NET SettlementCalculator.

export type Balance = {
  userId: string;
  userName: string;
  amount: number; // positive = is owed money, negative = owes money
};

export type Transfer = {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
};

export type SettlementInput = {
  members: { userId: string; userName: string }[];
  expenses: {
    payerId: string;
    amount: number;
    shares: { userId: string; amount: number }[];
  }[];
};

export type SettlementResult = {
  balances: Balance[];
  transfers: Transfer[];
};

const EPSILON = 0.005;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Computes each member's net balance and the minimal set of transfers that
 * settles the group (greedy: largest debtor ↔ largest creditor).
 */
export function calculateSettlement(input: SettlementInput): SettlementResult {
  const names = new Map(input.members.map((m) => [m.userId, m.userName]));
  const balances = new Map<string, number>(
    input.members.map((m) => [m.userId, 0]),
  );

  for (const e of input.expenses) {
    if (balances.has(e.payerId)) {
      balances.set(e.payerId, (balances.get(e.payerId) ?? 0) + e.amount);
    }
    for (const s of e.shares) {
      if (balances.has(s.userId)) {
        balances.set(s.userId, (balances.get(s.userId) ?? 0) - s.amount);
      }
    }
  }

  const balanceList: Balance[] = [...balances.entries()]
    .map(([userId, amount]) => ({
      userId,
      userName: names.get(userId) ?? userId,
      amount: round2(amount),
    }))
    .sort((a, b) => b.amount - a.amount);

  return { balances: balanceList, transfers: simplify(balanceList) };
}

function simplify(balances: Balance[]): Transfer[] {
  const creditors = balances
    .filter((b) => b.amount > EPSILON)
    .map((b) => ({ ...b, remaining: b.amount }))
    .sort((a, b) => b.remaining - a.remaining);

  const debtors = balances
    .filter((b) => b.amount < -EPSILON)
    .map((b) => ({ ...b, remaining: -b.amount })) // store as positive "owes"
    .sort((a, b) => b.remaining - a.remaining);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const pay = round2(Math.min(debtor.remaining, creditor.remaining));

    if (pay > 0) {
      transfers.push({
        fromUserId: debtor.userId,
        fromUserName: debtor.userName,
        toUserId: creditor.userId,
        toUserName: creditor.userName,
        amount: pay,
      });
    }

    debtor.remaining -= pay;
    creditor.remaining -= pay;

    if (debtor.remaining <= EPSILON) i++;
    if (creditor.remaining <= EPSILON) j++;
  }

  return transfers;
}

/** Splits a total into per-participant shares that sum exactly to the amount. */
export function equalShares(
  amount: number,
  participantIds: string[],
): { userId: string; amount: number }[] {
  const count = participantIds.length;
  if (count === 0) return [];
  const totalCents = Math.round(amount * 100);
  const base = Math.floor(totalCents / count);
  const remainder = totalCents % count;
  return participantIds.map((userId, idx) => ({
    userId,
    amount: (base + (idx < remainder ? 1 : 0)) / 100,
  }));
}
