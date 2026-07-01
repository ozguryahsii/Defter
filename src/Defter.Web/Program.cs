using System.Globalization;
using Defter.Web.Data;
using Defter.Web.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Localization;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    // When hosted as a Windows Service the working directory is %WINDIR%\System32,
    // so we pin the content root to the executable's folder.
    ContentRootPath = AppContext.BaseDirectory
});

// Run as a Windows Service when launched by the SCM; runs as a normal console app otherwise.
builder.Host.UseWindowsService(o => o.ServiceName = "Defter");

// ---------------------------------------------------------------------------
// Storage: a single SQLite file under %ProgramData%\Defter so it survives
// app updates and is not lost inside the (possibly read-only) install folder.
// ---------------------------------------------------------------------------
var dataDir = builder.Configuration["Defter:DataDirectory"];
if (string.IsNullOrWhiteSpace(dataDir))
{
    dataDir = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
        "Defter");
}
Directory.CreateDirectory(dataDir);
var dbPath = Path.Combine(dataDir, "defter.db");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite($"Data Source={dbPath}"));

// Persist Data Protection keys to disk so auth/anti-forgery cookies remain
// valid across service restarts (default key storage can be ephemeral for a
// service account with no user profile).
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(dataDir, "keys")))
    .SetApplicationName("Defter");

// ---------------------------------------------------------------------------
// Local username/password authentication (no LDAP, no external providers).
// Passwords are stored only as PBKDF2 hashes by ASP.NET Core Identity.
// ---------------------------------------------------------------------------
builder.Services
    .AddIdentity<ApplicationUser, IdentityRole>(options =>
    {
        options.Password.RequiredLength = 8;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequireUppercase = false;
        options.User.RequireUniqueEmail = false;
        options.SignIn.RequireConfirmedAccount = false;
        // Brute-force protection.
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
        options.Lockout.AllowedForNewUsers = true;
    })
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

builder.Services.ConfigureApplicationCookie(options =>
{
    options.LoginPath = "/Account/Login";
    options.LogoutPath = "/Account/Logout";
    options.AccessDeniedPath = "/Account/Login";
    options.Cookie.Name = "Defter.Auth";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Strict;
    // Local HTTP by default; set to Always if you front the service with HTTPS.
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
    options.ExpireTimeSpan = TimeSpan.FromDays(7);
    options.SlidingExpiration = true;
});

builder.Services.AddScoped<ISettlementCalculator, SettlementCalculator>();

// Secure by default: any endpoint without an explicit [Authorize]/[AllowAnonymous]
// still requires an authenticated user.
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

// Every state-changing POST validates an anti-forgery token.
builder.Services.AddControllersWithViews(options =>
{
    options.Filters.Add(new AutoValidateAntiforgeryTokenAttribute());
});

var app = builder.Build();

// Create the SQLite schema on first run.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
}

// Minimal hardening headers (defence in depth for a local-only service).
app.Use(async (context, next) =>
{
    var headers = context.Response.Headers;
    headers["X-Content-Type-Options"] = "nosniff";
    headers["X-Frame-Options"] = "DENY";
    headers["Referrer-Policy"] = "no-referrer";
    headers["Content-Security-Policy"] =
        "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; form-action 'self'; frame-ancestors 'none'";
    await next();
});

// Fixed culture so <input type="number"> values (invariant "12.50") parse the
// same way on any machine, and money always renders with a dot separator.
var culture = new CultureInfo("en-US");
app.UseRequestLocalization(new RequestLocalizationOptions
{
    DefaultRequestCulture = new RequestCulture(culture),
    SupportedCultures = new[] { culture },
    SupportedUICultures = new[] { culture }
});

app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
