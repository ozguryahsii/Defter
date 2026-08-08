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

## Faz 1 — Kod düzeltmeleri ✅ TAMAMLANDI

- [x] `colors.xml` oluşturuldu (SOBSO renkleriyle: mor `#6C63FF`, koyu arka plan `#09090b`)
- [x] `splash.png`'ler SOBSO markasıyla değiştirildi (tüm yoğunluk varyantları:
  mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi × port/land + universal — `logo.png`'den üretildi)
- [x] `AndroidManifest.xml`'e izinler eklendi: `CAMERA`, `READ_MEDIA_IMAGES`
  (Android 13+) / `READ_EXTERNAL_STORAGE` (eski sürümler), `POST_NOTIFICATIONS`
  (Android 13+, push+local bildirim için), `SCHEDULE_EXACT_ALARM` (hatırlatma
  bildirimleri tam zamanında çalışsın diye) + kamera `uses-feature` (required=false)
- [x] `use-native-platform.ts`'e `useIsAndroidApp()` eklendi (mevcut
  `useIsIosApp()`'a dokunulmadı)
- [x] `premium-screen.tsx`'e Android IAP dalı eklendi (`RC_GOOGLE_KEY` şimdilik
  boş — Faz 3'te doldurulacak; o zamana kadar Android'de native satın alma
  sessizce devre dışı, hata vermez)
- [x] **`./gradlew assembleDebug` ile derleme doğrulandı — BUILD SUCCESSFUL**
  (3 native eklenti dahil: local-notifications, push-notifications, RevenueCat)

### Build araçları notu (önemli)

Android Studio'nun kendi paketlediği JBR (JetBrains Runtime, şu an JDK 25)
Gradle 8.14.3 ile **uyumsuz** (`Unsupported class file major version 69`
hatası verir). Capacitor 8'in Android modülü ise **JDK 21** kaynak
uyumluluğu istiyor, JDK 17 yetmiyor (`invalid source release: 21`).
Yani `./gradlew` komutlarını çalıştırmadan önce:

```bash
brew install openjdk@21   # bir kerelik
export JAVA_HOME="/opt/homebrew/opt/openjdk@21"
```

`android/local.properties` dosyasında da SDK yolu tanımlı olmalı:
```
sdk.dir=/Users/<kullanıcı>/Library/Android/sdk
```

## Faz 2 — Firebase + Push (FCM)

- [x] [Firebase Console](https://console.firebase.google.com)'da proje
  oluşturuldu ("Sobso", Spark/ücretsiz plan, proje id `sobso-b09a1`)
- [x] Android app `net.sobso.app` olarak eklendi
- [x] `google-services.json` indirilip `mobile/android/app/` klasörüne
  kondu (`.gitignore`'da — sunucudaki gibi hassas dosya, repoya girmedi)
- [x] `./gradlew assembleDebug` ile doğrulandı — google-services eklentisi
  sorunsuz devreye girdi, **BUILD SUCCESSFUL**
- [x] Emulator'da (Sobso AVD) push kaydı uçtan uca test edildi: izin istendi →
  gerçek FCM token alındı → `/api/push/register`'a gitti → sunucudaki
  `pushDevice` tablosunda `android` platformuyla kayıtlı görüldü.
  **iOS'taki AppDelegate köprüsü sorunu Android'de hiç yaşanmadı** — plugin
  ekstra native kod olmadan, dokümantasyondaki gibi sorunsuz çalıştı.
- Not: sunucu tarafı zaten hazır (`web/lib/push/fcm.ts`, `FCM_SERVICE_ACCOUNT`
  env) — sadece client tarafı bağlandı

## Faz 3 — RevenueCat + Google Play Billing ✅ TAMAMLANDI

- [x] RevenueCat dashboard'a Google Play app'i eklendi ("Sobso (Play Store)")
- [x] Google Cloud'da servis hesabı oluşturuldu, Play Console → Kullanıcılar
  ve izinler'den yetkilendirildi (eski "API access" sayfası artık yok, bu
  akış üzerinden yapıldı) — "Valid credentials" ✅ doğrulandı (paket adı
  doğrulaması için önce bir AAB'nin bir test track'ine yüklenmiş olması
  gerekiyor, bu yüzden Faz 4 ile birlikte tamamlandı)
- [x] Play Console'da 2 abonelik oluşturuldu: `net.sobso.premium.monthly`
  (₺169,99/ay) ve `net.sobso.premium.yearly` — Google Payments satıcı hesabı
  önce kuruldu (Apple'daki W-8BEN sürecine benzer, kullanıcı tarafından
  tamamlandı)
- [x] Ürünler RevenueCat'e "Import Products" ile içe aktarıldı, mevcut
  "Sobso Pro" entitlement'ına bağlandı (iOS ile ortak entitlement)
- [x] "default" offering'in Monthly/Yearly paketlerine Android ürünleri
  eklendi (iOS ürünleriyle birlikte, tek offering iki platformu da besliyor)
- [x] `premium-screen.tsx`'teki `RC_GOOGLE_KEY` gerçek Android SDK key'iyle
  (`goog_...`) dolduruldu, deploy edildi
- [x] **Uçtan uca sandbox satın alma testi başarılı** — Play Console
  License testing listesine test hesabı eklendi, gerçek cihazda "Test:
  SOBSO Premium Monthly" siparişi (₺0 gerçek tahsilat) tamamlandı,
  RevenueCat Sandbox sekmesinde müşteri olarak göründü, uygulamada premium
  anında aktifleşti

### Ders — Android'e özgü zorluklar

- Play Console'un yeni sürümünde "API access" sayfası kaldırılmış; servis
  hesabı artık Google Cloud Console'dan oluşturulup Play Console →
  Kullanıcılar ve izinler'den davet ediliyor
- RevenueCat, Android paket adını doğrulayabilmek için **en az bir
  AAB'nin bir test track'ine yüklenmiş olmasını** şart koşuyor — sadece
  RevenueCat tarafında app eklemek yetmiyor
- Google Play Billing test satın alması için **iki ayrı liste** var:
  Internal testing → Testers (uygulamaya erişim için) ve Setup → License
  testing (ücretsiz test satın alması için) — ikisi de doldurulmalı,
  birini atlamak "item not found" ya da gerçek ücretlendirme riski
  doğuruyor
- Yeni yüklenen bir dahili test sürümünün Google tarafından ilk incelemesi
  (mağaza girişi eksikken bile) birkaç saat sürebiliyor; bu süreçte
  testerlar "App not available / not invited" hatası alabiliyor —
  sabırla beklemek dışında yapılacak bir şey yok

## Faz 4 — İmzalama + ilk build ✅ TAMAMLANDI

- [x] Release keystore oluşturuldu (`keytool`, PKCS12, 10000 gün geçerli,
  alias `sobso`) — parolalar güvenli şekilde saklandı
- [x] `keystore.properties` dolduruldu (repoya girmedi, `.gitignore`'da)
- [x] İlk sürüm derlendi (`./gradlew bundleRelease` — BUILD SUCCESSFUL) ve
  Play Console → Internal testing track'ine yüklendi, tam kullanıma sunuldu

### Ders — keystore & JDK

- PKCS12 formatında store ve key parolası **aynı olmak zorunda**
  (`keytool` bunu dayatıyor), eski JKS formatının aksine
- `keystore.properties`'teki `storeFile` yolu, `app/build.gradle`'ın
  `file()` çağrısı zaten `app/` dizinine göre çözdüğü için **`app/`
  öneki almadan** yazılmalı (`storeFile=sobso-release.keystore`, değil
  `storeFile=app/sobso-release.keystore`) — aksi halde yol iki kere
  eklenip `app/app/...` diye aranıyor

## Faz 5 — Play Console mağaza girişi + test ✅ TAMAMLANDI

- [x] Mağaza açıklaması (kısa + tam), uygulama adı, kategori (Finans) ve
  etiket (Kişisel finans) yazıldı
- [x] Uygulama simgesi (512×512) ve özellik grafiği (1024×500) `logo.png`
  kaynağından üretildi
- [x] Telefon (5 adet, 9:16'ya kırpılmış) ve tablet (7"/10", iOS
  setinden yeniden kullanılmış) ekran görüntüleri yüklendi
- [x] İçerik derecelendirme anketi dolduruldu ("Diğer Tüm Uygulama
  Türleri", UGC var ama şiddet/cinsellik/kumar yok, etkileşim davetli
  arkadaşlarla sınırlı)
- [x] Data safety formu tek tek dolduruldu: e-posta/ad/kullanıcı kimliği,
  finansal bilgiler (satın alma geçmişi + diğer finansal veri), fotoğraf
  (fiş OCR), cihaz kimliği (FCM push token) — hepsi "toplandı", hiçbiri
  3. tarafla "paylaşılmadı" (Anthropic/RevenueCat/Resend birer hizmet
  sağlayıcı, ayrı paylaşım sayılmıyor)
- [x] Hedef kitle: yalnızca 18 yaş ve üstü (finansal uygulama olduğu için
  "Designed for Families" kapsamı dışında tutuldu)
- [x] Hesap silme linki: `sobso.net/privacy` (uygulama içi "Profil >
  Hesabımı sil" adımını açıklıyor)
- [x] Oturum açma bilgileri: SOBSO'da giriş şifre ile yapıldığından (OTP
  sadece kayıt/şifre sıfırlamada tek seferlik), incelemeci için normal
  e-posta+şifre test hesabı verildi — ayrı bir statik OTP bypass'ı
  gerekmedi
- [x] License testing + Internal testing tester listeleri dolduruldu,
  satın alma akışı gerçek cihazda uçtan uca test edildi (bkz. Faz 3)

## Faz 6 — Production'a gönder

- [ ] Play Console'daki ödeme profili doğrulaması bekleniyor (banka hesabına
  gönderilen küçük doğrulama tutarının onaylanması gerekiyor — 2026-08-07
  akşamı başlatıldı, birkaç iş günü sürebilir)
- [ ] "Kapalı test" (Closed testing) kanalı — yeni geliştirici hesapları
  için Google'ın zorunlu tuttuğu en az 12 test kullanıcısı + 14 gün şartı,
  production'a geçmeden önce tamamlanmalı
- [ ] Internal test sorunsuzsa production track'e terfi ettir
- [ ] Google incelemesini bekle (genelde Apple'dan daha hızlı — saatler/birkaç gün)

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
