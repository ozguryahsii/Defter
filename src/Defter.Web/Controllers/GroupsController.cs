using Defter.Web.Data;
using Defter.Web.Models;
using Defter.Web.Services;
using Defter.Web.ViewModels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Defter.Web.Controllers;

[Authorize]
public class GroupsController : Controller
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ISettlementCalculator _calculator;

    public GroupsController(
        AppDbContext db,
        UserManager<ApplicationUser> userManager,
        ISettlementCalculator calculator)
    {
        _db = db;
        _userManager = userManager;
        _calculator = calculator;
    }

    private string CurrentUserId => _userManager.GetUserId(User)!;

    // GET: /Groups
    public async Task<IActionResult> Index()
    {
        var userId = CurrentUserId;
        var groups = await _db.Groups
            .Where(g => g.Members.Any(m => m.UserId == userId))
            .Include(g => g.Members)
            .OrderByDescending(g => g.CreatedAt)
            .ToListAsync();

        return View(groups);
    }

    // GET: /Groups/Create
    public IActionResult Create() => View(new CreateGroupViewModel());

    // POST: /Groups/Create
    [HttpPost]
    public async Task<IActionResult> Create(CreateGroupViewModel model)
    {
        if (!ModelState.IsValid)
            return View(model);

        var userId = CurrentUserId;
        var group = new ExpenseGroup
        {
            Name = model.Name.Trim(),
            Type = model.Type,
            Currency = model.Currency.Trim().ToUpperInvariant(),
            CreatedByUserId = userId,
            Members = { new GroupMember { UserId = userId } } // creator joins automatically
        };

        _db.Groups.Add(group);
        await _db.SaveChangesAsync();

        return RedirectToAction(nameof(Details), new { id = group.Id });
    }

    // GET: /Groups/Details/5  -> recomputes the settlement on every load.
    public async Task<IActionResult> Details(int id)
    {
        var group = await LoadGroupForMemberAsync(id);
        if (group is null)
            return NotFound();

        var vm = new GroupDetailsViewModel
        {
            Group = group,
            Settlement = _calculator.Calculate(group),
            CurrentUserId = CurrentUserId
        };
        return View(vm);
    }

    // POST: /Groups/AddMember
    [HttpPost]
    public async Task<IActionResult> AddMember(int groupId, string? newMemberUserName)
    {
        var group = await LoadGroupForMemberAsync(groupId);
        if (group is null)
            return NotFound();

        var userName = newMemberUserName?.Trim();
        if (string.IsNullOrEmpty(userName))
        {
            TempData["Error"] = "Kullanıcı adı boş olamaz.";
            return RedirectToAction(nameof(Details), new { id = groupId });
        }

        var user = await _userManager.FindByNameAsync(userName);
        if (user is null)
        {
            TempData["Error"] = $"'{userName}' adlı kullanıcı bulunamadı.";
            return RedirectToAction(nameof(Details), new { id = groupId });
        }

        if (group.Members.Any(m => m.UserId == user.Id))
        {
            TempData["Error"] = $"'{userName}' zaten grupta.";
            return RedirectToAction(nameof(Details), new { id = groupId });
        }

        _db.GroupMembers.Add(new GroupMember { GroupId = groupId, UserId = user.Id });
        await _db.SaveChangesAsync();

        TempData["Success"] = $"'{userName}' gruba eklendi.";
        return RedirectToAction(nameof(Details), new { id = groupId });
    }

    // POST: /Groups/RemoveMember  (only if the member has no financial activity)
    [HttpPost]
    public async Task<IActionResult> RemoveMember(int groupId, string userId)
    {
        var group = await LoadGroupForMemberAsync(groupId);
        if (group is null)
            return NotFound();

        var member = group.Members.FirstOrDefault(m => m.UserId == userId);
        if (member is null)
            return RedirectToAction(nameof(Details), new { id = groupId });

        if (userId == group.CreatedByUserId)
        {
            TempData["Error"] = "Grup sahibi çıkarılamaz.";
            return RedirectToAction(nameof(Details), new { id = groupId });
        }

        var hasActivity = group.Expenses.Any(e => e.PayerUserId == userId)
            || group.Expenses.Any(e => e.Shares.Any(s => s.UserId == userId));
        if (hasActivity)
        {
            TempData["Error"] = "Bu üyenin harcama kayıtları var, çıkarılamaz.";
            return RedirectToAction(nameof(Details), new { id = groupId });
        }

        _db.GroupMembers.Remove(member);
        await _db.SaveChangesAsync();

        TempData["Success"] = "Üye gruptan çıkarıldı.";
        return RedirectToAction(nameof(Details), new { id = groupId });
    }

    /// <summary>
    /// Loads a group with everything needed for display/settlement, but only if
    /// the current user is a member. Returns null otherwise (authorization gate).
    /// </summary>
    private async Task<ExpenseGroup?> LoadGroupForMemberAsync(int id)
    {
        var userId = CurrentUserId;
        return await _db.Groups
            .Where(g => g.Id == id && g.Members.Any(m => m.UserId == userId))
            .Include(g => g.Members).ThenInclude(m => m.User)
            .Include(g => g.Expenses).ThenInclude(e => e.Shares)
            .Include(g => g.Expenses).ThenInclude(e => e.Payer)
            .AsSplitQuery()
            .FirstOrDefaultAsync();
    }
}
