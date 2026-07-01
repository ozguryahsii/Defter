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
