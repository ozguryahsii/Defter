import type { Metadata } from "next";

export const metadata: Metadata = { title: "Kullanım Şartları" };

export default function TermsPage() {
  return (
    <>
      <h1>Kullanım Şartları</h1>
      <p>
        SOBSO! (&quot;Uygulama&quot;), arkadaş grupları için ortak harcama
        paylaşımı ve borç takibi sağlayan bir araçtır. Uygulamayı kullanarak
        aşağıdaki şartları kabul etmiş olursun.
      </p>

      <h2>Hizmetin niteliği</h2>
      <ul>
        <li>
          Uygulama bir <strong>hesap tutma aracıdır</strong>; banka veya ödeme
          kuruluşu değildir. Para transferleri uygulama dışında (ör. banka
          uygulaman üzerinden) gerçekleşir.
        </li>
        <li>
          Borç tabloları, kullanıcıların girdiği verilere göre hesaplanır.
          Girilen verilerin doğruluğundan kullanıcılar sorumludur.
        </li>
        <li>
          &quot;Ödeme onayı&quot; kaydı, yalnızca alacaklının beyanıdır; hukuki
          bir makbuz niteliği taşımaz.
        </li>
      </ul>

      <h2>Hesap sorumluluğu</h2>
      <ul>
        <li>Hesap bilgilerini gizli tutmak senin sorumluluğundadır.</li>
        <li>
          Uygulamayı hukuka aykırı amaçlarla, başkalarının verilerine izinsiz
          erişmek için veya sisteme zarar verecek şekilde kullanamazsın.
        </li>
        <li>
          Profiline eklediğin IBAN&apos;ın sana ait olduğunu beyan edersin.
        </li>
      </ul>

      <h2>İçerik ve veriler</h2>
      <p>
        Gruplara girdiğin harcama kayıtları ve yüklediğin görseller sana
        aittir; bunları yalnızca uygulamanın işlevini sağlamak için saklarız.
        Ayrıntı için{" "}
        <a href="/privacy" className="text-brand hover:underline">
          Gizlilik Politikası
        </a>
        &apos;na bak.
      </p>

      <h2>Hizmet değişiklikleri</h2>
      <p>
        Uygulama özellikleri önceden bildirilmeksizin geliştirilebilir veya
        değiştirilebilir. Hizmetin kesintisiz ya da hatasız olacağı garanti
        edilmez.
      </p>

      <h2>İletişim</h2>
      <p>
        Sorular için: <strong>iletisim@sobso.net</strong>
      </p>

      <p>Son güncelleme: Temmuz 2026</p>
    </>
  );
}
