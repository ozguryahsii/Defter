using Defter.Web.Models;

namespace Defter.Web.Services;

/// <summary>A member's net position: positive = owed money, negative = owes money.</summary>
public record Balance(string UserId, string UserName, decimal Amount);

/// <summary>A single suggested payment that reduces outstanding debt.</summary>
public record Transfer(
    string FromUserId, string FromUserName,
    string ToUserId, string ToUserName,
    decimal Amount);

public record SettlementResult(IReadOnlyList<Balance> Balances, IReadOnlyList<Transfer> Transfers);

public interface ISettlementCalculator
{
    /// <summary>
    /// Computes each member's net balance and the minimal set of transfers
    /// that settles the group. Expects <paramref name="group"/> to have its
    /// Members (with User) and Expenses (with Shares) loaded.
    /// </summary>
    SettlementResult Calculate(ExpenseGroup group);
}

public class SettlementCalculator : ISettlementCalculator
{
    // Amounts smaller than this are treated as fully settled (rounding dust).
    private const decimal Epsilon = 0.005m;

    public SettlementResult Calculate(ExpenseGroup group)
    {
        var names = group.Members.ToDictionary(
            m => m.UserId,
            m => m.User?.UserName ?? m.UserId);

        var balances = group.Members.ToDictionary(m => m.UserId, _ => 0m);

        foreach (var expense in group.Expenses)
        {
            // The payer fronted the whole amount.
            if (balances.ContainsKey(expense.PayerUserId))
                balances[expense.PayerUserId] += expense.Amount;

            // Each participant owes their share.
            foreach (var share in expense.Shares)
            {
                if (balances.ContainsKey(share.UserId))
                    balances[share.UserId] -= share.ShareAmount;
            }
        }

        var balanceList = balances
            .Select(kv => new Balance(kv.Key, names[kv.Key], Math.Round(kv.Value, 2, MidpointRounding.AwayFromZero)))
            .OrderByDescending(b => b.Amount)
            .ToList();

        var transfers = Simplify(balanceList);

        return new SettlementResult(balanceList, transfers);
    }

    /// <summary>
    /// Greedy debt simplification: repeatedly match the largest debtor with the
    /// largest creditor. Produces at most (n-1) transfers for n members.
    /// </summary>
    private static List<Transfer> Simplify(IReadOnlyList<Balance> balances)
    {
        var creditors = balances
            .Where(b => b.Amount > Epsilon)
            .Select(b => new Node(b.UserId, b.UserName, b.Amount))
            .OrderByDescending(n => n.Amount)
            .ToList();

        var debtors = balances
            .Where(b => b.Amount < -Epsilon)
            .Select(b => new Node(b.UserId, b.UserName, -b.Amount)) // store as positive "owes"
            .OrderByDescending(n => n.Amount)
            .ToList();

        var transfers = new List<Transfer>();
        int i = 0, j = 0;

        while (i < debtors.Count && j < creditors.Count)
        {
            var debtor = debtors[i];
            var creditor = creditors[j];

            var pay = Math.Round(Math.Min(debtor.Amount, creditor.Amount), 2, MidpointRounding.AwayFromZero);

            if (pay > 0)
            {
                transfers.Add(new Transfer(
                    debtor.UserId, debtor.UserName,
                    creditor.UserId, creditor.UserName,
                    pay));
            }

            debtor.Amount -= pay;
            creditor.Amount -= pay;

            if (debtor.Amount <= Epsilon) i++;
            if (creditor.Amount <= Epsilon) j++;
        }

        return transfers;
    }

    private sealed class Node
    {
        public Node(string userId, string userName, decimal amount)
        {
            UserId = userId;
            UserName = userName;
            Amount = amount;
        }

        public string UserId { get; }
        public string UserName { get; }
        public decimal Amount { get; set; }
    }
}
