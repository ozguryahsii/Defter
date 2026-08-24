using Defter.Web.Data;
using Defter.Web.Models;
using Defter.Web.ViewModels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Defter.Web.Controllers;

[Authorize]
public class ExpensesController : Controller
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;

    public ExpensesController(AppDbContext db, UserManager<ApplicationUser> userManager)
    {
        _db = db;
        _userManager = userManager;
    }

    private string CurrentUserId => _userManager.GetUserId(User)!;

    // GET: /Expenses/Create?groupId=5
    public async Task<IActionResult> Create(int groupId)
    {
        var group = await LoadGroupForMemberAsync(groupId);
        if (group is null)
            return NotFound();

        var vm = BuildCreateViewModel(group);
        vm.PayerUserId = CurrentUserId;
        vm.SelectedParticipantIds = group.Members.Select(m => m.UserId).ToList(); // default: everyone
        return View(vm);
    }

    // POST: /Expenses/Create
    [HttpPost]
    public async Task<IActionResult> Create(CreateExpenseViewModel model)
    {
        var group = await LoadGroupForMemberAsync(model.GroupId);
        if (group is null)
            return NotFound();

        // Always rebuild the trusted member list from the DB before validating,
        // so a tampered form cannot inject non-members.
        model.Members = group.Members
            .Select(m => new MemberOption { UserId = m.UserId, UserName = m.User.UserName ?? m.UserId })
            .ToList();
        model.Currency = group.Currency;
        model.GroupName = group.Name;

        var memberIds = group.Members.Select(m => m.UserId).ToHashSet();
        var participants = model.SelectedParticipantIds
            .Where(memberIds.Contains)
            .Distinct()
            .ToList();

        // Cross-field checks that need the trusted member list from the DB.
        if (!memberIds.Contains(model.PayerUserId))
            ModelState.AddModelError(nameof(model.PayerUserId), "Ödeyen kişi grup üyesi olmalı.");

        if (participants.Count == 0)
            ModelState.AddModelError(nameof(model.SelectedParticipantIds), "En az bir katılımcı seçmelisiniz.");

        if (model.SplitType == SplitType.Exact && participants.Count > 0)
        {
            decimal sum = 0m;
            foreach (var id in participants)
            {
                model.ExactAmounts.TryGetValue(id, out var v);
                if (v < 0)
                    ModelState.AddModelError(nameof(model.ExactAmounts), "Paylar negatif olamaz.");
                sum += v;
            }

            if (Math.Round(sum, 2) != Math.Round(model.Amount, 2))
                ModelState.AddModelError(nameof(model.ExactAmounts),
                    $"Girilen payların toplamı ({sum:0.00}) tutara ({model.Amount:0.00}) eşit olmalı.");
        }

        if (!ModelState.IsValid)
            return View(model);

        var expense = new Expense
        {
            GroupId = group.Id,
            PayerUserId = model.PayerUserId,
            Amount = Math.Round(model.Amount, 2, MidpointRounding.AwayFromZero),
            Description = model.Description.Trim(),
            Category = string.IsNullOrWhiteSpace(model.Category) ? null : model.Category.Trim(),
            Date = model.Date,
            SplitType = model.SplitType,
            Shares = BuildShares(model, participants)
        };

        _db.Expenses.Add(expense);
        await _db.SaveChangesAsync();

        // Settlement is recomputed on the group page after every expense.
        return RedirectToAction("Details", "Groups", new { id = group.Id });
    }

    // POST: /Expenses/Delete
    [HttpPost]
    public async Task<IActionResult> Delete(int id)
    {
        var expense = await _db.Expenses
            .Include(e => e.Group).ThenInclude(g => g.Members)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (expense is null || !expense.Group.Members.Any(m => m.UserId == CurrentUserId))
            return NotFound();

        // Only the payer or the group owner may delete an expense.
        if (expense.PayerUserId != CurrentUserId && expense.Group.CreatedByUserId != CurrentUserId)
            return Forbid();

        var groupId = expense.GroupId;
        _db.Expenses.Remove(expense);
        await _db.SaveChangesAsync();

        return RedirectToAction("Details", "Groups", new { id = groupId });
    }

    /// <summary>Splits the total into per-participant shares that sum exactly to the amount.</summary>
    private static List<ExpenseShare> BuildShares(CreateExpenseViewModel model, List<string> participants)
    {
        var shares = new List<ExpenseShare>();

        if (model.SplitType == SplitType.Exact)
        {
            foreach (var id in participants)
            {
                model.ExactAmounts.TryGetValue(id, out var v);
                shares.Add(new ExpenseShare { UserId = id, ShareAmount = Math.Round(v, 2, MidpointRounding.AwayFromZero) });
            }
            return shares;
        }

        // Equal split with exact penny distribution: the first `remainder`
        // participants pay one extra cent so the shares sum to the total.
        var totalCents = (long)Math.Round(model.Amount * 100m, MidpointRounding.AwayFromZero);
        var count = participants.Count;
        var basePerCent = totalCents / count;
        var remainder = totalCents % count;

        for (var idx = 0; idx < count; idx++)
        {
            var cents = basePerCent + (idx < remainder ? 1 : 0);
            shares.Add(new ExpenseShare
            {
                UserId = participants[idx],
                ShareAmount = cents / 100m
            });
        }

        return shares;
    }

    private static CreateExpenseViewModel BuildCreateViewModel(ExpenseGroup group) => new()
    {
        GroupId = group.Id,
        GroupName = group.Name,
        Currency = group.Currency,
        Members = group.Members
            .Select(m => new MemberOption { UserId = m.UserId, UserName = m.User.UserName ?? m.UserId })
            .ToList()
    };

    private async Task<ExpenseGroup?> LoadGroupForMemberAsync(int id)
    {
        var userId = CurrentUserId;
        return await _db.Groups
            .Where(g => g.Id == id && g.Members.Any(m => m.UserId == userId))
            .Include(g => g.Members).ThenInclude(m => m.User)
            .FirstOrDefaultAsync();
    }
}
