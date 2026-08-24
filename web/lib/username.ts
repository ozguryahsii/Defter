/**
 * Kullanıcı adı normalleştirme (giriş ve benzersizlik karşılaştırmaları için).
 *
 * İki ayrı sorunu birlikte çözer:
 *
 * 1. SQLite'ın LOWER() işlevi yalnızca ASCII harfleri çevirir; "Şükrü"
 *    küçük harfe inmez ve giriş büyük/küçük harfe duyarlı davranır.
 *
 * 2. Türkçe'nin "I" ikilemi: JavaScript'te "ÇAĞRI".toLowerCase() noktalı
 *    "çağri", "Çağrı".toLowerCase() ise noktasız "çağrı" verir. Locale'e
 *    özgü çevirim de tek başına yetmez ("IVAN" ile "ivan" bu kez ayrışır).
 *    Bu yüzden çevrimden sonra noktalı/noktasız i ayrımı tamamen kaldırılır:
 *    "ı" → "i" ve "İ"nin bıraktığı birleşik nokta silinir.
 *
 * Sonuç: "Çağrı", "çağrı", "ÇAĞRI" ve "cagri" hariç tüm yazımlar aynı
 * değere iner. Yan etkisi, "çağrı" ile "çağri"nin aynı kimlik sayılmasıdır —
 * bu bilinçli bir tercih; birbirine bu kadar benzeyen iki kullanıcı adının
 * ayrı hesaplar olması karışıklık yaratır.
 */
export function normalizeUsername(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/̇/g, "") // "İ".toLowerCase() → "i" + birleşik nokta
    .replace(/ı/g, "i");
}
