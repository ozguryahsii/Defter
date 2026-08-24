using Defter.Web.Data;

namespace Defter.Web.Models;

/// <summary>Membership link between a user and an <see cref="ExpenseGroup"/>.</summary>
public class GroupMember
{
    public int Id { get; set; }

    public int GroupId { get; set; }
    public ExpenseGroup Group { get; set; } = null!;

    public string UserId { get; set; } = string.Empty;
    public ApplicationUser User { get; set; } = null!;

    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}
