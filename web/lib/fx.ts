import { prisma } from "./prisma";

/**
 * Döviz kurları: open.er-api.com (ücretsiz, anahtarsız, USD bazlı).
 * Kurlar veritabanında saklanır ve 12 saatte bir tazelenir; API'ye
 * ulaşılamazsa eldeki son kur kullanılmaya devam eder.
 */
const FX_URL = "https://open.er-api.com/v6/latest/USD";
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

type RateTable = Record<string, number>;

async function refreshRates(): Promise<void> {
  const res = await fetch(FX_URL, {
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`fx http ${res.status}`);
  const json = (await res.json()) as { result?: string; rates?: RateTable };
  if (json.result !== "success" || !json.rates) throw new Error("fx payload");
  await prisma.fxCache.upsert({
    where: { id: 1 },
    update: { rates: JSON.stringify(json.rates), fetchedAt: new Date() },
    create: { id: 1, rates: JSON.stringify(json.rates), fetchedAt: new Date() },
  });
}

/**
 * 1 birim `from` kaç `to` eder? Kur bulunamazsa null döner (arayüz bu
 * durumda kullanıcıdan manuel kur ister).
 */
export async function getFxRate(
  from: string,
  to: string,
): Promise<{ rate: number; asOf: Date } | null> {
  if (from === to) return { rate: 1, asOf: new Date() };

  let row = await prisma.fxCache.findUnique({ where: { id: 1 } });
  const stale = !row || Date.now() - row.fetchedAt.getTime() > MAX_AGE_MS;
  if (stale) {
    try {
      await refreshRates();
      row = await prisma.fxCache.findUnique({ where: { id: 1 } });
    } catch {
      // API'ye ulaşılamadı — eldeki (bayat) kurla devam et.
    }
  }
  if (!row) return null;

  const rates = JSON.parse(row.rates) as RateTable;
  const fromUsd = rates[from];
  const toUsd = rates[to];
  if (!fromUsd || !toUsd) return null;

  // USD bazlı tablo üzerinden çapraz kur.
  return { rate: toUsd / fromUsd, asOf: row.fetchedAt };
}
