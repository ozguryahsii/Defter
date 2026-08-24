using System.ComponentModel.DataAnnotations;
using Defter.Web.Data;

namespace Defter.Web.Models;

/// <summary>A single expense paid by one member on behalf of some participants.</summary>
public class Expense
{
    public int Id { get; set; }

    public int GroupId { get; set; }
    public ExpenseGroup Group { get; set; } = null!;

    /// <summary>Who actually paid.</summary>
    public string PayerUserId { get; set; } = string.Empty;
    public ApplicationUser Payer { get; set; } = null!;

    [Range(0.01, 100_000_000)]
    public decimal Amount { get; set; }

    [Required, StringLength(200, MinimumLength = 1)]
    public string Description { get; set; } = string.Empty;

    [StringLength(50)]
    public string? Category { get; set; }

    public DateTime Date { get; set; } = DateTime.UtcNow;

    public SplitType SplitType { get; set; } = SplitType.Equal;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Per-participant portions; sum equals <see cref="Amount"/>.</summary>
    public List<ExpenseShare> Shares { get; set; } = new();
}
