# SOBSO! — Android Yayın Planı

Bu doküman, SOBSO!'nun Google Play'de yayınlanması için gereken adımları
fazlara ayırarak listeler. `IOS-BUILD-REHBERI.md` ile aynı klasörde durur;
iOS tarafı zaten mağazada, bu doküman Android'in aynı noktaya gelmesini
kapsar.

## Mevcut durum (kod incelemesi)

**Hazır olanlar:**
- Android platformu eklenmiş (`cap add android` yapılmış, `mobile/android/` var)
- Paket adı `net.sobso.app` — iOS ile tutarlı
- Uygulama ikonu (`ic_launcher`) zaten SOBSO markalı
- Uygulama adı `strings.xml`'de doğru ("SOBSO!")
- **Sunucu/webhook tarafı zaten platform-agnostik** — `web/app/api/revenuecat/webhook/route.ts`
  hem `APP_STORE` hem `PLAY_STORE` event'lerini destekliyor, ekstra iş gerekmiyor
- CSP kısıtlaması yok, Android WebView'ı engelleyecek bir şey yok
- SDK sürümleri güncel (minSdk 24, target/compile 36)

**Kod tarafında eksik/kırık:**
1. `android/app/src/main/res/values/colors.xml` **hiç yok** — `styles.xml` ona
   (`@color/colorPrimary` vb.) referans veriyor, şu haliyle **derleme patlar**
2. `splash.png` hâlâ varsayılan Capacitor placeholder'ı (mavi X logo),
   SOBSO markası değil (11 yoğunluk/varyant dosyası)
3. `AndroidManifest.xml`'de sadece `INTERNET` izni var — kamera, galeri,
   bildirim izinleri eksik
4. `web/components/premium/premium-screen.tsx` RevenueCat akışı **sadece
   iOS'a bağlı** (`isIosApp` kontrolü, `RC_APPLE_KEY` hardcoded) — Android'de
   native satın alma hiç çalışmıyor, genel "web" moduna (indirim kodu +
   "yakında") düşüyor
5. `web/lib/use-native-platform.ts` sadece `"ios"` platformunu tanıyor

**Hesap/dış sistem eksikleri:**
- Geliştirme Mac'inde Android Studio / SDK / JDK kurulu değil
- Firebase projesi yok → `google-services.json` yok → FCM push çalışmaz
- RevenueCat projesine Android app hiç eklenmemiş, Play Console'a bağlanmamış
- Play Console'da abonelik ürünleri (aylık/yıllık) yok
- Release imzalama anahtarı (keystore) yok

---

## Faz 0 — Ortam kurulumu (tek seferlik)

- [Android Studio](https://developer.android.com/studio) indir/kur (Mac
  işlemcisine göre Apple Silicon / Intel seç)
- "Standard" kurulum yeterli — SDK ve JDK'yı otomatik getirir

## Faz 1 — Kod düzeltmeleri

- `colors.xml` oluştur (SOBSO renkleriyle: mor `#6C63FF`, koyu arka plan `#09090b`)
- `splash.png`'leri SOBSO markasıyla değiştir (tüm yoğunluk varyantları:
  mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi × port/land + universal)
- `AndroidManifest.xml`'e izinleri ekle: `CAMERA`, `READ_MEDIA_IMAGES`
  (Android 13+) / `READ_EXTERNAL_STORAGE` (eski sürümler), `POST_NOTIFICATIONS`
  (Android 13+, push+local bildirim için), `SCHEDULE_EXACT_ALARM` (hatırlatma
  bildirimleri tam zamanında çalışsın diye)
- `use-native-platform.ts`'i Android'i de tanıyacak şekilde genişlet
- `premium-screen.tsx`'e Android IAP dalını ekle (RevenueCat Google Play
  SDK key'i Faz 3'te alınınca doldurulacak)

## Faz 2 — Firebase + Push (FCM)

- [Firebase Console](https://console.firebase.google.com)'da proje oluştur,
  Android app olarak `net.sobso.app`'i ekle
- İnen `google-services.json`'ı `mobile/android/app/` klasörüne koy
  (`.gitignore`'da olmalı — sunucudaki gibi hassas dosya, repoya girmez)
- Not: sunucu tarafı zaten hazır (`web/lib/push/fcm.ts`, `FCM_SERVICE_ACCOUNT`
  env) — sadece client tarafı bağlanacak
- Gerçek cihazda (ya da emulator'da — Android'de push simülatörde de
  çalışır, iOS'un aksine) push kaydını test et: izin iste → token al →
  `/api/push/register`'a gitti mi doğrula

## Faz 3 — RevenueCat + Google Play Billing

- RevenueCat dashboard → SOBSO projesine **Google Play** app'i ekle
- Play Console → Setup → API access: Google Cloud servis hesabı oluştur,
  RevenueCat'e bağla (satın alma doğrulaması ve real-time developer
  notifications için gerekli)
- Play Console'da 2 abonelik ürünü oluştur (App Store'daki gibi: aylık
  $2.99, yıllık $24.99 — product ID'ler `net.sobso.premium.monthly` /
  `.yearly` ile tutarlı tutulabilir)
- RevenueCat'te Android paketlerini mevcut "Sobso Pro" entitlement'ına bağla
- `premium-screen.tsx`'teki Android SDK key'ini gerçek değerle doldur

## Faz 4 — İmzalama + ilk build

- Release keystore oluştur (`keytool`), **parolaları güvenli bir yerde sakla**
  — kaybolursa uygulamayı aynı kimlikle güncelleyemezsin (Play App Signing'e
  kayıtlıysan Google desteğiyle kurtarılabilir)
- `keystore.properties` doldur (repoya girmez, `.gitignore`'da zaten var)
- İlk internal test build'ini al (`./gradlew bundleRelease` ya da
  `assembleRelease`), gerçek cihazda çalıştır

## Faz 5 — Play Console mağaza girişi + test

- Mağaza açıklaması, ekran görüntüleri (Android'e özgü boyutlar), feature
  graphic (1024×500), yüksek çözünürlüklü ikon (512×512)
- İçerik derecelendirme anketi
- Data safety formu (finansal veri, kamera/galeri, bildirim toplama)
- Hedef kitle ve içerik
- Gizlilik politikası linki (zaten var: `sobso.net/privacy`)
- Internal testing track'e AAB yükle, kendi hesabını test kullanıcısı ekle
  (Play Console → Setup → License testing)
- Satın alma akışını test hesabıyla uçtan uca dene

## Faz 6 — Production'a gönder

- Internal test sorunsuzsa production track'e terfi ettir
- Google incelemesini bekle (genelde Apple'dan daha hızlı — saatler/birkaç gün)

---

## Notlar

- iOS'ta yaşanan ve saatler süren push bildirimi hatası (eksik
  `AppDelegate` köprüsü — bkz. `AppDelegate.swift` commit geçmişi), Android'de
  **yaşanmaz**: `@capacitor/push-notifications` Android'de manuel kod
  gerektirmiyor, sadece `google-services.json` yeterli.
- iOS'ta kaldırılan Face ID zorunluluğu kararı Android'de de geçerli —
  Android tarafına biyometrik kilit eklenmeyecek.
- Sunucu (Hetzner, Docker) tarafında **hiçbir değişiklik gerekmiyor** —
  webhook zaten iki mağazayı da destekliyor.
