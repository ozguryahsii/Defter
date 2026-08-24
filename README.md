# Defter

Arkadaş grubu tatilleri ve ortak girişimler için **ortak harcama paylaşım** uygulaması.
Herkes kendi harcamalarını girer, harcamanın kimleri kapsadığını seçer; uygulama her
harcamadan sonra **kim kime ne kadar borçlu** tablosunu otomatik olarak yeniden hesaplar.

> ### İki uygulama
> - **`web/`** — Modern, premium **Next.js + TypeScript + Tailwind + shadcn/ui**
>   full-stack sürüm (Prisma + SQLite, Auth.js). Aktif geliştirilen arayüz.
>   Kurulum için [`web/README.md`](web/README.md).
> - **`src/Defter.Web/`** — Windows Service olarak çalışan ASP.NET Core (.NET 8)
>   sürümü (aşağıda). SQLite + yerel giriş.

---


- **Backend/Web:** ASP.NET Core (.NET 8) MVC — Windows Service olarak çalışır.
- **Veritabanı:** SQLite (tek dosya, `%ProgramData%\Defter\defter.db`).
- **Kimlik doğrulama:** Yerel kullanıcı adı/parola (ASP.NET Core Identity, PBKDF2 hash). LDAP yok.
- **Mobil:** Ayrı bir repoda geliştirilecek; aynı SQLite/servis mantığı temel alınabilir.

> Bu sürüm yalnızca `http://127.0.0.1:5100` (localhost) üzerinde dinler; dışarıya açılmaz.

## Özellikler

- Kullanıcı kaydı ve girişi (parola en az 8 karakter, 5 hatalı denemede 15 dk kilit).
- "Ortak Harcama Oluştur" → grup (Tatil veya Girişim türü, para birimi seçimi).
- Gruba **kullanıcı adına göre** üye ekleme.
- Harcama girişi: tutar, ödeyen, açıklama, kategori, tarih ve **kimleri kapsadığı**.
  - **Eşit böl** (kuruş farkı adil dağıtılır) veya **özel tutarlar**.
- Her harcamadan sonra otomatik güncellenen **net bakiye** ve **sadeleştirilmiş borç** tablosu
  (minimum sayıda transfer — "A → C: 150 ₺").

## Güvenlik notları

- Parolalar yalnızca hash olarak saklanır (ASP.NET Core Identity / PBKDF2).
- Tüm POST işlemlerinde anti-forgery (CSRF) token doğrulaması zorunludur.
- Bir kullanıcı yalnızca **üyesi olduğu** grupları görebilir/değiştirebilir (yetki kontrolü her istekte).
- Harcamayı yalnızca **ödeyen** ya da **grup sahibi** silebilir.
- Sıkı güvenlik başlıkları (CSP, X-Frame-Options: DENY, nosniff, no-referrer).
- Servis yalnızca localhost'a bağlanır; ağa açık değildir.

## Gereksinimler

- Windows 10/11 veya Windows Server
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) (derlemek için)

## Geliştirme ortamında çalıştırma

```powershell
cd src\Defter.Web
dotnet run
```

Tarayıcıdan `http://127.0.0.1:5100` adresine gidin. İlk açılışta veritabanı otomatik oluşturulur.

## Windows Service olarak kurulum

1. **Yayınla** (self-contained, tek dosya):

   ```powershell
   dotnet publish src\Defter.Web\Defter.Web.csproj -c Release -p:PublishSingleFile=true --self-contained true -o C:\Defter
   ```

   > Not: `RuntimeIdentifier` yalnızca `PublishSingleFile=true` verildiğinde `win-x64`
   > olarak devreye girer. Farklı mimari için `-r win-arm64` ekleyebilirsiniz.

2. **Servisi oluştur** (yönetici PowerShell):

   ```powershell
   New-Service -Name "Defter" -BinaryPathName "C:\Defter\Defter.Web.exe" -DisplayName "Defter" -StartupType Automatic
   Start-Service Defter
   ```

3. Tarayıcıdan `http://127.0.0.1:5100` adresine gidin.

### Servisi kaldırma

```powershell
Stop-Service Defter
sc.exe delete Defter
```

## Yapılandırma

`appsettings.json` içinden değiştirilebilir:

| Ayar | Açıklama | Varsayılan |
|------|----------|------------|
| `Urls` | Dinlenecek adres | `http://127.0.0.1:5100` |
| `Defter:DataDirectory` | SQLite ve anahtar klasörü | `%ProgramData%\Defter` |

## Veri konumu

- Veritabanı: `%ProgramData%\Defter\defter.db`
- Data Protection anahtarları: `%ProgramData%\Defter\keys`

Yedeklemek için bu klasörü kopyalamanız yeterlidir. Sıfırlamak için servis durdurulup
`defter.db` silinebilir (şema bir sonraki başlangıçta yeniden oluşturulur).

## Proje yapısı

```
Defter.sln
src/Defter.Web/
  Program.cs               # Servis konağı, kimlik, güvenlik, kültür
  Data/                    # AppDbContext + ApplicationUser
  Models/                  # ExpenseGroup, GroupMember, Expense, ExpenseShare
  Services/                # SettlementCalculator (bakiye + borç sadeleştirme)
  Controllers/             # Account, Groups, Expenses, Home
  ViewModels/              # Form/görünüm modelleri
  Views/                   # Razor görünümleri
  wwwroot/                 # site.css, app.js
```

## Yol haritası (sonraki adımlar)

- Yüzde/hisse bazlı bölüşüm ve girişim modunda **ortaklık oranı** ile otomatik dağıtım.
- SignalR ile borç tablosunun sayfa yenilemeden anlık güncellenmesi.
- Hesaplaşma (settlement) akışı: "ödedim" işaretleme + karşı onay, IBAN/QR.
- Mobil istemci (ayrı repo) için REST API katmanı.
