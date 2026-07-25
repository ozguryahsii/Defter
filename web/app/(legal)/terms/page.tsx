import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Kullanım Şartları" };

function TermsEn() {
  return (
    <>
      <h1>Terms of Use</h1>
      <p>
        SOBSO! (&quot;the App&quot;) is a tool for sharing expenses and
        tracking debts within friend groups. By using the App you accept the
        terms below.
      </p>

      <h2>Nature of the service</h2>
      <ul>
        <li>
          The App is a <strong>bookkeeping tool</strong>; it is not a bank or
          payment institution. Money transfers happen outside the App (e.g.
          through your banking app).
        </li>
        <li>
          Debt tables are calculated from data entered by users. Users are
          responsible for the accuracy of what they enter.
        </li>
        <li>
          A &quot;payment confirmation&quot; is merely the creditor&apos;s
          statement; it is not a legal receipt.
        </li>
      </ul>

      <h2>Account responsibility</h2>
      <ul>
        <li>Keeping your account credentials secret is your responsibility.</li>
        <li>
          You may not use the App for unlawful purposes, to access other
          people&apos;s data without permission, or in ways that harm the
          system.
        </li>
        <li>You declare that the IBAN on your profile belongs to you.</li>
      </ul>

      <h2>Content and data</h2>
      <p>
        Expense records you enter and images you upload belong to you; we
        store them only to provide the App&apos;s functionality. See the{" "}
        <a href="/privacy" className="text-brand hover:underline">
          Privacy Policy
        </a>{" "}
        for details.
      </p>

      <h2>Service changes</h2>
      <p>
        Features may be improved or changed without prior notice. The service
        is not guaranteed to be uninterrupted or error-free.
      </p>

      <h2>Contact</h2>
      <p>
        Questions: <strong>iletisim@sobso.net</strong>
      </p>

      <p>Last updated: July 2026</p>
    </>
  );
}

export default function TermsPage() {
  if (getLocale() === "en") return <TermsEn />;
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
