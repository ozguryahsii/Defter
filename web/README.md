# Defter — Web (Next.js)

Premium, dark-mode-first bir SaaS dashboard olarak yeniden yazılmış Defter arayüzü.
Ortak harcama grupları, canlı borç hesaplama ve hakkaniyetli ödeşme — modern bir
full-stack Next.js uygulaması içinde.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** bileşen mimarisi
- **Framer Motion** (sayfa/hover/modal animasyonları) + Magic UI tarzı efektler
  (spotlight kart, number ticker, aurora arka plan)
- **Recharts** (KPI, alan/çubuk/donut grafikleri)
- **Lucide** ikonları
- **Prisma + SQLite** (yerel veritabanı)
- **Auth.js (NextAuth)** — yerel kullanıcı adı/parola girişi (bcrypt hash)

## Gereksinimler

- Node.js 18.18+ (öneri: 20 veya 22)

## Kurulum

```bash
cd web
npm install                 # bağımlılıklar + prisma generate (postinstall)
cp .env.example .env        # ortam değişkenleri
```

`.env` içindeki `NEXTAUTH_SECRET` değerini güçlü bir değerle değiştir:

```bash
# Linux/macOS
openssl rand -base64 32
# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
```

Veritabanını oluştur ve örnek veriyle doldur:

```bash
npm run db:push             # SQLite şemasını oluşturur
npm run db:seed             # gerçekçi örnek veri (tatil + girişim grubu)
```

Geliştirme sunucusu:

```bash
npm run dev                 # http://localhost:3000
```

### Demo hesabı

Seed sonrası hazır gelen hesap:

```
kullanıcı: demo
parola:    demo12345
```

## Komutlar

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Production derleme |
| `npm run start` | Production sunucusu |
| `npm run db:push` | Prisma şemasını SQLite'a uygula |
| `npm run db:seed` | Örnek veriyi yükle |
| `npm run db:reset` | Şemayı sıfırla + yeniden seed |
| `npm run db:fresh` | Şemayı sıfırla, **boş** başla (seed yok) |
| `npm run start:prod` | Production sunucusunu tek süreçte çalıştır (test) |
| `npm run service:install` | Windows Service olarak kur (yönetici) |
| `npm run service:uninstall` | Windows Service'i kaldır (yönetici) |

## Production + Windows Service (kalıcı çalıştırma)

Her seferinde `npm run` yazmadan, bilgisayar açılınca kendiliğinden başlayan,
arka planda çalışan bir **Windows Service** olarak kurmak için:

### 1. Gerçek bir `NEXTAUTH_SECRET` ayarla (production şart)

`.env` içindeki `NEXTAUTH_SECRET="change-me"` değerini güçlü bir değerle değiştir:

```powershell
# PowerShell ile üret ve .env'e yaz
$secret = [Convert]::ToBase64String((1..32 | % { Get-Random -Max 256 }))
"NEXTAUTH_SECRET=$secret"
```

Ağdaki başka cihazlardan erişilecekse `.env` içinde `NEXTAUTH_URL`'yi de
sunucunun adresine göre ayarla (örn. `http://192.168.1.20:3000`).

### 2. Veritabanını hazırla

```powershell
npm run db:push      # şemayı kur
# Sıfırdan, boş (demo verisi olmadan) başlamak istersen:
npm run db:fresh
```

> Veri kalıcıdır: `web/prisma/dev.db` dosyasında tutulur. Yedeklemek için bu
> dosyayı kopyalaman yeterli.

### 3. Production build al

```powershell
npm run build
```

### 4. Servisi kur (yönetici PowerShell)

```powershell
npm run service:install
```

Bu, `Defter` adında bir Windows Service oluşturur; otomatik başlar, çökerse
kendini yeniden başlatır. Tarayıcıdan **http://localhost:3000**.

Yönetim:

```powershell
Start-Service Defter
Stop-Service Defter
Restart-Service Defter
Get-Service Defter
```

Kaldırmak için:

```powershell
npm run service:uninstall
```

> **Kod/şema güncellediğinde:** `git pull` → `npm install` → `npm run build` →
> `Restart-Service Defter`. Şema değiştiyse ayrıca `npm run db:push`.

### Ayarlar (ortam değişkenleri)

| Değişken | Açıklama | Varsayılan |
|----------|----------|------------|
| `PORT` | Dinlenen port | `3000` |
| `HOST` | Bağlanılan arayüz (`0.0.0.0` = ağa açık) | `0.0.0.0` |
| `DATABASE_URL` | SQLite dosya yolu | `file:./dev.db` |
| `NEXTAUTH_SECRET` | Oturum imzalama anahtarı (production'da zorunlu) | — |
| `NEXTAUTH_URL` | Uygulamanın dış adresi | `http://localhost:3000` |

Portu değiştirmek için servisi kurmadan önce `.env`'e `PORT=8080` gibi bir satır
ekleyip `npm run service:install` çalıştır (kaldırıp yeniden kurman gerekir).

## Mimari

```
web/
  app/
    (auth)/            # giriş / kayıt (aurora arka plan)
    (app)/             # kimlik doğrulama gerektiren alan
      dashboard/       # KPI + grafikler + gruplar (loading skeleton)
      groups/          # liste, yeni, [id] detay (loading + not-found)
    api/auth/          # NextAuth route
  components/
    ui/                # shadcn/ui primitifleri
    layout/            # sidebar, topbar, theme toggle, user menu
    dashboard/         # stat card, group card, settlement/balance list…
    charts/            # recharts sarmalayıcıları
    magic/             # number ticker, spotlight card, aurora, reveal
    groups/            # harcama ekleme dialog'u, üye ekleme, harcama listesi
  lib/
    settlement.ts      # bakiye + borç sadeleştirme (çekirdek matematik)
    queries.ts         # sunucu tarafı veri çekme + KPI hesaplama
    actions.ts         # server action'lar (grup/üye/harcama/kayıt)
    auth.ts            # NextAuth yapılandırması
    prisma.ts          # Prisma client
  prisma/
    schema.prisma      # User, Group, GroupMember, Expense, ExpenseShare
    seed.ts            # örnek veri
```

## Notlar

- **Tema:** dark-mode öncelikli; sağ üstteki düğmeyle light/dark geçişi.
- **Güvenlik:** parolalar bcrypt ile hash'lenir; korumalı alanlar `middleware`
  ve her istekte üyelik kontrolü ile korunur; server action'larda yetki denetimi.
- **Canlı güncelleme:** her harcama sonrası borç tablosu yeniden hesaplanır
  (`router.refresh()` + sunucu tarafı yeniden hesaplama).
