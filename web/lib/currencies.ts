/**
 * Desteklenen para birimleri: tüm Avrupa para birimleri + Çin, Japonya,
 * BAE (Dubai), Rusya, Ukrayna, Gürcistan. Kod sırasına göre alfabetik.
 */
export const CURRENCIES: { code: string; name: string }[] = [
  { code: "AED", name: "BAE Dirhemi" },
  { code: "ALL", name: "Arnavutluk Leki" },
  { code: "BAM", name: "Bosna-Hersek Markı" },
  { code: "BGN", name: "Bulgar Levası" },
  { code: "BYN", name: "Belarus Rublesi" },
  { code: "CHF", name: "İsviçre Frangı" },
  { code: "CNY", name: "Çin Yuanı" },
  { code: "CZK", name: "Çek Korunası" },
  { code: "DKK", name: "Danimarka Kronu" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "İngiliz Sterlini" },
  { code: "GEL", name: "Gürcistan Larisi" },
  { code: "HUF", name: "Macar Forinti" },
  { code: "ISK", name: "İzlanda Kronu" },
  { code: "JPY", name: "Japon Yeni" },
  { code: "MDL", name: "Moldova Leyi" },
  { code: "MKD", name: "Makedon Dinarı" },
  { code: "NOK", name: "Norveç Kronu" },
  { code: "PLN", name: "Polonya Zlotisi" },
  { code: "RON", name: "Rumen Leyi" },
  { code: "RSD", name: "Sırp Dinarı" },
  { code: "RUB", name: "Rus Rublesi" },
  { code: "SEK", name: "İsveç Kronu" },
  { code: "TRY", name: "Türk Lirası" },
  { code: "UAH", name: "Ukrayna Grivnası" },
  { code: "USD", name: "ABD Doları" },
];

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code);

export function isCurrencyCode(code: unknown): code is string {
  return typeof code === "string" && CURRENCY_CODES.includes(code);
}
