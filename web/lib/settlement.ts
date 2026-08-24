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
  /**
   * Confirmed payments (debtor -> creditor). Each one reduces the outstanding
   * debt: the payer's balance moves up toward 0, the receiver's moves down.
   */
  settlements?: {
    fromUserId: string;
    toUserId: string;
    amount: number;
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

  // Apply confirmed payments: the debtor (from) paid the creditor (to), so the
  // debtor's balance rises toward 0 and the creditor's falls toward 0.
  for (const p of input.settlements ?? []) {
    if (balances.has(p.fromUserId)) {
      balances.set(p.fromUserId, (balances.get(p.fromUserId) ?? 0) + p.amount);
    }
    if (balances.has(p.toUserId)) {
      balances.set(p.toUserId, (balances.get(p.toUserId) ?? 0) - p.amount);
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

/**
 * Splits a total by ownership ratio (weights), distributing leftover pennies to
 * the largest fractional remainders so the shares sum exactly to the amount.
 * Falls back to an equal split when no positive weights are given.
 */
export function ratioShares(
  amount: number,
  participants: { userId: string; ratio: number }[],
): { userId: string; amount: number }[] {
  if (participants.length === 0) return [];
  const weightSum = participants.reduce((s, p) => s + (p.ratio > 0 ? p.ratio : 0), 0);
  if (weightSum <= 0) {
    return equalShares(
      amount,
      participants.map((p) => p.userId),
    );
  }

  const totalCents = Math.round(amount * 100);
  let allocated = 0;
  const parts = participants.map((p) => {
    const exact = (totalCents * (p.ratio > 0 ? p.ratio : 0)) / weightSum;
    const cents = Math.floor(exact);
    allocated += cents;
    return { userId: p.userId, cents, frac: exact - cents };
  });

  const remainder = totalCents - allocated;
  parts.sort((a, b) => b.frac - a.frac);
  for (let i = 0; i < remainder; i++) parts[i % parts.length].cents += 1;

  return parts.map((p) => ({ userId: p.userId, amount: p.cents / 100 }));
}
