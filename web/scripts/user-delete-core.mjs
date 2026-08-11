/**
 * Kullanıcı silme çekirdeği — hem tek kullanıcı silen delete-user.mjs hem de
 * toplu temizlik yapan cleanup-unverified.mjs bunu kullanır. Silme sırası tek
 * yerde tutulur, iki betik arasında ayrışma olmaz.
 */

/**
 * Kullanıcının hangi kayıtlara dokunduğunu ve hangi grupların tamamen
 * silineceğini raporlar (hiçbir şey silmez).
 */
export async function inspectUser(prisma, userId) {
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

  // Kullanıcının tek üye olduğu gruplar (kişisel bütçe gibi) tamamen silinir;
  // paylaşımlı gruplar korunur.
  const soloGroups = memberships.filter((m) => m.group._count.members === 1);
  const sharedGroups = memberships.filter((m) => m.group._count.members > 1);

  const [expenses, shares, settlements, activities, notifications, redemptions,
    joinReqs, paid] = await Promise.all([
    prisma.expense.count({ where: { payerId: userId } }),
    prisma.expenseShare.count({ where: { userId } }),
    prisma.settlement.count({
      where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
    }),
    prisma.activity.count({ where: { actorId: userId } }),
    prisma.notification.count({ where: { userId } }),
    prisma.codeRedemption.count({ where: { userId } }),
    prisma.groupJoinRequest.count({
      where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
    }),
    prisma.expense.aggregate({
      where: { payerId: userId },
      _sum: { amount: true },
    }),
  ]);

  return {
    memberships,
    soloGroups,
    sharedGroups,
    soloGroupIds: soloGroups.map((m) => m.group.id),
    counts: {
      expenses,
      shares,
      settlements,
      activities,
      notifications,
      redemptions,
      joinReqs,
      memberships: memberships.length,
    },
    paidTotal: paid._sum.amount ?? 0,
  };
}

/**
 * Kullanıcıyı ve tüm kayıtlarını siler. Tek transaction: bir adım hata
 * verirse hiçbir değişiklik kalıcı olmaz.
 */
export async function deleteUserCompletely(prisma, userId, soloGroupIds = []) {
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
    await tx.pushDevice.deleteMany({ where: { userId } });
    await tx.groupJoinRequest.deleteMany({
      where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
    });
    await tx.userAddBlock.deleteMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    });

    // 4) Kullanıcının kendisi
    await tx.user.delete({ where: { id: userId } });
  });
}
