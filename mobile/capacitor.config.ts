import type { CapacitorConfig } from "@capacitor/cli";

/**
 * SOBSO! native kabuğu.
 *
 * Uygulama içerikleri uzaktaki Next.js sunucusundan yüklenir (remote mode).
 * - Mac'te yerel test: web uygulamasını Mac'te `npm run dev` ile çalıştır,
 *   CAP_SERVER_URL vermeden `npx cap sync ios` yap → http://localhost:3333
 *   yüklenir (iOS Simulator, Mac'in localhost'unu görür).
 * - Gerçek iPhone ile test: telefon ile Mac aynı Wi-Fi'da olmalı;
 *   CAP_SERVER_URL=http://<mac-ip>:3333 npx cap sync ios
 * - Canlı: CAP_SERVER_URL=https://sobso.net npx cap sync ios
 */
const serverUrl = process.env.CAP_SERVER_URL ?? "http://localhost:3333";

const config: CapacitorConfig = {
  appId: "net.sobso.app",
  appName: "SOBSO!",
  webDir: "www",
  server: {
    url: serverUrl,
    // localhost/LAN testi http olduğu için gerekli; https'te zararı yok.
    cleartext: true,
  },
  ios: {
    // Güvenli alan (çentik) boşluklarını web tarafı CSS ile yönetiyor;
    // native tarafın ekstra içeri itmesi kaymaya yol açıyordu.
    contentInset: "never",
    backgroundColor: "#09090b",
  },
};

export default config;
