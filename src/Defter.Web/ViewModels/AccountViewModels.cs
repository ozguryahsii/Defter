using System.ComponentModel.DataAnnotations;

namespace Defter.Web.ViewModels;

public class RegisterViewModel
{
    [Required, StringLength(50, MinimumLength = 3)]
    [RegularExpression("^[a-zA-Z0-9._-]+$",
        ErrorMessage = "Kullanıcı adı yalnızca harf, rakam ve . _ - içerebilir.")]
    [Display(Name = "Kullanıcı adı")]
    public string UserName { get; set; } = string.Empty;

    [StringLength(100)]
    [Display(Name = "Görünen ad (opsiyonel)")]
    public string? DisplayName { get; set; }

    [Required, StringLength(100, MinimumLength = 8)]
    [DataType(DataType.Password)]
    [Display(Name = "Parola")]
    public string Password { get; set; } = string.Empty;

    [DataType(DataType.Password)]
    [Display(Name = "Parola (tekrar)")]
    [Compare(nameof(Password), ErrorMessage = "Parolalar eşleşmiyor.")]
    public string ConfirmPassword { get; set; } = string.Empty;
}

public class LoginViewModel
{
    [Required]
    [Display(Name = "Kullanıcı adı")]
    public string UserName { get; set; } = string.Empty;

    [Required]
    [DataType(DataType.Password)]
    [Display(Name = "Parola")]
    public string Password { get; set; } = string.Empty;

    [Display(Name = "Beni hatırla")]
    public bool RememberMe { get; set; }
}
