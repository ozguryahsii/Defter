# SOBSO! — iOS derleme ve bildirim testi rehberi

Bu rehber, Apple Developer hesabı **sende** olduğu için iOS uygulamasını senin
derlemen gerektiğinde izlenecek adımları anlatır. Sıfırdan, hiçbir ön bilgi
varsaymadan yazıldı.

## Neden sen derliyorsun?

Uygulama, içinde `https://sobso.net` adresini açan ince bir kabuktur
(Capacitor). Ekranlar ve mantık sunucudan gelir — bu yüzden **web tarafındaki
değişiklikler için yeni derleme gerekmez**, sunucu güncellenince telefondaki
uygulama da güncellenmiş olur.

Yeni derleme yalnızca *native* taraf değişince gerekir: eklenti eklenmesi,
izin/yetkilendirme değişikliği, uygulama simgesi veya `Info.plist`.
Şu anki ihtiyaç bu kapsamda: **anlık bildirim (push)** desteği eklendi ve
uygulamanın içine giren eklentiler nedeniyle yeniden derlenmesi gerekiyor.

Derleme yalnızca **macOS + Xcode** ile yapılabilir; sunucuda yapılamaz.

---

## 0. Gerekenler (bir kez)

- **Mac** (Apple Silicon veya Intel)
- **Xcode** — App Store'dan kur, bir kez açıp lisansı kabul et
- **Node.js LTS** — https://nodejs.org
- Depoya erişim: `https://github.com/ozguryahsii/Defter`

CocoaPods **gerekmiyor** (Capacitor 8, Swift Package Manager kullanıyor).

---

## 1. Depoyu al

```bash
git clone https://github.com/ozguryahsii/Defter.git
cd Defter
git checkout claude/expense-splitting-app-h4vl8d
```

Depo zaten sende varsa güncelle:

```bash
cd ~/Defter
git checkout -- web/package-lock.json
git pull
```

---

## 2. Apple Developer tarafını doğrula (bir kez)

https://developer.apple.com/account adresinde:

1. **Identifiers** → `net.sobso.app` kaydını aç →
   **Push Notifications** kutusu **işaretli** olmalı. Değilse işaretle, kaydet.
2. **Keys** bölümünde APNs anahtarı zaten oluşturuldu
   (Key ID `44GL4JLJD3`). Yenisini üretmene gerek yok.
   Anahtar dosyası sunucuda tanımlı; senin Mac'inde bulunması gerekmiyor.

Team ID: `LN6RCGCNYZ` — sunucuda bu değer tanımlı, Xcode'da da aynı takımı
seçmen gerekiyor (bir sonraki adım).

---

## 3. Uygulamayı hazırla

```bash
cd ~/Defter/mobile
npm install
CAP_SERVER_URL=https://sobso.net npx cap sync ios
npx cap open ios
```

Son komut Xcode'u açar. `CAP_SERVER_URL` uygulamanın hangi sunucuya
bağlanacağını belirler — canlı test için **mutlaka** `https://sobso.net`
vermelisin, yoksa uygulama `localhost` arar ve boş ekran gelir.

---

## 4. Xcode ayarları

1. Sol paneldeki **en üstteki "App"** satırına tıkla (mavi proje simgesi olan).
2. Açılan ekranda **TARGETS → App**'i seç.
3. Üstteki **Signing & Capabilities** sekmesine geç.
4. Kontrol et:
   - **Team**: kendi Apple Developer hesabın seçili olmalı
   - **Bundle Identifier**: `net.sobso.app`
   - **Push Notifications** başlığı listede görünmeli

**Push Notifications görünmüyorsa:** aynı sekmenin sol üstündeki
**+ Capability** düğmesine bas, açılan listede "Push Notifications" yazıp
çift tıkla.

---

## 5. Telefona kur

> **Önemli:** Bildirim testi **gerçek bir iPhone** gerektirir.
> Simülatörde çalışmaz — Apple simülatöre gerçek cihaz jetonu vermez.

1. iPhone'u Mac'e kabloyla bağla, telefonda "Bu bilgisayara güven" de.
2. Xcode'un üst çubuğundaki cihaz seçicisine tıkla. Liste ikiye ayrılır:
   üstte bağlı gerçek cihazlar, altta `Simulator` başlığı. **Üstten** kendi
   telefonunu seç.
3. ▶︎ (Run) tuşuna bas.
4. İlk kurulumda telefonda: **Ayarlar → Genel → VPN ve Cihaz Yönetimi** →
   geliştirici sertifikasına güven de.
5. Uygulama açılınca **bildirim izni** penceresi çıkacak → **İzin Ver**.

---

## 6. Çalıştığını doğrula

İzin verdikten sonra uygulama, telefonun bildirim jetonunu sunucuya kaydeder.
Kaydın oluştuğunu Özgür sunucudan şu komutla görebilir:

```bash
docker exec root-defter-1 node -e "
const p=new (require('@prisma/client').PrismaClient)();
p.pushDevice.findMany({include:{user:{select:{username:true}}}}).then(d=>{
console.log(d.length ? d.map(x=>x.user.username+' | '+x.platform+' | '+x.token.slice(0,20)+'...').join('\n') : 'KAYITLI CIHAZ YOK');
process.exit(0)})"
```

Kullanıcı adın ve `ios` yazan bir satır çıkıyorsa kayıt tamam.

**Bildirim testi:**

1. Uygulamayı telefonda **tamamen kapat** (arka plandan da çıkar)
2. Başka bir hesapla, senin de üye olduğun bir gruba harcama ekle
3. Telefonuna bildirim düşmeli; dokununca ilgili grup açılmalı

---

## 7. TestFlight / App Store'a gönderme

Test bittiğinde mağaza sürümü için:

1. Xcode'da cihaz seçicisinden **Any iOS Device (arm64)** seç
2. **Product → Archive**
3. Arşiv penceresinde **Distribute App → App Store Connect**

> **Dikkat — sık yapılan hata:** Xcode'dan telefona kurulan derlemeler
> Apple'ın **sandbox** bildirim sunucusunu, TestFlight ve App Store
> sürümleri ise **production** sunucusunu kullanır. Sunucudaki
> `APNS_PRODUCTION` ayarı hangisini test ettiğinizle eşleşmelidir:
>
> - Xcode'dan kurulan derleme → `APNS_PRODUCTION` **boş** (şu anki durum)
> - TestFlight/App Store sürümü → `APNS_PRODUCTION=1`
>
> İkisi aynı anda çalışamaz. TestFlight'a geçerken Özgür'e haber ver,
> sunucudaki ayarı değiştirsin.

---

## Sorun giderme

| Belirti | Sebep ve çözüm |
|---|---|
| Uygulama açılıyor ama **boş/siyah ekran** | `CAP_SERVER_URL` verilmeden sync yapılmış. 3. adımı `CAP_SERVER_URL=https://sobso.net` ile tekrarla. |
| **Bildirim izni penceresi çıkmıyor** | Uygulama daha önce kurulmuş ve izin reddedilmiş olabilir. Telefonda uygulamayı sil, tekrar kur. |
| **"KAYITLI CIHAZ YOK"** | Simülatörde çalıştırılmış olabilir; gerçek cihaz gerekiyor. Ya da izin verilmemiş. |
| Sunucu logunda **`BadDeviceToken`** | Sandbox/production uyuşmazlığı — yukarıdaki uyarıya bak. |
| Sunucu logunda **`TopicDisallowed`** | Identifier'da Push Notifications açık değil (2. adım). |
| Xcode **"Signing" hatası** | Xcode → Settings → Accounts'a Apple ID ekle, sonra Team olarak onu seç. |

Sunucu tarafındaki hataları Özgür şu komutla görebilir:

```bash
docker logs --tail 50 root-defter-1 | grep -i push
```
