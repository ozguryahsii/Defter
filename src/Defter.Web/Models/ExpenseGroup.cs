using System.ComponentModel.DataAnnotations;

namespace Defter.Web.Models;

/// <summary>A shared-expense group ("Ortak Harcama").</summary>
public class ExpenseGroup
{
    public int Id { get; set; }

    [Required, StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    public GroupType Type { get; set; } = GroupType.Tatil;

    [Required, StringLength(3, MinimumLength = 3)]
    public string Currency { get; set; } = "TRY";

    /// <summary>Identity user id of the creator (always also a member).</summary>
    public string CreatedByUserId { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<GroupMember> Members { get; set; } = new();

    public List<Expense> Expenses { get; set; } = new();
}
