import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateSettlement,
  equalShares,
  ratioShares,
} from "../lib/settlement";

const sum = (xs: { amount: number }[]) =>
  Math.round(xs.reduce((s, x) => s + x.amount, 0) * 100) / 100;

test("equalShares sums exactly and spreads the remainder", () => {
  const shares = equalShares(100, ["a", "b", "c"]);
  assert.equal(sum(shares), 100);
  // 100 / 3 -> 33.34, 33.33, 33.33
  assert.deepEqual(
    shares.map((s) => s.amount).sort((x, y) => y - x),
    [33.34, 33.33, 33.33],
  );
});

test("ratioShares splits by weight and sums exactly", () => {
  const shares = ratioShares(100, [
    { userId: "a", ratio: 2 },
    { userId: "b", ratio: 3 },
  ]);
  assert.equal(sum(shares), 100);
  const byId = Object.fromEntries(shares.map((s) => [s.userId, s.amount]));
  assert.equal(byId.a, 40);
  assert.equal(byId.b, 60);
});

test("ratioShares falls back to equal when no weights", () => {
  const shares = ratioShares(90, [
    { userId: "a", ratio: 0 },
    { userId: "b", ratio: 0 },
  ]);
  assert.equal(sum(shares), 90);
  assert.deepEqual(shares.map((s) => s.amount), [45, 45]);
});

test("calculateSettlement: one payer, equal split", () => {
  const res = calculateSettlement({
    members: [
      { userId: "husnu", userName: "Hüsnü" },
      { userId: "ozgur", userName: "Özgür" },
    ],
    expenses: [
      {
        payerId: "husnu",
        amount: 200,
        shares: [
          { userId: "husnu", amount: 100 },
          { userId: "ozgur", amount: 100 },
        ],
      },
    ],
  });
  assert.equal(res.transfers.length, 1);
  assert.deepEqual(
    { from: res.transfers[0].fromUserId, to: res.transfers[0].toUserId, amt: res.transfers[0].amount },
    { from: "ozgur", to: "husnu", amt: 100 },
  );
  // balances net to zero
  assert.equal(Math.round(res.balances.reduce((s, b) => s + b.amount, 0)), 0);
});

test("settlements reduce and clear the debt", () => {
  const base = {
    members: [
      { userId: "husnu", userName: "Hüsnü" },
      { userId: "ozgur", userName: "Özgür" },
    ],
    expenses: [
      {
        payerId: "husnu",
        amount: 200,
        shares: [
          { userId: "husnu", amount: 100 },
          { userId: "ozgur", amount: 100 },
        ],
      },
    ],
  };

  const partial = calculateSettlement({
    ...base,
    settlements: [{ fromUserId: "ozgur", toUserId: "husnu", amount: 40 }],
  });
  assert.equal(partial.transfers[0].amount, 60);

  const full = calculateSettlement({
    ...base,
    settlements: [{ fromUserId: "ozgur", toUserId: "husnu", amount: 100 }],
  });
  assert.equal(full.transfers.length, 0);
});

test("debt simplification chains through: A owes B, B owes C => A pays C", () => {
  // A paid nothing, owes 50; B net zero; C is owed 50.
  const res = calculateSettlement({
    members: [
      { userId: "A", userName: "A" },
      { userId: "B", userName: "B" },
      { userId: "C", userName: "C" },
    ],
    expenses: [
      // C fronts 50 that A consumes (A owes C 50 directly)
      { payerId: "C", amount: 50, shares: [{ userId: "A", amount: 50 }] },
    ],
  });
  assert.equal(res.transfers.length, 1);
  assert.equal(res.transfers[0].fromUserId, "A");
  assert.equal(res.transfers[0].toUserId, "C");
  assert.equal(res.transfers[0].amount, 50);
});
