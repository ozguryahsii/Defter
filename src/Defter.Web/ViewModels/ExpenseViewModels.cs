using System.ComponentModel.DataAnnotations;
using Defter.Web.Models;

namespace Defter.Web.ViewModels;

public class MemberOption
{
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
}

public class CreateExpenseViewModel
{
    public int GroupId { get; set; }
    public string GroupName { get; set; } = string.Empty;
    public string Currency { get; set; } = "TRY";

    /// <summary>All group members, used to render the payer + participant pickers.</summary>
    public List<MemberOption> Members { get; set; } = new();

    [Required, StringLength(200, MinimumLength = 1)]
    [Display(Name = "Açıklama")]
    public string Description { get; set; } = string.Empty;

    [StringLength(50)]
    [Display(Name = "Kategori")]
    public string? Category { get; set; }

    [Range(0.01, 100_000_000, ErrorMessage = "Tutar 0'dan büyük olmalı.")]
    [Display(Name = "Tutar")]
    public decimal Amount { get; set; }

    [Display(Name = "Ödeyen")]
    public string PayerUserId { get; set; } = string.Empty;

    [DataType(DataType.Date)]
    [Display(Name = "Tarih")]
    public DateTime Date { get; set; } = DateTime.Today;

    [Display(Name = "Bölüşüm")]
    public SplitType SplitType { get; set; } = SplitType.Equal;

    /// <summary>User ids selected as participants (who the expense covers).</summary>
    public List<string> SelectedParticipantIds { get; set; } = new();

    /// <summary>For Exact split: participant userId -> exact amount.</summary>
    public Dictionary<string, decimal> ExactAmounts { get; set; } = new();
}
