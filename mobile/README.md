# SOBSO! — iOS + Android (Capacitor)

Bu klasör, SOBSO! web uygulamasını iPhone/iPad ve Android cihazlarda native
uygulama olarak çalıştıran Capacitor kabuğudur. Uygulama içeriği
`capacitor.config.ts` içindeki `server.url` adresinden yüklenir — yani native
kabuk, çalışan bir SOBSO sunucusuna bağlanır.

Android kurulumu için aşağıdaki **Android (Google Play)** bölümüne bak.

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
(Run) tuşuna bas. Uygulama açılır ve `http://localhost:3333` üzerinden
SOBSO yüklenir (simülatör, Mac'in localhost'unu görür).

## Gerçek iPhone'da çalıştırma

1. iPhone ile Mac **aynı Wi-Fi ağında** olmalı.
2. Mac'in IP'sini öğren: `ipconfig getifaddr en0` (örn. 192.168.1.20)
3. Sunucu URL'ini o IP ile senkronla:
   ```bash
   cd Defter/mobile
   CAP_SERVER_URL=http://192.168.1.20:3333 npx cap sync ios
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

`Info.plist` içindeki ATS ayarı mağaza için hazırdır: `NSAllowsArbitraryLoads`
yerine sadece yerel ağı açan dar kapsamlı istisnalar kullanılır, canlı trafik
https kalır. Kaldırman gereken bir şey yok.

## Bildirimler

Kabukta `@capacitor/local-notifications` kurulu. Uygulama açıldığında bildirim
izni ister; izin verilince:

- yeni gelen bildirimler telefonun bildirim merkezinde banner olarak çıkar,
- kişisel bütçedeki ileri tarihli ödemeler için 2 ve 1 gün önce saat 10:00'da
  hatırlatma planlanır — bunlar uygulama **kapalıyken de** düşer.

Bunlar *yerel* (local) bildirimlerdir; cihazın kendisi gösterir, sunucudan
gönderim yapılmaz. Uygulama tamamen kapalıyken **başka birinin** yaptığı
işlem için bildirim göndermek (ör. "Ayşe gruba harcama ekledi") uzaktan
gönderim gerektirir: Apple Developer üyeliği + APNs anahtarı + sunucu
tarafında gönderim servisi. O adım henüz yapılmadı.

Bildirim izni satırı iOS Ayarlar'da ancak uygulama izni **bir kez istedikten
sonra** görünür; bu sürümden önce hiç istenmediği için satır yoktu.

## App Store'a gönderme

1. **Apple Developer Program** üyeliği gerekir ($99/yıl):
   https://developer.apple.com/programs/ — kayıt 1-2 gün sürebilir.
2. Xcode → proje ayarları → **Signing & Capabilities**: Team olarak
   geliştirici hesabını seç. Bundle Identifier `net.sobso.app` olmalı.
3. **App Store Connect**'te (https://appstoreconnect.apple.com) yeni
   uygulama kaydı aç; aynı bundle ID'yi seç.
4. Sunucu adresini canlıya al ve arşivle:
   ```bash
   cd Defter/mobile
   CAP_SERVER_URL=https://sobso.net npx cap sync ios
   npx cap open ios
   ```
   Xcode'da cihaz olarak **Any iOS Device (arm64)** seç →
   Product → Archive → Distribute App → App Store Connect.
5. Yükleme bitince App Store Connect'te **TestFlight** sekmesinden kendine
   ve test kullanıcılarına dağıt; hazır olunca **App Review**'a gönder.

Sürüm numaraları Xcode'da: `MARKETING_VERSION` (kullanıcıya görünen, "1.0")
ve `CURRENT_PROJECT_VERSION` (her yüklemede artmalı: 1, 2, 3 …).

## Sık karşılaşılanlar

- **Beyaz/siyah ekran:** web sunucusu çalışmıyor demektir; Terminal 1'i
  kontrol et.
- **Config değişikliği etki etmedi:** her `capacitor.config.ts`
  değişikliğinden sonra `npx cap sync ios` çalıştır.
- **Xcode "Signing" hatası:** Xcode → Settings → Accounts'a Apple ID ekle,
  sonra proje ayarlarında Team olarak onu seç.

---

# Android (Google Play)

## Gerekenler (bir kez)

**Android Studio** kur (https://developer.android.com/studio). Kurulum
sihirbazı Android SDK'yı ve JDK'yı da getirir; ayrıca bir şey kurmana
gerek yok.

## Emülatörde test

Android emülatörü (BlueStacks dahil) **Mac'in `localhost` adresini
göremez** — kendi sanal makinesidir. Bu yüzden Android'de sunucu adresini
açıkça vermek gerekir. İki seçenek:

**A) Canlı sunucuya bağlan (en kolay, önerilen):**
```bash
cd Defter/mobile
CAP_SERVER_URL=https://sobso.net npx cap sync android
npx cap open android
```

**B) Mac'teki geliştirme sunucusuna bağlan:**
```bash
# 1) Mac'in LAN IP'sini öğren
ipconfig getifaddr en0            # örn. 192.168.1.20

# 2) Web'i dışa açık başlat (ayrı terminalde)
cd Defter/web && npm run dev -- -H 0.0.0.0

# 3) Kabuğu o adrese bağla
cd Defter/mobile
CAP_SERVER_URL=http://192.168.1.20:3333 npx cap sync android
npx cap open android
```

Android Studio açılınca üstteki cihaz listesinden bir emülatör seç ve ▶︎
(Run) tuşuna bas.

**BlueStacks kullanacaksan:** BlueStacks'i Android Studio sürmez; ona APK
kurulur. Önce APK üret, sonra APK dosyasını BlueStacks penceresine
sürükle-bırak:
```bash
cd Defter/mobile/android
./gradlew assembleDebug
# çıktı: android/app/build/outputs/apk/debug/app-debug.apk
```

## Play Store için imza anahtarı (bir kez, ÇOK ÖNEMLİ)

Google Play'e yüklenen her sürüm aynı anahtarla imzalanmalıdır. Bu anahtarı
kaybedersen uygulamayı bir daha güncelleyemezsin — yedeğini güvenli bir
yerde sakla (depoya KOYMA, `.gitignore` zaten engelliyor).

```bash
cd Defter/mobile/android
keytool -genkey -v -keystore sobso-release.jks -keyalg RSA -keysize 2048 \
  -validity 10000 -alias sobso
```

Sorulan parolayı ve bilgileri gir, sonra parolaları `keystore.properties`
dosyasına yaz (bu dosya da depoya girmez):

```bash
cat > keystore.properties <<'EOF'
storeFile=sobso-release.jks
storePassword=SENIN_PAROLAN
keyAlias=sobso
keyPassword=SENIN_PAROLAN
EOF
```

## Mağaza paketi (AAB) üretme

Play Store `.aab` (Android App Bundle) ister, `.apk` değil.

```bash
cd Defter/mobile
CAP_SERVER_URL=https://sobso.net npx cap sync android
cd android && ./gradlew bundleRelease
# çıktı: android/app/build/outputs/bundle/release/app-release.aab
```

Her yeni sürümde `android/app/build.gradle` içindeki `versionCode` bir
artırılmalı (1 → 2 → 3 …), `versionName` ise kullanıcıya görünen sürümdür
("1.0", "1.1" …).
