/**
 * Removes the Defter Windows Service.
 *
 * Run from an ADMIN PowerShell:
 *   npm run service:uninstall
 */
const path = require("path");
const { Service } = require("node-windows");

const svc = new Service({
  name: "Defter",
  script: path.join(__dirname, "run.js"),
});

svc.on("uninstall", () => {
  console.log('"Defter" servisi kaldırıldı.');
});

svc.on("error", (err) => {
  console.error("Servis hatası:", err);
});

console.log('"Defter" servisi kaldırılıyor (yönetici yetkisi gerekir)...');
svc.uninstall();
