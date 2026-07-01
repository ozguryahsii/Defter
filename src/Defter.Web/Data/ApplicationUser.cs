using Microsoft.AspNetCore.Identity;

namespace Defter.Web.Data;

/// <summary>
/// Local application user. Extends IdentityUser so we get secure password
/// hashing and lockout for free. Login is by <see cref="IdentityUser.UserName"/>.
/// </summary>
public class ApplicationUser : IdentityUser
{
    public string? DisplayName { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
