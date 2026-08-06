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
  "Ad-Soyad (değiştirilemez)": "Full name (permanent)",
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

  // --- Genel bakış (dashboard) ---
  "Merhaba, {name} 👋": "Hello, {name} 👋",
  "Tüm gruplarındaki harcama ve borç durumunun özeti. (Kişisel Bütçe alanındaki harcama ve gelirler bu alana yansıtılmaz.)":
    "A summary of spending and debts across all your groups. (Personal Budget items are not included here.)",
  "Henüz bir grubun yok": "You don't have a group yet",
  "Bir tatil ya da arkadaş grubu için ilk grubunu oluştur, arkadaşlarını ekle ve harcamaları girmeye başla.":
    "Create your first group for a trip or friend circle, add your friends and start logging expenses.",
  "İlk grubunu oluştur": "Create your first group",
  "Toplam Harcama": "Total Spending",
  "tüm gruplar": "all groups",
  "Henüz harcama yok.": "No expenses yet.",
  "Grup bazında toplam harcamalar": "Total spending by group",
  "Senin Ödediğin": "You Paid",
  "cebinden çıkan": "out of your pocket",
  "Henüz ödeme yapmadın.": "You haven't paid anything yet.",
  "Grup bazında senin ödediklerin": "What you paid, by group",
  "Sana Borçlu": "Owed to You",
  alacağın: "you'll receive",
  "Kimsenin sana borcu yok.": "Nobody owes you anything.",
  "Kim, hangi gruptan, ne kadar borçlu": "Who owes you, from which group",
  "Senin Borcun": "You Owe",
  ödeyeceğin: "you'll pay",
  "Borcun yok. 🎉": "You owe nothing. 🎉",
  "Kime, hangi grupta, ne kadar borçlusun": "Who you owe, in which group",
  "Bekleyen Ödeşme": "Pending Settlements",
  "{n} işlem": "{n} transfers",
  "seni ilgilendiren": "involving you",
  "Bekleyen ödeşme yok.": "No pending settlements.",
  "Seni ilgilendiren açık transferler": "Open transfers involving you",
  Gruplarım: "My Groups",
  Tümü: "All",
  "Kategori Dağılımı": "Category Breakdown",
  "Nereye harcandı?": "Where did it go?",
  "Kategori verisi yok.": "No category data.",
  "Son Hareketler": "Recent Activity",
  "En güncel harcamalar": "Latest expenses",
  "Bu tutarın dökümü": "Breakdown of this amount",
  Arşiv: "Archived",
  "Tatil / Arkadaş": "Trip / Friends",
  "Toplam harcama": "Total spending",
  "{n} harcama": "{n} expenses",
  Ödeşildi: "Settled up",
  "(sen)": "(you)",
  "Herkes ödeşmiş — bekleyen borç yok.": "Everyone is settled — no open debts.",
  Toplam: "Total",

  // --- Gruplar / grup ekranı ---
  "Katıldığın tüm ortak harcama grupları.": "All shared expense groups you're in.",
  "Bir tatil ya da arkadaş grubu için ilk grubunu oluştur ve arkadaşlarını davet et.":
    "Create your first group for a trip or friend circle and invite your friends.",
  "Aktif grubun yok — hepsi arşivde.": "No active groups — all archived.",
  "Bir grup oluştur, sonra kullanıcı adına göre arkadaşlarını ekle.":
    "Create a group, then add friends by username.",
  "Grup oluşturuldu!": "Group created!",
  "Grup adı": "Group name",
  "Örn. Bodrum Tatili 2026": "e.g. Ibiza Trip 2026",
  "Para birimi": "Currency",
  Vazgeç: "Cancel",
  Oluştur: "Create",
  "Grup adı gerekli": "Group name is required",
  "Geçersiz para birimi": "Invalid currency",
  "Bu grup arşivlendi — kayıtlar salt okunur; yeni harcama ve ödeme yapılamaz.":
    "This group is archived — records are read-only; no new expenses or payments.",
  Kişisel: "Personal",
  "{n} üye": "{n} members",
  Gelir: "Income",
  Gider: "Expenses",
  Kalan: "Remaining",
  "bu grup": "this group",
  "Üye bazında ödenen tutarlar": "Amounts paid per member",
  "Bu grupta henüz ödeme yapmadın.": "You haven't paid anything in this group.",
  "Bu gruptaki harcamaların": "Your expenses in this group",
  "Bu grupta kimsenin sana borcu yok.": "Nobody owes you in this group.",
  "Kim sana ne kadar borçlu": "Who owes you and how much",
  "Bu grupta borcun yok. 🎉": "You owe nothing in this group. 🎉",
  "Kime ne kadar borçlusun": "Who you owe and how much",
  "Gruptaki tüm açık transferler": "All open transfers in the group",
  "Borç Durumu": "Debts",
  "Minimum transferle nasıl ödeşilir — ödemeyi yalnızca alacaklı onaylar":
    "Settle up with minimum transfers — only the creditor confirms a payment",
  "Gelir & Giderler": "Income & Expenses",
  Harcamalar: "Expenses",
  "{n} kayıt": "{n} records",
  "Aylık harcama hedefin": "Your monthly spending target",
  Tekrarlayan: "Recurring",
  "Kira, abonelik gibi düzenli giderler": "Regular costs like rent or subscriptions",
  "Net Bakiyeler": "Net Balances",
  "Kim ne durumda": "Where everyone stands",
  Hareketler: "Activity",
  "Son aktiviteler": "Latest actions",
  Üyeler: "Members",
  sahip: "owner",
  "Bekleyen davetler": "Pending invitations",
  "onay bekliyor": "awaiting approval",
  "Kullanıcı adına göre üye ekle (onayına gider)":
    "Add a member by username (they must approve)",
  "{what} {date} tarihinde oluşturuldu.": "{what} created on {date}.",
  Grup: "Group",
  Diğer: "Other",

  // --- Harcama formu / listesi ---
  "Kayıt güncellendi.": "Record updated.",
  "Gelir eklendi.": "Income added.",
  "Harcama eklendi.": "Expense added.",
  "Gelir Ekle": "Add Income",
  "Harcama Ekle": "Add Expense",
  "Kaydı Düzenle": "Edit Record",
  "Bütçene giren parayı kaydet (maaş, ek gelir vb.).":
    "Record money coming into your budget (salary, side income etc.).",
  "Tutarı gir; bütçe özeti anında güncellenir.":
    "Enter the amount; your budget summary updates instantly.",
  "Tutarı gir, kimlerin dahil olduğunu seç. Borç tablosu anında güncellenir.":
    "Enter the amount and pick who's included. The debt table updates instantly.",
  Açıklama: "Description",
  "Örn. Maaş": "e.g. Salary",
  "Örn. Akşam yemeği": "e.g. Dinner",
  Tutar: "Amount",
  Kategori: "Category",
  "Örn. Yemek": "e.g. Food",
  "Güncel kur:": "Live rate:",
  "Güncel kur şu anda alınamıyor. Lütfen biraz sonra tekrar dene veya tutarı {cur} olarak gir.":
    "The live rate is unavailable right now. Try again shortly or enter the amount in {cur}.",
  "Güncel kur alınıyor…": "Fetching live rate…",
  Ödeyen: "Paid by",
  Tarih: "Date",
  "İleri tarih girersen, 2 gün ve 1 gün kala sana hatırlatırız.":
    "Pick a future date and we'll remind you 2 days and 1 day before.",
  Bölüşüm: "Split",
  "Eşit böl": "Split equally",
  "Özel tutarlar": "Custom amounts",
  "Kimleri kapsıyor?": "Who's included?",
  "Kişi başı": "Per person",
  "Toplam tutarla eşleşiyor ✓": "Matches the total ✓",
  "Kalan: {x}": "Remaining: {x}",
  Güncelle: "Update",
  Kaydet: "Save",
  "Bu harcamayı silmek istediğine emin misin?":
    "Are you sure you want to delete this expense?",
  "Silinemedi.": "Couldn't delete.",
  "Harcama silindi.": "Expense deleted.",
  "Fiş yüklenemedi.": "Couldn't upload the receipt.",
  "Fiş eklendi.": "Receipt attached.",
  gelir: "income",
  "{name} ödedi": "{name} paid",
  "{n} kişi": "{n} people",
  fiş: "receipt",
  "Fiş ekle": "Add receipt",
  "Fiş fotoğrafı ekle": "Attach a receipt photo",
  Düzenle: "Edit",
  Sil: "Delete",
  "Henüz harcama yok. İlk harcamayı ekle.": "No expenses yet. Add the first one.",

  // --- Borç durumu / ödeşme ---
  "{name} → sen: ödeme alındı olarak işaretlendi.":
    "{name} → you: marked as paid.",
  "Hatırlatma gönderilemedi.": "Couldn't send the reminder.",
  "{name} kullanıcısına hatırlatma gönderildi.": "Reminder sent to {name}.",
  "Geri alınamadı.": "Couldn't undo.",
  "Ödeme geri alındı, borç yeniden açıldı.": "Payment undone; the debt is open again.",
  "Borçluya bildirim gönder (günde 1 kez)": "Notify the debtor (once a day)",
  Hatırlat: "Remind",
  "Ödeme Onay": "Confirm Payment",
  sadece: "only",
  Ödenenler: "Paid",
  ödendi: "paid",
  "geri al": "undo",
  Öde: "Pay",
  "{name}'e öde": "Pay {name}",
  "{amount} tutarını gönder. Ödemeni {name} aldığında 'Ödendi' olarak onaylar.":
    "Send {amount}. When {name} receives it, they confirm it as paid.",
  "Banka uygulamanın": "Scan it from your banking app's",
  "FAST / Karekod ile ödeme": "FAST / QR payment",
  "ekranından okut": "screen",
  "{x} kopyalandı.": "{x} copied.",
  "Kopyalanamadı.": "Couldn't copy.",
  "Tutarı kopyala": "Copy amount",
  "{name} henüz IBAN eklemedi. Profilinden ekleyebilir.":
    "{name} hasn't added an IBAN yet. They can add it from their profile.",

  // --- Aktivite / üyeler / davet ---
  "{n} dk önce": "{n}m ago",
  "{n} sa önce": "{n}h ago",
  "{n} gün önce": "{n}d ago",
  "Henüz hareket yok.": "No activity yet.",
  "Üye eklenemedi.": "Couldn't add the member.",
  "Davet gönderildi — onaylayınca gruba katılacak.":
    "Invitation sent — they'll join once they accept.",
  "kullanıcı adı": "username",
  "Davet oluşturulamadı.": "Couldn't create the invite.",
  "Davet linki kopyalandı.": "Invite link copied.",
  "Davet QR Oluştur": "Create Invite QR",
  "Gruba Davet": "Group Invitation",
  "Arkadaşın kamerasıyla okutup tıklayınca gruba katılır. Link 7 gün geçerlidir.":
    "Your friend scans it with their camera and joins in one tap. The link is valid for 7 days.",
  "Linki kopyala": "Copy link",
  "{name} gruptan çıkarılsın mı?": "Remove {name} from the group?",
  "Üye çıkarılamadı.": "Couldn't remove the member.",
  "{name} gruptan çıkarıldı.": "{name} was removed from the group.",
  "Üyeyi çıkar (yalnızca grup sahibi)": "Remove member (owner only)",

  // --- Bütçe / tekrarlayan ---
  "Kaydedilemedi.": "Couldn't save.",
  "Bütçe güncellendi.": "Budget updated.",
  "Bu ay": "This month",
  düzenle: "edit",
  "bütçe koy": "set a budget",
  "Aylık bütçe": "Monthly budget",
  "Bütçe {x} aşıldı": "Budget exceeded by {x}",
  "{x} kaldı": "{x} left",
  "Eklenemedi.": "Couldn't add.",
  "Tekrarlayan harcama eklendi.": "Recurring expense added.",
  "Bu tekrarlayan harcamayı silmek istiyor musun?":
    "Delete this recurring expense?",
  "Silindi.": "Deleted.",
  "Kira, abonelik gibi düzenli giderleri buraya ekle; vadesi geldikçe otomatik harcamaya dönüşür (herkese eşit bölünür).":
    "Add regular costs like rent or subscriptions; they turn into expenses automatically when due (split equally).",
  Haftalık: "Weekly",
  Aylık: "Monthly",
  "sonraki:": "next:",
  Sıklık: "Frequency",
  "İlk tarih": "First date",
  Ekle: "Add",
  "Örn. Ev kirası": "e.g. Rent",
  "Tekrarlayan harcama ekle": "Add recurring expense",

  // --- Grup yönetim düğmeleri ---
  "Grup silinemedi.": "Couldn't delete the group.",
  "Grup silindi.": "Group deleted.",
  "Grubu Sil": "Delete Group",
  "'{name}' silinsin mi?": "Delete '{name}'?",
  "Tüm harcamalar, ödemeler ve geçmiş kalıcı olarak silinir. Bu işlem geri alınamaz ve grubun tüm üyelerini etkiler.":
    "All expenses, payments and history are permanently deleted. This cannot be undone and affects every member.",
  "Kalıcı olarak sil": "Delete permanently",
  "Grup arşivlendi.": "Group archived.",
  "Grup arşivden çıkarıldı.": "Group unarchived.",
  "Arşivden Çıkar": "Unarchive",
  "Grubu Arşivle": "Archive Group",
  "Grup arşivlensin mi?": "Archive this group?",
  "Arşivdeki gruplarda yeni harcama veya ödeme yapılamaz; kayıtlar okunabilir kalır. İstediğin zaman arşivden çıkarabilirsin.":
    "Archived groups don't accept new expenses or payments; records stay readable. You can unarchive anytime.",
  Arşivle: "Archive",
  "Ayrılamadın.": "Couldn't leave.",
  "Gruptan ayrıldın.": "You left the group.",
  "Gruptan Ayrıl": "Leave Group",
  "Gruptan ayrılmak istediğine emin misin?": "Are you sure you want to leave?",
  "Gruptan ayrıldığında harcama ve ödeme geçmişine erişimin sona erer. Tekrar katılmak için yeniden davet edilmen gerekir.":
    "When you leave, you lose access to the expense and payment history. You'd need a new invitation to rejoin.",
  "Ad değiştirilemedi.": "Couldn't rename.",
  "Grup adı güncellendi.": "Group name updated.",
  "Grup adını değiştir": "Rename group",
  "Yeni ad tüm üyeler için görünür ve üyeler bilgilendirilir.":
    "The new name is visible to all members and they get notified.",

  // --- Profil ---
  "görünen adını ve ödeme bilgilerini yönet":
    "manage your display name and payment details",
  "Profil Fotoğrafı": "Profile Photo",
  "Fotoğrafın grup arkadaşlarına her yerde görünür":
    "Your photo is visible to your group mates everywhere",
  "Fotoğraf Yükle": "Upload Photo",
  Kaldır: "Remove",
  "Fotoğraf yüklenemedi.": "Couldn't upload the photo.",
  "Profil fotoğrafın güncellendi.": "Profile photo updated.",
  "Fotoğraf kaldırıldı.": "Photo removed.",
  "Hesap & Ödeme Bilgileri": "Account & Payment Details",
  "IBAN eklersen borç ödemelerinde QR ile kolayca ödeme alırsın":
    "Add an IBAN to receive debt payments easily via QR",
  "Profil güncellendi.": "Profile updated.",
  "Grup arkadaşların sana borçlarını öderken bu IBAN'ı ve QR kodunu görür.":
    "Group mates see this IBAN and QR code when paying you back.",
  "IBAN Sahibinin Adı Soyadı": "IBAN Holder's Full Name",
  "Ad Soyad": "Full Name",
  "Parola Değiştir": "Change Password",
  "Hesap güvenliğin için güçlü bir parola kullan":
    "Use a strong password to keep your account safe",
  "Mevcut parola": "Current password",
  "Yeni parola": "New password",
  "Yeni parola (tekrar)": "New password (again)",
  "Parolayı değiştir": "Change password",
  "Parolan güncellendi.": "Password updated.",
  "Tehlikeli bölge": "Danger zone",
  "Hesabını silersen kişisel bilgilerin (kullanıcı adı, ad, IBAN) kalıcı olarak kaldırılır ve bir daha giriş yapamazsın. Yalnızca sana ait gruplar tamamen silinir; ortak gruplardaki harcama kayıtları, diğer üyelerin hesabı bozulmasın diye 'Silinen Kullanıcı' adıyla anonim kalır.":
    "Deleting your account permanently removes your personal details (username, name, IBAN) and you won't be able to sign in again. Only groups you own are fully deleted; expense records in shared groups stay anonymised as 'Deleted User' so other members' balances remain intact.",
  "Hesabımı sil": "Delete my account",
  "Hesabını silmek üzeresin": "You're about to delete your account",
  "Bu işlem geri alınamaz. Onaylamak için parolanı gir.":
    "This cannot be undone. Enter your password to confirm.",
  "Hesabın silindi. Güle güle 👋": "Your account has been deleted. Goodbye 👋",

  // --- Premium ---
  "Sınırsız grup ve harcama ile tatil hesaplarını özgürce tut.":
    "Track your trip finances freely with unlimited groups and expenses.",
  "Premium üyesin 🎉": "You're a Premium member 🎉",
  "Yıllık plan aktif": "Yearly plan active",
  "Aylık plan aktif": "Monthly plan active",
  Yıllık: "Yearly",
  "/ay": "/mo",
  "/yıl": "/yr",
  "%44 avantajlı": "Save 44%",
  "Sınırsız grup oluşturma": "Unlimited groups",
  "Gruplarda sınırsız harcama": "Unlimited expenses in groups",
  "Gelecek premium özelliklerine erken erişim":
    "Early access to upcoming premium features",
  "İndirim kodun var mı?": "Have a discount code?",
  "Influencer kodunu gir, indirimli fiyatı gör":
    "Enter an influencer code to see discounted prices",
  Uygula: "Apply",
  "Kod doğrulanamadı.": "Couldn't validate the code.",
  "Kod uygulandı: %{p} indirim!": "Code applied: {p}% off!",
  "{code} uygulandı — %{p} indirim": "{code} applied — {p}% off",
  "Premium'da neler var?": "What's in Premium?",
  "Satın alma çok yakında": "Purchasing coming soon",
  "Premium üyelik satın alımı SOBSO mobil uygulaması üzerinden (App Store / Google Play) yapılacak. İndirim kodunu şimdiden işleyebilirsin; satın alma açıldığında kodun otomatik uygulanır.":
    "Premium subscriptions will be purchased through the SOBSO mobile app (App Store / Google Play). You can register your discount code now; it applies automatically once purchasing opens.",
  "Geçersiz kod biçimi.": "Invalid code format.",
  "Kod bulunamadı veya artık geçerli değil.": "Code not found or no longer valid.",
  "Bu kodun süresi dolmuş.": "This code has expired.",
  "Ücretsiz sürümde yalnızca 1 grup kurabilirsin. Sınırsız grup için sağ üst menüden Premium'a göz at.":
    "The free plan allows only 1 group. Check out Premium from the top-right menu for unlimited groups.",
  "Ücretsiz sürümde bir grupta en fazla 3 harcama olabilir. Sınırsız harcama için grup kurucusunun Premium'a geçmesi gerekir (sağ üst menü → Premium).":
    "The free plan allows at most 3 expenses per group. The group owner needs Premium for unlimited expenses (top-right menu → Premium).",

  // --- Yönetim paneli ---
  "Yönetim Paneli": "Admin Panel",
  "İndirim kodları, üyeler ve premium yönetimi":
    "Discount codes, members and premium management",
  "Toplam üye": "Total members",
  "Premium üye": "Premium members",
  "Bugün kayıt": "Sign-ups today",
  "Son 7 gün": "Last 7 days",
  "Yeni İndirim Kodu": "New Discount Code",
  "Influencer kampanyaları için kod tanımla":
    "Define codes for influencer campaigns",
  Kod: "Code",
  "İndirim (%)": "Discount (%)",
  "Influencer (opsiyonel)": "Influencer (optional)",
  "Örn. Özge": "e.g. Ozge",
  "Son kullanma (opsiyonel)": "Expiry (optional)",
  "Kod Oluştur": "Create Code",
  "Kod oluşturulamadı.": "Couldn't create the code.",
  "{code} oluşturuldu.": "{code} created.",
  "İndirim Kodları": "Discount Codes",
  "Kod bazında kullanım ve gelen üyeler": "Usage and referred members per code",
  "Henüz kod yok.": "No codes yet.",
  "son:": "expires:",
  "{n} kullanım": "{n} uses",
  "Kod pasifleştirildi.": "Code deactivated.",
  "Kod aktifleştirildi.": "Code activated.",
  Aktif: "Active",
  Pasif: "Inactive",
  "Ara ve premium durumunu elle yönet (ödeme entegrasyonuna kadar)":
    "Search and manage premium manually (until billing integration)",
  "Kullanıcı adı, ad veya e-posta ara…": "Search username, name or e-mail…",
  "kayıt:": "joined:",
  "kaynak:": "source:",
  "Sonuç bulunamadı.": "No results.",
  "Premium kapatıldı.": "Premium disabled.",
  "Premium verildi.": "Premium granted.",
  "Yetkin yok.": "You're not authorised.",
  "Kod 3-20 harf/rakam olmalı (örn. KODUGIRINIZ).":
    "Code must be 3-20 letters/digits (e.g. YOURCODE).",
  "İndirim %1 ile %90 arasında olmalı.": "Discount must be between 1% and 90%.",
  "Bu kod zaten var.": "This code already exists.",

  // --- Rapor / katılım / diğer ---
  "Gruba dön": "Back to group",
  "Tatil / Arkadaş Grubu": "Trip / Friends Group",
  "{date} tarihli rapor": "report dated {date}",
  "Bu Ay": "This Month",
  "Harcama Sayısı": "Expense Count",
  "Ödeşme Planı": "Settlement Plan",
  "Bekleyen borç yok.": "No outstanding debts.",
  Ödenen: "Paid",
  "Yazdır / PDF": "Print / PDF",
  "Gruba ekleniyorsun...": "Joining the group...",
  "Davet linki geçersiz.": "This invite link is invalid.",
  "Gruplarıma dön": "Back to my groups",
  "Grup bulunamadı": "Group not found",
  "Bu grup mevcut değil ya da erişim yetkin yok.":
    "This group doesn't exist or you don't have access.",
  "Temayı değiştir": "Toggle theme",
  "Karekod Çözücü": "QR Decoder",
  "Bir karekod görselini (ekran görüntüsü/fotoğraf) yükle, içindeki ham metni gör. Görsel cihazından çıkmaz; çözümleme tarayıcıda yapılır.":
    "Upload a QR image (screenshot/photo) to see its raw content. The image never leaves your device; decoding happens in the browser.",
  "(çözülemedi — daha net/yakın bir görüntü dene)":
    "(couldn't decode — try a sharper/closer image)",
  "(görsel okunamadı)": "(couldn't read the image)",
  "Kopyalandı.": "Copied.",
  "Karekod görseli seç (birden fazla seçebilirsin)":
    "Choose QR image(s) — multiple allowed",
  "PNG, JPG veya ekran görüntüsü": "PNG, JPG or a screenshot",
  "Çözülüyor...": "Decoding...",
  "Fişi Tara": "Scan Receipt",
  "Doğru sonuç için fiş fotoğrafını düz (ters çevirmeden) yükleyin.":
    "For accurate results, upload the receipt photo upright (not rotated).",
  "Fiş okunuyor…": "Reading receipt…",
  "Fiş tarama Premium özelliğidir.": "Receipt scanning is a Premium feature.",
  "Bu ayki fiş tarama hakkın doldu (100 fiş/ay). Yeni ay başında yenilenir.":
    "You've used this month's receipt-scan quota (100 scans/month). It resets when the new month starts.",
  "Fiş tarama şu anda kullanılamıyor.": "Receipt scanning is currently unavailable.",
  "Geçersiz dosya.": "Invalid file.",
  "Fiş okundu — kontrol edip kaydet.": "Receipt read — review and save.",
  "Fiş okunamadı; daha net bir fotoğraf dene.":
    "Couldn't read the receipt; try a sharper photo.",
  "Kod türü": "Code type",
  "İndirim kodu (%)": "Discount code (%)",
  "Deneme kodu (gün)": "Trial code (days)",
  "Deneme süresi (gün)": "Trial length (days)",
  "Kontenjan (boş = sınırsız)": "Usage limit (empty = unlimited)",
  "örn. 50": "e.g. 50",
  "{n} gün deneme": "{n}-day trial",
  "Bu kodun kontenjanı dolmuş.": "This code's usage limit is reached.",
  "Premium üyeliğin aktifken kod kullanamazsın.":
    "You can't redeem a code while your Premium is active.",
  "Bu kodu daha önce kullandın.": "You already used this code.",
  "Deneme süresi 1 ile 365 gün arasında olmalı.":
    "Trial length must be between 1 and 365 days.",
  "{n} günlük Premium başladı! 🎉": "Your {n}-day Premium has started! 🎉",
  "Deneme süresi — {n} gün kaldı": "Trial — {n} day(s) left",
  "Parolayı göster": "Show password",
  "Parolayı gizle": "Hide password",

  // --- Sekme başlıkları / meta ---
  "SOBSO! — Ortak Harcama Paylaşımı": "SOBSO! — Shared Expense Splitting",
  "Arkadaş grupları ve ortak girişimler için premium harcama paylaşım ve borç hesaplama uygulaması. I hope so!":
    "A premium expense-splitting and debt-tracking app for friend groups and shared ventures. I hope so!",
  Giriş: "Sign In",
  Kayıt: "Sign Up",
  "Yeni Grup": "New Group",
  "Gruba Katıl": "Join Group",

  // --- Placeholder'lar ---
  kullaniciadi: "username",
  "ornek@eposta.com": "you@example.com",
  KODUGIRINIZ: "YOURCODE",

  // --- Para birimi adları ---
  "ABD Doları": "US Dollar",
  "Arnavutluk Leki": "Albanian Lek",
  "BAE Dirhemi": "UAE Dirham",
  "Belarus Rublesi": "Belarusian Ruble",
  "Bosna-Hersek Markı": "Bosnian Mark",
  "Bulgar Levası": "Bulgarian Lev",
  "Çek Korunası": "Czech Koruna",
  "Çin Yuanı": "Chinese Yuan",
  "Danimarka Kronu": "Danish Krone",
  Euro: "Euro",
  "Gürcistan Larisi": "Georgian Lari",
  "İngiliz Sterlini": "British Pound",
  "İsveç Kronu": "Swedish Krona",
  "İsviçre Frangı": "Swiss Franc",
  "İzlanda Kronu": "Icelandic Krona",
  "Japon Yeni": "Japanese Yen",
  "Macar Forinti": "Hungarian Forint",
  "Makedon Dinarı": "Macedonian Denar",
  "Moldova Leyi": "Moldovan Leu",
  "Norveç Kronu": "Norwegian Krone",
  "Polonya Zlotisi": "Polish Zloty",
  "Rumen Leyi": "Romanian Leu",
  "Rus Rublesi": "Russian Ruble",
  "Sırp Dinarı": "Serbian Dinar",
  "Türk Lirası": "Turkish Lira",
  "Ukrayna Grivnası": "Ukrainian Hryvnia",

  // --- Sunucu mesajları: genel ---
  "Oturum bulunamadı.": "Session not found.",
  // --- E-posta doğrulama + şifre sıfırlama ---
  "E-posta Doğrulama": "Verify E-mail",
  "E-postanı doğrula": "Verify your e-mail",
  "Sana 6 haneli bir kod gönderdik: {email}":
    "We sent a 6-digit code to: {email}",
  "Doğrula": "Verify",
  "Kodu tekrar gönder": "Resend code",
  "Kod gönderildi.": "Code sent.",
  "E-posta doğrulandı 🎉": "E-mail verified 🎉",
  "Hesabında kayıtlı e-posta yok.": "Your account has no e-mail on file.",
  "Çok sık kod istendi. Lütfen 1 saat sonra tekrar dene.":
    "Too many codes requested. Please try again in an hour.",
  "E-posta gönderilemedi. Lütfen daha sonra tekrar dene.":
    "Couldn't send the e-mail. Please try again later.",
  "Kod hatalı.": "Incorrect code.",
  "Kodun süresi dolmuş; yeni kod iste.":
    "The code has expired; request a new one.",
  "Çok fazla yanlış deneme; yeni kod iste.":
    "Too many wrong attempts; request a new one.",
  "Şifremi Unuttum": "Forgot Password",
  "Şifreni mi unuttun?": "Forgot your password?",
  "E-posta adresini gir; sana 6 haneli bir sıfırlama kodu gönderelim.":
    "Enter your e-mail and we'll send you a 6-digit reset code.",
  "Kod gönder": "Send code",
  "Eğer bu e-posta kayıtlıysa, sıfırlama kodu gönderildi.":
    "If this e-mail is registered, a reset code has been sent.",
  "6 haneli kod": "6-digit code",
  "Parolayı sıfırla": "Reset password",
  "Parolan güncellendi. Şimdi giriş yapabilirsin.":
    "Your password has been updated. You can sign in now.",
  "Parola en az 8 karakter olmalı.": "Password must be at least 8 characters.",
  "Özet para birimi": "Summary currency",
  "Kuru alınamadığı için şu para birimindeki gruplar toplamlara katılmadı: {list}":
    "Groups in these currencies were left out of the totals because their exchange rate is unavailable: {list}",
  "Girişe dön": "Back to sign in",
  "Kullanıcı adı veya e-posta": "Username or e-mail",
  "kullaniciadi veya ornek@eposta.com": "username or you@example.com",
  "Farklı e-posta dene": "Try a different e-mail",
  "SOBSO e-posta doğrulama kodun": "Your SOBSO verification code",
  "SOBSO şifre sıfırlama kodun": "Your SOBSO password reset code",
  "SOBSO hesabını doğrulamak için kodun:":
    "Your code to verify your SOBSO account:",
  "SOBSO şifreni sıfırlamak için kodun:":
    "Your code to reset your SOBSO password:",
  "Kod 10 dakika geçerlidir. Bu isteği sen yapmadıysan bu e-postayı yok say.":
    "The code is valid for 10 minutes. If you didn't request this, ignore this e-mail.",
  "Bu gruba erişiminiz yok.": "You don't have access to this group.",
  "Grup bulunamadı.": "Group not found.",
  "Kullanıcı bulunamadı.": "User not found.",
  "Harcama bulunamadı.": "Expense not found.",
  "Kayıt bulunamadı.": "Record not found.",
  "Üye bulunamadı.": "Member not found.",
  "Talep bulunamadı.": "Request not found.",
  "Dosya seçilmedi.": "No file selected.",
  "Bir fotoğraf seçmelisin.": "Please choose a photo.",
  Kullanıcı: "User",
  "Bir kullanıcı": "Someone",
  "Bir üye": "A member",
  "Bir grup": "a group",
  "Grup sahibi": "The group owner",
  "Silinen Kullanıcı": "Deleted User",

  // --- Sunucu mesajları: doğrulama ---
  "Tutar 0'dan büyük olmalı.": "Amount must be greater than 0.",
  "Açıklama gerekli.": "A description is required.",
  "Ödeyen grup üyesi olmalı.": "The payer must be a group member.",
  "En az bir katılımcı seçmelisiniz.": "Pick at least one participant.",
  "Payların toplamı ({sum}) tutara ({amount}) eşit olmalı.":
    "The shares total ({sum}) must equal the amount ({amount}).",
  "Geçersiz başlangıç tarihi.": "Invalid start date.",
  "Geçersiz üye.": "Invalid member.",
  "Geçersiz ad.": "Invalid name.",
  "Geçerli bir TR IBAN girin (TR + 24 rakam).":
    "Enter a valid Turkish IBAN (TR + 24 digits).",
  "En az 8 karakter olmalı.": "Must be at least 8 characters.",
  "Parolalar eşleşmiyor.": "Passwords don't match.",
  "Mevcut parola hatalı.": "Current password is wrong.",
  "Parola hatalı.": "Wrong password.",
  "Bu e-posta başka bir hesapta kayıtlı.":
    "This e-mail is registered to another account.",
  "Kullanıcı adı boş olamaz.": "Username can't be empty.",

  // --- Sunucu mesajları: gruplar / üyelik ---
  "Kişisel bütçe grubuna üye eklenemez.":
    "Members can't be added to a personal budget.",
  "Grup arşivde; üye eklenemez.": "Group is archived; members can't be added.",
  "Grup arşivde; değişiklik yapılamaz.":
    "Group is archived; changes aren't allowed.",
  "Grup arşivde; davet oluşturulamaz.":
    "Group is archived; invites can't be created.",
  "Grup arşivde; önce arşivden çıkar.":
    "Group is archived; unarchive it first.",
  "Kendini davet edemezsin.": "You can't invite yourself.",
  "'{name}' bulunamadı.": "'{name}' was not found.",
  "'{name}' zaten grupta.": "'{name}' is already in the group.",
  "'{name}' taleplerini kalıcı olarak reddetti; bu kullanıcıyı gruba ekleyemezsin.":
    "'{name}' permanently declined your requests; you can't add this user to groups.",
  "Taleplerini çok reddettiği için '{name}' kullanıcısını ~{hours} saat boyunca gruba ekleyemezsin.":
    "Because they declined too many of your requests, you can't add '{name}' for ~{hours} hours.",
  "'{name}' için bu grupta zaten bekleyen bir davet var.":
    "There's already a pending invitation for '{name}' in this group.",
  "'{name}' için 10 bekleyen talebin var; yanıtlanmadan yenisini gönderemezsin.":
    "You have 10 pending requests for '{name}'; wait for a response before sending more.",
  "Bu talep zaten yanıtlanmış.": "This request was already answered.",
  "Grup arşivlendiği için katılamazsın.":
    "You can't join because the group is archived.",
  "Bu gruba katılım kapalı.": "Joining this group is closed.",
  "Bu grup arşivlendi; katılım kapalı.":
    "This group is archived; joining is closed.",
  "Davet linkinin süresi dolmuş.": "This invite link has expired.",
  "Davet linki kullanım limitine ulaşmış.":
    "This invite link reached its usage limit.",
  "Üyeyi yalnızca grubu kuran kişi çıkarabilir.":
    "Only the group owner can remove members.",
  "Grup sahibi çıkarılamaz.": "The group owner can't be removed.",
  "Bu üyenin harcama/ödeme kayıtları var; çıkarılamaz. (Yanlış eklenen üyeler ancak kayıt oluşmadan çıkarılabilir.)":
    "This member has expense/payment records and can't be removed. (Mistakenly added members can only be removed before any records exist.)",
  "Grup adını yalnızca grup sahibi değiştirebilir.":
    "Only the group owner can rename the group.",
  "Kişisel bütçenin adı değiştirilemez.":
    "The personal budget can't be renamed.",
  "Bunu yalnızca grup sahibi yapabilir.": "Only the group owner can do this.",
  "Kişisel bütçe arşivlenemez.": "The personal budget can't be archived.",
  "Kişisel bütçeden ayrılamazsın.": "You can't leave your personal budget.",
  "Grup sahibi ayrılamaz. İstersen grubu arşivleyebilir veya silebilirsin.":
    "The owner can't leave. You can archive or delete the group instead.",
  "Açık borcun/alacağın varken gruptan ayrılamazsın. Önce ödeşmeyi tamamla.":
    "You can't leave while you have open debts or credits. Settle up first.",
  "Grubu yalnızca kuran kişi silebilir.": "Only the owner can delete the group.",
  "Kişisel bütçe grubuna davet oluşturulamaz.":
    "Invites can't be created for a personal budget.",
  "Bütçeyi yalnızca grup sahibi belirleyebilir.":
    "Only the group owner can set the budget.",
  "Bu harcamayı silme yetkiniz yok.":
    "You're not allowed to delete this expense.",
  "Bu harcamayı düzenleme yetkiniz yok.":
    "You're not allowed to edit this expense.",
  "Bunu silme yetkiniz yok.": "You're not allowed to delete this.",
  "Gelir yalnızca kişisel bütçeye eklenebilir.":
    "Income can only be added to the personal budget.",

  // --- Sunucu mesajları: ödeşme ---
  "Bu borcu yalnızca alacaklı (parayı alan kişi) ödendi işaretleyebilir.":
    "Only the creditor (who receives the money) can mark this debt as paid.",
  "Bu borç güncel değil ya da zaten kapanmış.":
    "This debt is out of date or already settled.",
  "Bu borç güncel değil.": "This debt is out of date.",
  "Bu ödemeyi yalnızca alacaklı geri alabilir.":
    "Only the creditor can undo this payment.",
  "Bu borç için bugün zaten hatırlatma gönderdin (günde 1 kez).":
    "You already sent a reminder for this debt today (once a day).",

  // --- Bildirimler / aktivite (kayıt anında çevrilir) ---
  '"{name}" grubu oluşturuldu': '"{name}" group was created',
  '"{group}" grubuna davet edildin': "You were invited to \"{group}\"",
  "{name} seni eklemek istiyor. Onaylarsan gruba katılırsın.":
    "{name} wants to add you. Accept to join the group.",
  "{name} daveti kabul edip gruba katıldı":
    "{name} accepted the invitation and joined",
  "{name} davetini kabul etti": "{name} accepted your invitation",
  '"{group}" grubuna katıldı.': "They joined \"{group}\".",
  "Grup ekleme engeli (kalıcı)": "Group-add block (permanent)",
  "Grup ekleme engeli (24 saat)": "Group-add block (24 hours)",
  "{name}, taleplerini tekrar tekrar reddetti. Bu kullanıcıyı artık hiçbir gruba ekleyemezsin.":
    "{name} declined your requests repeatedly. You can no longer add this user to any group.",
  "{name}, taleplerini 5 kez reddetti. 24 saat boyunca bu kullanıcıyı hiçbir gruba ekleyemezsin.":
    "{name} declined your requests 5 times. You can't add this user to any group for 24 hours.",
  "{name} harcama ekledi": "{name} added an expense",
  '"{desc}" harcaması silindi': 'Expense "{desc}" was deleted',
  '"{desc}" harcaması düzenlendi': 'Expense "{desc}" was edited',
  "{from} → {to}: ödeme alındı ({amount})":
    "{from} → {to}: payment received ({amount})",
  "{name} ödemeni onayladı": "{name} confirmed your payment",
  "{amount} tutarındaki borcun kapandı. 🎉":
    "Your debt of {amount} is settled. 🎉",
  "{name} borcunu hatırlattı": "{name} sent a debt reminder",
  '"{group}" grubunda {amount} {cur} borcun var.':
    'You owe {amount} {cur} in "{group}".',
  "{from} → {to} ödemesi geri alındı": "{from} → {to} payment was undone",
  "{name} davet linkiyle katıldı": "{name} joined via invite link",
  "{name} gruptan çıkarıldı": "{name} was removed from the group",
  '"{group}" grubundan çıkarıldın': "You were removed from \"{group}\"",
  "{name} seni gruptan çıkardı.": "{name} removed you from the group.",
  'Grup adı "{old}" → "{new}" olarak değiştirildi':
    'Group renamed from "{old}" to "{new}"',
  "Grubun adı değişti": "Group name changed",
  '"{old}" grubunun yeni adı: "{new}"':
    'The group "{old}" is now called "{new}"',
  "Grup arşivlendi": "Group archived",
  "Grup arşivden çıkarıldı": "Group unarchived",
  "{name} gruptan ayrıldı": "{name} left the group",
  '{name} "{group}" grubundan ayrıldı': '{name} left "{group}"',
  "Aylık bütçe {x} olarak ayarlandı": "Monthly budget set to {x}",
  "Aylık bütçe kaldırıldı": "Monthly budget removed",
  'Tekrarlayan harcama eklendi: "{desc}"': 'Recurring expense added: "{desc}"',
  'Tekrarlayan "{desc}" {n} kez işlendi':
    'Recurring "{desc}" ran {n} time(s)',
  "Yaklaşan ödeme: {desc}": "Upcoming payment: {desc}",
  "{amount} tutarındaki ödemene {n} gün kaldı.":
    "{n} day(s) left until your payment of {amount}.",
};
