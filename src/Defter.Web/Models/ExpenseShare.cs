using Defter.Web.Data;

namespace Defter.Web.Models;

/// <summary>The portion of an <see cref="Expense"/> that a participant owes.</summary>
public class ExpenseShare
{
    public int Id { get; set; }

    public int ExpenseId { get; set; }
    public Expense Expense { get; set; } = null!;

    public string UserId { get; set; } = string.Empty;
    public ApplicationUser User { get; set; } = null!;

    public decimal ShareAmount { get; set; }
}
