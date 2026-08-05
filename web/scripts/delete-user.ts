/**
 * Bir kullanıcıyı TÜM kayıtlarıyla veritabanından siler (geri alınamaz).
 *
 * Kullanım:
 *   npx tsx scripts/delete-user.ts <kullaniciadi|e-posta>            # önizleme
 *   npx tsx scripts/delete-user.ts <kullaniciadi|e-posta> --confirm  # sil
 *
 * Varsayılan olarak HİÇBİR ŞEY SİLMEZ; sadece ne silineceğini raporlar.
 * Silme işlemi tek bir transaction içinde yapılır: bir adım hata verirse
 * hiçbir değişiklik kalıcı olmaz.
 *
 * Kurallar:
 * - Kullanıcının TEK ÜYE olduğu (kişisel bütçe gibi) gruplar tamamen silinir.
 * - Paylaşımlı gruplar KORUNUR; yalnızca kullanıcının kendi kayıtları
 *   (harcamaları, payları, ödeşmeleri, üyeliği) silinir. Bu, gruptaki diğer
 *   kişilerin borç tablosunu değiştirir — rapor bunu ayrıca uyarır.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const arg = process.argv[2];
const CONFIRM = process.argv.includes("--confirm");

function money(n: number): string {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2 });
}

async function main() {
  if (!arg) {
    console.error(
      "Kullanım: npx tsx scripts/delete-user.ts <kullaniciadi|e-posta> [--confirm]",
    );
    process.exit(1);
  }

  const needle = arg.trim().toLowerCase();
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "User"
    WHERE LOWER(username) = ${needle}
       OR (email IS NOT NULL AND LOWER(email) = ${needle})
    LIMIT 2`;

  if (rows.length === 0) {
    console.error(`Kullanıcı bulunamadı: ${arg}`);
    process.exit(1);
  }
  if (rows.length > 1) {
    console.error(`Birden fazla kullanıcı eşleşti: ${arg} — işlem iptal.`);
    process.exit(1);
  }

  const userId = rows[0].id;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  // --- Neler etkilenecek? ---
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          type: true,
          _count: { select: { members: true, expenses: true } },
        },
      },
    },
  });

  // Tek üyeli gruplar tamamen silinir; diğerleri korunur.
  const soloGroupIds = memberships
    .filter((m) => m.group._count.members === 1)
    .map((m) => m.group.id);
  const sharedGroups = memberships.filter((m) => m.group._count.members > 1);

  const [expenses, shares, settleFrom, settleTo, activities, notifications,
    redemptions, joinReqs] = await Promise.all([
    prisma.expense.count({ where: { payerId: userId } }),
    prisma.expenseShare.count({ where: { userId } }),
    prisma.settlement.count({ where: { fromUserId: userId } }),
    prisma.settlement.count({ where: { toUserId: userId } }),
    prisma.activity.count({ where: { actorId: userId } }),
    prisma.notification.count({ where: { userId } }),
    prisma.codeRedemption.count({ where: { userId } }),
    prisma.groupJoinRequest.count({
      where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
    }),
  ]);

  const paidTotal = await prisma.expense.aggregate({
    where: { payerId: userId },
    _sum: { amount: true },
  });

  console.log("─".repeat(64));
  console.log(`KULLANICI : ${user.username}  (${user.displayName ?? "-"})`);
  console.log(`E-POSTA   : ${user.email ?? "-"}`);
  console.log(`KAYIT     : ${user.createdAt.toISOString().slice(0, 10)}`);
  console.log(`PREMIUM   : ${user.premium ? user.premiumPlan ?? "evet" : "hayır"}`);
  console.log("─".repeat(64));
  console.log("SİLİNECEK KAYITLAR");
  console.log(`  Harcama (ödeyen)      : ${expenses}  (toplam ₺${money(paidTotal._sum.amount ?? 0)})`);
  console.log(`  Harcama payı          : ${shares}`);
  console.log(`  Ödeşme (gönderen)     : ${settleFrom}`);
  console.log(`  Ödeşme (alan)         : ${settleTo}`);
  console.log(`  Aktivite kaydı        : ${activities}`);
  console.log(`  Bildirim              : ${notifications}`);
  console.log(`  Kod kullanımı         : ${redemptions}`);
  console.log(`  Katılım isteği        : ${joinReqs}`);
  console.log(`  Grup üyeliği          : ${memberships.length}`);
  console.log("─".repeat(64));

  if (soloGroupIds.length) {
    console.log("TAMAMEN SİLİNECEK GRUPLAR (tek üyeli):");
    for (const m of memberships.filter((x) => x.group._count.members === 1)) {
      console.log(`  • ${m.group.name} [${m.group.type}] — ${m.group._count.expenses} kayıt`);
    }
  }
  if (sharedGroups.length) {
    console.log("KORUNACAK GRUPLAR (diğer üyeler var):");
    for (const m of sharedGroups) {
      console.log(`  • ${m.group.name} [${m.group.type}] — ${m.group._count.members} üye`);
    }
    console.log("");
    console.log("  ⚠ UYARI: Bu gruplardaki diğer kişilerin borç/alacak tablosu");
    console.log("    değişecek, çünkü bu kullanıcının harcamaları da silinecek.");
  }
  console.log("─".repeat(64));

  if (!CONFIRM) {
    console.log("ÖNİZLEME — hiçbir şey silinmedi.");
    console.log(`Silmek için: npx tsx scripts/delete-user.ts ${arg} --confirm`);
    return;
  }

  // --- Silme: bağımlılık sırasına göre, tek transaction ---
  await prisma.$transaction(async (tx) => {
    // 1) Tek üyeli gruplar: grup silinince harcama/pay/ödeşme/aktivite
    //    şema gereği zincirleme (cascade) silinir.
    if (soloGroupIds.length) {
      await tx.group.deleteMany({ where: { id: { in: soloGroupIds } } });
    }

    // 2) Paylaşımlı gruplardaki kişisel kayıtlar
    await tx.expenseShare.deleteMany({ where: { userId } });
    await tx.settlement.deleteMany({
      where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
    });
    // Kullanıcının ödediği harcamalar (payları cascade ile gider)
    await tx.expense.deleteMany({ where: { payerId: userId } });
    await tx.activity.deleteMany({ where: { actorId: userId } });
    await tx.groupMember.deleteMany({ where: { userId } });

    // 3) Kullanıcıya bağlı diğer kayıtlar
    await tx.notification.deleteMany({ where: { userId } });
    await tx.codeRedemption.deleteMany({ where: { userId } });
    await tx.groupJoinRequest.deleteMany({
      where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
    });
    await tx.userAddBlock.deleteMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    });

    // 4) Kullanıcının kendisi
    await tx.user.delete({ where: { id: userId } });
  });

  console.log(`✓ '${user.username}' ve tüm kayıtları silindi.`);
}

main()
  .catch((e) => {
    console.error("HATA — hiçbir değişiklik yapılmadı:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
