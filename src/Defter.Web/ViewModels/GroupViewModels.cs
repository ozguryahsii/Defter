using System.ComponentModel.DataAnnotations;
using Defter.Web.Models;
using Defter.Web.Services;

namespace Defter.Web.ViewModels;

public class CreateGroupViewModel
{
    [Required, StringLength(100, MinimumLength = 1)]
    [Display(Name = "Grup adı")]
    public string Name { get; set; } = string.Empty;

    [Display(Name = "Tür")]
    public GroupType Type { get; set; } = GroupType.Tatil;

    [Required, StringLength(3, MinimumLength = 3)]
    [Display(Name = "Para birimi")]
    public string Currency { get; set; } = "TRY";
}

/// <summary>Everything the group detail page needs, including the live settlement.</summary>
public class GroupDetailsViewModel
{
    public ExpenseGroup Group { get; set; } = null!;
    public SettlementResult Settlement { get; set; } = null!;
    public string CurrentUserId { get; set; } = string.Empty;

    // Inline "add member" form field.
    [Display(Name = "Kullanıcı adı")]
    public string? NewMemberUserName { get; set; }
}
