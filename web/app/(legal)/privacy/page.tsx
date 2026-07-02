import type { Metadata } from "next";

export const metadata: Metadata = { title: "Gizlilik Politikası" };

export default function PrivacyPage() {
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
