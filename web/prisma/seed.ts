import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { equalShares } from "../lib/settlement";

const prisma = new PrismaClient();

const PASSWORD = "demo12345";

async function main() {
  // Clean slate (dev only).
  await prisma.expenseShare.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const people = [
    { username: "demo", displayName: "Demo Kullanıcı" },
    { username: "ayse", displayName: "Ayşe Yıldız" },
    { username: "mehmet", displayName: "Mehmet Demir" },
    { username: "zeynep", displayName: "Zeynep Kaya" },
    { username: "can", displayName: "Can Aksoy" },
  ];

  const users = await Promise.all(
    people.map((p) =>
      prisma.user.create({ data: { ...p, passwordHash } }),
    ),
  );
  const byName = Object.fromEntries(users.map((u) => [u.username, u]));

  // --- Group 1: Bodrum trip ------------------------------------------------
  const trip = await prisma.group.create({
    data: {
      name: "Bodrum Yaz Kaçamağı",
      type: "Tatil",
      currency: "TRY",
      createdById: byName.demo.id,
      members: {
        create: ["demo", "ayse", "mehmet", "zeynep"].map((n) => ({
          userId: byName[n].id,
        })),
      },
    },
  });

  const tripMembers = ["demo", "ayse", "mehmet", "zeynep"].map(
    (n) => byName[n].id,
  );

  const tripExpenses: [string, string, number, string][] = [
    ["Villa kirası (3 gece)", "Konaklama", 18000, "demo"],
    ["Market alışverişi", "Market", 3250, "ayse"],
    ["Tekne turu", "Aktivite", 6400, "mehmet"],
    ["Akşam yemeği - marina", "Yemek", 4820, "zeynep"],
    ["Benzin", "Ulaşım", 2100, "demo"],
    ["Plaj beach club girişi", "Aktivite", 3600, "ayse"],
    ["Kahvaltı", "Yemek", 1450, "mehmet"],
    ["Gece kulübü", "Eğlence", 5200, "demo"],
  ];

  await createExpenses(trip.id, tripMembers, tripExpenses);

  // --- Group 2: Startup / joint venture -----------------------------------
  const venture = await prisma.group.create({
    data: {
      name: "Kafe Girişimi",
      type: "Girisim",
      currency: "TRY",
      createdById: byName.demo.id,
      members: {
        create: ["demo", "can", "zeynep"].map((n) => ({
          userId: byName[n].id,
        })),
      },
    },
  });

  const ventureMembers = ["demo", "can", "zeynep"].map((n) => byName[n].id);

  const ventureExpenses: [string, string, number, string][] = [
    ["Kahve makinesi", "Ekipman", 42000, "demo"],
    ["Mobilya", "Dekorasyon", 28500, "can"],
    ["İlk ay kirası", "Kira", 35000, "zeynep"],
    ["Logo ve marka tasarımı", "Pazarlama", 12000, "demo"],
    ["Ruhsat ve resmi işlemler", "Yasal", 8500, "can"],
    ["İlk stok (kahve, süt, tatlı)", "Stok", 15600, "zeynep"],
    ["Sosyal medya reklamı", "Pazarlama", 6000, "demo"],
  ];

  await createExpenses(venture.id, ventureMembers, ventureExpenses);

  console.log("Seed tamamlandı.");
  console.log(`Giriş: kullanıcı 'demo' / parola '${PASSWORD}'`);
}

async function createExpenses(
  groupId: string,
  memberIds: string[],
  rows: [string, string, number, string][],
) {
  // Spread the expenses across the last ~5 months.
  const now = Date.now();
  const users = await prisma.user.findMany({
    where: { id: { in: memberIds } },
  });
  const idByUsername = Object.fromEntries(
    users.map((u) => [u.username, u.id]),
  );

  for (let i = 0; i < rows.length; i++) {
    const [description, category, amount, payerUsername] = rows[i];
    const daysAgo = Math.floor((rows.length - i) * (150 / rows.length));
    const date = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
    const shares = equalShares(amount, memberIds);

    await prisma.expense.create({
      data: {
        groupId,
        payerId: idByUsername[payerUsername],
        amount,
        description,
        category,
        date,
        splitType: "Equal",
        shares: { create: shares },
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
