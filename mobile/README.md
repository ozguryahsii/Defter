# SOBSO! — iOS (Capacitor)

Bu klasör, SOBSO! web uygulamasını iPhone/iPad'de native uygulama olarak
çalıştıran Capacitor kabuğudur. Uygulama içeriği `capacitor.config.ts`
içindeki `server.url` adresinden yüklenir — yani native kabuk, çalışan bir
SOBSO sunucusuna bağlanır.

## Mac'te ilk kurulum (bir kez)

Gerekenler: **Xcode** (App Store'dan) ve **Node.js** (https://nodejs.org, LTS).
CocoaPods GEREKMEZ (Capacitor 8, Swift Package Manager kullanır).

```bash
git clone https://github.com/ozguryahsii/Defter.git
cd Defter
git checkout claude/expense-splitting-app-h4vl8d

# 1) Web uygulamasını hazırla
cd web
npm install
npm run db:migrate   # yoksa: npx prisma migrate deploy
cd ..

# 2) iOS kabuğunu hazırla
cd mobile
npm install
npx cap sync ios
```

## Simülatörde çalıştırma

İki terminal aç:

**Terminal 1 — web sunucusu:**
```bash
cd Defter/web
npm run dev
```

**Terminal 2 — Xcode'u aç:**
```bash
cd Defter/mobile
npx cap open ios
```

Xcode açılınca üstteki cihaz listesinden bir iPhone simülatörü seç ve ▶︎
(Run) tuşuna bas. Uygulama açılır ve `http://localhost:3000` üzerinden
SOBSO yüklenir (simülatör, Mac'in localhost'unu görür).

## Gerçek iPhone'da çalıştırma

1. iPhone ile Mac **aynı Wi-Fi ağında** olmalı.
2. Mac'in IP'sini öğren: `ipconfig getifaddr en0` (örn. 192.168.1.20)
3. Sunucu URL'ini o IP ile senkronla:
   ```bash
   cd Defter/mobile
   CAP_SERVER_URL=http://192.168.1.20:3000 npx cap sync ios
   ```
4. `web` tarafını dış bağlantı kabul edecek şekilde başlat:
   ```bash
   cd Defter/web
   npm run dev -- -H 0.0.0.0
   ```
5. Xcode'da cihaz olarak iPhone'unu seç, Run'a bas. İlk seferde Xcode →
   Signing & Capabilities sekmesinde ücretsiz Apple ID'nle bir "Team"
   seçmen gerekir; iPhone'da da Ayarlar → Genel → VPN ve Cihaz Yönetimi
   → geliştiriciye güven demen istenir.

## Canlıya geçince (sobso.net)

```bash
CAP_SERVER_URL=https://sobso.net npx cap sync ios
```

Ayrıca markete göndermeden önce `ios/App/App/Info.plist` içindeki
`NSAppTransportSecurity` bloğu (yerel http testi için eklendi) kaldırılmalı.

## Sık karşılaşılanlar

- **Beyaz/siyah ekran:** web sunucusu çalışmıyor demektir; Terminal 1'i
  kontrol et.
- **Config değişikliği etki etmedi:** her `capacitor.config.ts`
  değişikliğinden sonra `npx cap sync ios` çalıştır.
- **Xcode "Signing" hatası:** Xcode → Settings → Accounts'a Apple ID ekle,
  sonra proje ayarlarında Team olarak onu seç.
