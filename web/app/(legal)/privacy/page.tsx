import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Gizlilik Politikası" };

function PrivacyEn() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p>
        This policy explains what data the SOBSO! app (&quot;the App&quot;)
        collects, why, and how it is protected. By using the App you accept
        this policy.
      </p>

      <h2>Data we collect</h2>
      <ul>
        <li>
          <strong>Account details:</strong> username, display name and (if you
          choose to enter it) your e-mail address. Your password is stored
          only as an irreversible hash; never in plain text.
        </li>
        <li>
          <strong>Payment info (optional):</strong> the IBAN and account name
          you add to your profile so group mates can pay you back. This is
          shown only to people in your groups.
        </li>
        <li>
          <strong>Usage data:</strong> groups you create, expense records,
          payments and receipt images you upload.
        </li>
      </ul>

      <h2>How data is used</h2>
      <p>
        Data is used solely to provide the App&apos;s functionality: expense
        sharing, debt calculation and in-group notifications. Your data is not
        sold to third parties or profiled for advertising.
      </p>

      <h2>Data visibility</h2>
      <p>
        Expense and payment records you add to a group are visible only to
        that group&apos;s members. Nobody outside the group can access your
        data.
      </p>

      <h2>Storage and security</h2>
      <p>
        Data is stored on the server that runs the App and accessed over an
        encrypted connection (HTTPS). Passwords are hashed with bcrypt;
        sessions are protected with signed cookies.
      </p>

      <h2>Account deletion</h2>
      <p>
        You can delete your account anytime via{" "}
        <strong>Profile &gt; Delete my account</strong>. Deletion permanently
        removes your personal details (username, name, IBAN); only groups you
        own are fully deleted. Expense records in shared groups remain
        anonymised as &quot;Deleted User&quot; so other members&apos; balances
        stay intact.
      </p>

      <h2>Contact</h2>
      <p>
        Questions: <strong>iletisim@sobso.net</strong>
      </p>

      <p>Last updated: July 2026</p>
    </>
  );
}

export default function PrivacyPage() {
  if (getLocale() === "en") return <PrivacyEn />;
  return (
    <>
      <h1>Gizlilik Politikası</h1>
      <p>
        Bu politika, SOBSO! uygulamasının (&quot;Uygulama&quot;) hangi verileri
        neden topladığını ve nasıl koruduğunu açıklar. Uygulamayı kullanarak bu
        politikayı kabul etmiş olursun.
      </p>

      <h2>Topladığımız veriler</h2>
      <ul>
        <li>
          <strong>Hesap bilgileri:</strong> kullanıcı adı, görünen ad ve
          (girmeyi seçersen) e-posta adresi. Parolan yalnızca geri
          döndürülemez bir özet (hash) olarak saklanır; hiçbir zaman düz metin
          tutulmaz.
        </li>
        <li>
          <strong>Ödeme bilgisi (opsiyonel):</strong> grup arkadaşlarının sana
          borç ödeyebilmesi için profilinize eklediğin IBAN ve hesap adı. Bu
          bilgi yalnızca üyesi olduğun gruplardaki kişilere gösterilir.
        </li>
        <li>
          <strong>Kullanım verileri:</strong> oluşturduğun gruplar, harcama
          kayıtları, ödemeler ve yüklediğin fiş görselleri.
        </li>
      </ul>

      <h2>Verilerin kullanımı</h2>
      <p>
        Veriler yalnızca uygulamanın işlevi için kullanılır: harcama paylaşımı,
        borç hesaplama ve grup içi bildirimler. Verilerin üçüncü kişilere
        satılmaz, reklam amaçlı profillenmez.
      </p>

      <h2>Verilerin görünürlüğü</h2>
      <p>
        Bir gruba eklediğin harcama ve ödeme kayıtları, yalnızca o grubun
        üyeleri tarafından görülebilir. Grup dışından hiç kimse verilerine
        erişemez.
      </p>

      <h2>Saklama ve güvenlik</h2>
      <p>
        Veriler, uygulamanın çalıştığı sunucuda saklanır ve erişim şifreli
        bağlantı (HTTPS) üzerinden yapılır. Parolalar bcrypt ile
        özetlenir; oturumlar imzalı çerezlerle korunur.
      </p>

      <h2>Hesap silme</h2>
      <p>
        Hesabını istediğin an <strong>Profil &gt; Hesabımı sil</strong>{" "}
        adımından silebilirsin. Silme işleminde kişisel bilgilerin (kullanıcı
        adı, ad, IBAN) kalıcı olarak kaldırılır; yalnızca sana ait gruplar
        bütünüyle silinir. Ortak gruplardaki harcama kayıtları, diğer üyelerin
        hesap bütünlüğü bozulmasın diye &quot;Silinen Kullanıcı&quot; adıyla
        anonim şekilde kalır.
      </p>

      <h2>İletişim</h2>
      <p>
        Sorular için: <strong>iletisim@sobso.net</strong>
      </p>

      <p>Son güncelleme: Temmuz 2026</p>
    </>
  );
}
