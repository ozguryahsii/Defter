import type { CapacitorConfig } from "@capacitor/cli";

/**
 * SOBSO! native kabuğu (iOS + Android).
 *
 * Uygulama içerikleri uzaktaki Next.js sunucusundan yüklenir (remote mode).
 * - Mac'te yerel test (iOS): web uygulamasını `npm run dev` ile çalıştır,
 *   CAP_SERVER_URL vermeden `npx cap sync ios` yap → http://localhost:3333
 *   yüklenir (iOS Simulator, Mac'in localhost'unu görür).
 * - Gerçek iPhone ile test: telefon ile Mac aynı Wi-Fi'da olmalı;
 *   CAP_SERVER_URL=http://<mac-ip>:3333 npx cap sync ios
 * - Android emülatörü (BlueStacks vb.) Mac'in localhost'unu GÖRMEZ; kendi
 *   sanal makinesidir. Ya canlı adresi ya da Mac'in LAN IP'sini ver:
 *   CAP_SERVER_URL=https://sobso.net npx cap sync android
 *   CAP_SERVER_URL=http://<mac-ip>:3333 npx cap sync android
 * - Mağaza sürümü (her iki platform): CAP_SERVER_URL=https://sobso.net
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
