/**
 * Tarih/sayı biçimleri seçili uygulama diline uyar. Modül-düzeyi locale,
 * sunucuda her istekte kök layout'ta, istemcide I18nProvider'da ayarlanır.
 */
let fmtLocale: "tr" | "en" = "en";

export function setFormatLocale(locale: "tr" | "en") {
  fmtLocale = locale;
}

function intlTag(): string {
  return fmtLocale === "tr" ? "tr-TR" : "en-GB";
}

export function formatCurrency(amount: number, currency = "TRY"): string {
  try {
    return new Intl.NumberFormat(intlTag(), {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat(intlTag(), { maximumFractionDigits: 2 }).format(
    amount,
  );
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(intlTag(), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
