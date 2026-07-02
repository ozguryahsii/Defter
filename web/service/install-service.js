/**
 * Installs Defter as a Windows Service (auto-start on boot, runs in background).
 *
 * Run from an ADMIN PowerShell, after building:
 *   npm run build
 *   npm run service:install
 *
 * The service is named "Defter" and can be managed from services.msc or:
 *   Start-Service Defter / Stop-Service Defter / Restart-Service Defter
 */
const path = require("path");
const { Service } = require("node-windows");

const webRoot = path.join(__dirname, "..");

const svc = new Service({
  name: "Defter",
  description: "Defter — ortak harcama paylaşım uygulaması (Next.js production)",
  script: path.join(__dirname, "run.js"),
  workingDirectory: webRoot,
  // Auto-restart with a small backoff if it ever crashes.
  wait: 2,
  grow: 0.5,
  maxRestarts: 10,
  env: [
    { name: "NODE_ENV", value: "production" },
    { name: "PORT", value: process.env.PORT || "3000" },
    { name: "HOST", value: process.env.HOST || "0.0.0.0" },
  ],
});

svc.on("install", () => {
  console.log('"Defter" servisi kuruldu, başlatılıyor...');
  svc.start();
});

svc.on("alreadyinstalled", () => {
  console.log('"Defter" servisi zaten kurulu. Güncellemek için önce service:uninstall çalıştırın.');
});

svc.on("start", () => {
  const port = process.env.PORT || "3000";
  console.log(`"Defter" çalışıyor → http://localhost:${port}`);
});

svc.on("error", (err) => {
  console.error("Servis hatası:", err);
});

console.log('"Defter" servisi kuruluyor (yönetici yetkisi gerekir)...');
svc.install();
