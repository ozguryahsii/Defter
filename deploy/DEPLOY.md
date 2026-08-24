# SOBSO! — sobso.net'e Dağıtım (aaPanel + Nginx + PM2)

Uygulama, Nginx arkasında `127.0.0.1:3000`'de çalışan bir Node.js (Next.js)
sürecidir. HTTPS'i aaPanel (Let's Encrypt) yönetir. Veri tek bir SQLite
dosyasıdır; PostgreSQL vb. gerekmez.

## 0. Gereksinimler (sunucuda bir kez)

- aaPanel kurulu bir Linux sunucu (Ubuntu/Debian önerilir)
- aaPanel App Store'dan: **Nginx** ve **PM2 Manager** (PM2, Node.js LTS'i
  birlikte kurar; Node 20 veya 22 seçin)
- `git` (`apt install git`)
- sobso.net'in **A kaydı** sunucunun IP'sine yönlenmiş olmalı

## 1. Kodu al

```bash
cd /www/wwwroot
git clone -b claude/expense-splitting-app-h4vl8d https://github.com/ozguryahsii/Defter.git sobso
cd sobso/web
```

> Repo özelse GitHub'da bir **fine-grained personal access token** oluşturup
> `https://<TOKEN>@github.com/ozguryahsii/Defter.git` biçiminde klonlayın.

## 2. Ortam değişkenleri

```bash
cp .env.example .env
nano .env
```

Şunları ayarla:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="<openssl rand -base64 32 çıktısı>"
NEXTAUTH_URL="https://sobso.net"
HOST=127.0.0.1
PORT=3000
```

## 3. Kur, migrate et, derle

```bash
npm install
npm run db:migrate
npm run build
```

## 4. PM2 ile başlat

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # çıktısındaki komutu bir kez çalıştır (reboot'ta otomatik başlar)
```

Kontrol: `pm2 status` → `sobso` **online**; `curl -I http://127.0.0.1:3000/login` → `200`.

## 5. aaPanel'de site + HTTPS

1. **Website > Add site** → domain: `sobso.net` (PHP yok, "Static" seçilebilir).
2. **SSL** sekmesi → Let's Encrypt → sertifika al, **Force HTTPS** aç.
3. Site **Config** dosyasına, `server { }` bloğunun içine
   `deploy/nginx-sobso.conf.example` dosyasındaki `location /` ve
   `location /_next/static/` bloklarını ve `client_max_body_size 12m;`
   satırını ekle (aaPanel'in kendi SSL/redirect satırlarına dokunma).
4. Nginx'i **Reload** et.

Tarayıcıdan `https://sobso.net` → giriş ekranı gelmeli.

## 6. Güncelleme (sonraki her sürüm)

```bash
cd /www/wwwroot/sobso
bash deploy/update.sh
```

## Veri ve yedekleme

| Ne | Nerede |
|----|--------|
| Veritabanı | `web/prisma/dev.db` |
| Fiş görselleri | `web/data/receipts/` (veya `DEFTER_UPLOAD_DIR`) |

Yedek = bu ikisini kopyalamak. aaPanel'in Cron'una günlük bir
`tar czf /www/backup/sobso-$(date +%F).tgz web/prisma/dev.db web/data` işi
eklemek yeterli.

## Sık karşılaşılanlar

- **502 Bad Gateway** → PM2'de uygulama düşük: `pm2 logs sobso` ile bak.
- **Giriş sonrası döngü / oturum tutmuyor** → `.env`'de `NEXTAUTH_URL`
  tam olarak `https://sobso.net` olmalı; değiştirdiysen `pm2 restart sobso`.
- **Fiş yüklenmiyor (413)** → Nginx'te `client_max_body_size 12m;` eksik.
- **Windows'taki eski kurulum** → artık gerekmez; `npm run service:uninstall`
  ile kaldırılabilir (yerel geliştirme için `npm run dev` yeterli).
