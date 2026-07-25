/**
 * Türkçe metin → İngilizce çeviri sözlüğü (gettext tarzı).
 * Anahtar, arayüzde geçen Türkçe metnin birebir kendisidir.
 * Burada olmayan bir anahtar İngilizce modda Türkçe görünür (güvenli düşüş).
 */
export const EN: Record<string, string> = {
  // --- Navigasyon / layout ---
  "Genel Bakış": "Overview",
  Gruplar: "Groups",
  Bütçe: "Budget",
  Profil: "Profile",
  Premium: "Premium",
  Yönetim: "Admin",
  "Çıkış yap": "Sign out",
  Bildirimler: "Notifications",
  Rapor: "Report",
  "Kişisel Bütçe": "Personal Budget",
  "Yeni Grup Ekle": "New Group",
  Menü: "Menu",
  İpucu: "Tip",
  "Her harcama girişinde borç tablosu otomatik yeniden hesaplanır.":
    "The debt table recalculates automatically after every expense.",
  "Henüz bildirim yok.": "No notifications yet.",
  Onayla: "Accept",
  Reddet: "Decline",
  "Gruba katıldın. 🎉": "You joined the group. 🎉",
  "Davet reddedildi.": "Invitation declined.",
  "İşlem başarısız.": "Something went wrong.",
  "az önce": "just now",
  "{n} dk": "{n}m",
  "{n} sa": "{n}h",
  "{n} g": "{n}d",

  // --- Giriş / kayıt ---
  "SOBSO!'ya hoş geldin": "Welcome to SOBSO!",
  "Hesabına giriş yaparak devam et": "Sign in to your account to continue",
  "Demo hesabı:": "Demo account:",
  "Hesap oluştur": "Create an account",
  "Saniyeler içinde harcamalarını paylaşmaya başla":
    "Start splitting expenses in seconds",
  "Kullanıcı adı": "Username",
  Parola: "Password",
  "Giriş yap": "Sign in",
  "Kayıt ol": "Sign up",
  "Hesabın yok mu?": "Don't have an account?",
  "Zaten hesabın var mı?": "Already have an account?",
  "Kullanıcı adı veya parola hatalı.": "Wrong username or password.",
  "Hoş geldin!": "Welcome!",
  "E-posta": "E-mail",
  "Görünen ad (değiştirilemez)": "Display name (permanent)",
  "Adın Soyadın": "Your full name",
  "Grup arkadaşların seni bu adla görür; kayıt sonrası değiştirilemez.":
    "Friends see you by this name; it can't be changed after sign-up.",
  "En az 8 karakter": "At least 8 characters",
  "Hesap oluşturuldu. Lütfen giriş yapın.":
    "Account created. Please sign in.",
  "Hesabın hazır!": "Your account is ready!",
  "Kayıt olarak": "By signing up you accept the",
  "Kullanım Şartları": "Terms of Use",
  "'nı ve": " and the",
  "Gizlilik Politikası": "Privacy Policy",
  "'nı kabul etmiş olursun.": ".",
  // kayıt alan hataları (sunucudan)
  "En az 3 karakter": "At least 3 characters",
  "Sadece harf, rakam ve . _ -": "Only letters, digits and . _ -",
  "Geçerli bir e-posta adresi girin.": "Enter a valid e-mail address.",
  "Bu kullanıcı adı zaten alınmış.": "This username is already taken.",
  "Bu e-posta adresi zaten kayıtlı.": "This e-mail is already registered.",
  "En fazla 100 karakter": "At most 100 characters",
};
