/**
 * E-postasını doğrulamamış kullanıcıları listeler ve (istenirse) toplu siler.
 *
 * Kullanım:
 *   node scripts/cleanup-unverified.mjs                      # hepsini listele
 *   node scripts/cleanup-unverified.mjs --confirm            # hepsini sil
 *   node scripts/cleanup-unverified.mjs --days=3             # 3+ günlük olanlar
 *   node scripts/cleanup-unverified.mjs --days=3 --confirm   # 3+ günlükleri sil
 *
 * Varsayılan olarak HİÇBİR ŞEY SİLMEZ; sadece listeler.
 *
 * Güvenlik kuralları:
 * - Varsayılanda yaş filtresi YOKTUR; liste silmeden önce gözden geçirilir.
 *   Yeni kaydolmuş kullanıcıları korumak istersen --days=N ile daralt
 *   (ör. --days=1: bugün kaydolanlar listeye girmez).
 * - ADMIN_USERNAME'de tanımlı yöneticiler ASLA silinmez.
 * - E-postası olmayan eski/örnek hesaplar kapsam dışıdır (onlarda
 *   doğrulanacak bir adres yok, "doğrulamamış" sayılmazlar).
 * - Verisi olan hesaplar (harcama/grup) ayrıca işaretlenir; --confirm ile
 *   silinirler ama listede görülüp fark edilebilsinler diye vurgulanır.
 */
import pkg from "@prisma/client";
import { inspectUser, deleteUserCompletely } from "./user-delete-core.mjs";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

const args = process.argv.slice(2);
const CONFIRM = args.includes("--confirm");
const daysArg = args.find((a) => a.startsWith("--days="));
// Yaş filtresi yalnızca --days verilirse uygulanır.
const DAYS = daysArg ? Number(daysArg.split("=")[1]) : null;

function adminNames() {
  return (process.env.ADMIN_USERNAME ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function ageDays(d) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

async function main() {
  if (DAYS !== null && (!Number.isFinite(DAYS) || DAYS < 0)) {
    console.error("--days sayı olmalı, örn: --days=3");
    process.exit(1);
  }

  const admins = adminNames();

  const users = await prisma.user.findMany({
    where: {
      emailVerified: null,
      email: { not: null }, // doğrulanacak adresi olmayanlar kapsam dışı
      ...(DAYS === null
        ? {}
        : { createdAt: { lt: new Date(Date.now() - DAYS * 86400000) } }),
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      createdAt: true,
      premium: true,
    },
  });

  const targets = users.filter(
    (u) => !admins.includes(u.username.toLowerCase()),
  );
  const skippedAdmins = users.length - targets.length;

  console.log("─".repeat(72));
  console.log(
    DAYS === null
      ? "DOĞRULANMAMIŞ HESAPLAR (tümü)"
      : `DOĞRULANMAMIŞ HESAPLAR (kaydından bu yana ${DAYS}+ gün geçmiş)`,
  );
  console.log("─".repeat(72));

  if (targets.length === 0) {
    console.log("Ölçütlere uyan hesap yok.");
    if (skippedAdmins > 0)
      console.log(`(${skippedAdmins} yönetici hesabı kapsam dışı bırakıldı.)`);
    return;
  }

  // Her hesabın ne kadar veri taşıdığını göster — boş hesapları silmek
  // risksiz, veri taşıyanlar dikkat ister.
  let withData = 0;
  const rows = [];
  for (const u of targets) {
    const info = await inspectUser(prisma, u.id);
    const hasData =
      info.counts.expenses > 0 ||
      info.counts.shares > 0 ||
      info.counts.memberships > 0;
    if (hasData) withData++;
    rows.push({ user: u, info, hasData });

    console.log(
      `${hasData ? "⚠ " : "  "}${u.username.padEnd(20)} ${String(u.email).padEnd(30)} ` +
        `${ageDays(u.createdAt)} günlük` +
        (hasData
          ? `  → ${info.counts.memberships} grup, ${info.counts.expenses} harcama`
          : "  → veri yok"),
    );
  }

  console.log("─".repeat(72));
  console.log(`Toplam: ${targets.length} hesap (${withData} tanesinde veri var)`);
  if (skippedAdmins > 0)
    console.log(`Yönetici hesapları kapsam dışı: ${skippedAdmins}`);

  if (!CONFIRM) {
    console.log("");
    console.log("ÖNİZLEME — hiçbir şey silinmedi.");
    console.log(
      `Silmek için: node scripts/cleanup-unverified.mjs${daysArg ? " " + daysArg : ""} --confirm`,
    );
    return;
  }

  console.log("");
  console.log("Siliniyor…");
  let done = 0;
  for (const { user, info } of rows) {
    try {
      await deleteUserCompletely(prisma, user.id, info.soloGroupIds);
      done++;
      console.log(`  ✓ ${user.username}`);
    } catch (e) {
      console.error(`  ✗ ${user.username} — ${e.message}`);
    }
  }
  console.log("─".repeat(72));
  console.log(`${done}/${rows.length} hesap silindi.`);
}

main()
  .catch((e) => {
    console.error("HATA:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
