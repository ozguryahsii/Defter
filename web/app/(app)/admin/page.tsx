import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Crown, Search, ShieldCheck, Ticket, Users } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { SectionCard } from "@/components/dashboard/section-card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  CodeCreateForm,
  CodeActiveToggle,
  PremiumToggle,
} from "@/components/admin/admin-controls";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Yönetim" };
export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  // Admin kimliği .env'deki ADMIN_USERNAME ile belirlenir; başkası giremez.
  const session = await requireAdmin();
  if (!session) redirect("/dashboard");
  const t = getT();

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const [totalUsers, premiumUsers, signupsToday, signupsWeek, codes] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { premium: true } }),
      prisma.user.count({ where: { createdAt: { gte: dayStart } } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.discountCode.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          redemptions: {
            orderBy: { createdAt: "desc" },
            include: {
              user: { select: { username: true, premium: true } },
            },
          },
        },
      }),
    ]);

  const q = searchParams.q?.trim() ?? "";
  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { username: { contains: q } },
            { displayName: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      username: true,
      displayName: true,
      premium: true,
      premiumSource: true,
      createdAt: true,
    },
  });

  const stats = [
    { label: t("Toplam üye"), value: totalUsers, icon: Users },
    { label: t("Premium üye"), value: premiumUsers, icon: Crown },
    { label: t("Bugün kayıt"), value: signupsToday, icon: ShieldCheck },
    { label: t("Son 7 gün"), value: signupsWeek, icon: Ticket },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ShieldCheck className="h-6 w-6 text-brand" /> {t("Yönetim Paneli")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("İndirim kodları, üyeler ve premium yönetimi")}
        </p>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border/60 bg-card/40 p-4"
          >
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <s.icon className="h-3.5 w-3.5" /> {s.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Kod oluşturma */}
      <SectionCard
        title={t("Yeni İndirim Kodu")}
        description={t("Influencer kampanyaları için kod tanımla")}
      >
        <CodeCreateForm />
      </SectionCard>

      {/* Kod listesi + kimler geldi */}
      <SectionCard
        title={t("İndirim Kodları")}
        description={t("Kod bazında kullanım ve gelen üyeler")}
      >
        {codes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("Henüz kod yok.")}</p>
        ) : (
          <ul className="space-y-4">
            {codes.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-border/60 bg-secondary/20 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold">
                    {c.code}
                  </span>
                  <Badge variant="brand" className="text-[10px]">
                    %{c.percent}
                  </Badge>
                  {c.influencer && (
                    <Badge variant="secondary" className="text-[10px]">
                      {c.influencer}
                    </Badge>
                  )}
                  {c.expiresAt && (
                    <span className="text-xs text-muted-foreground">
                      {t("son:")} {formatDate(c.expiresAt)}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {t("{n} kullanım", { n: c.redemptions.length })}
                  </span>
                  <CodeActiveToggle codeId={c.id} active={c.active} />
                </div>
                {c.redemptions.length > 0 && (
                  <ul className="mt-2 space-y-1 border-t border-border/40 pt-2">
                    {c.redemptions.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <span className="font-medium text-foreground">
                          @{r.user.username}
                        </span>
                        {r.user.premium && (
                          <Crown className="h-3 w-3 text-brand" />
                        )}
                        <span className="ml-auto">
                          {formatDate(r.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* Üyeler */}
      <SectionCard
        title={t("Üyeler")}
        description={t("Ara ve premium durumunu elle yönet (ödeme entegrasyonuna kadar)")}
      >
        <form method="GET" className="mb-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q}
              placeholder={t("Kullanıcı adı, ad veya e-posta ara…")}
              className="pl-9"
            />
          </div>
        </form>
        <ul className="divide-y divide-border/50">
          {users.map((u) => (
            <li key={u.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {u.displayName ?? u.username}
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    @{u.username}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("kayıt:")} {formatDate(u.createdAt)}
                  {u.premiumSource ? ` · ${t("kaynak:")} ${u.premiumSource}` : ""}
                </p>
              </div>
              <PremiumToggle userId={u.id} premium={u.premium} />
            </li>
          ))}
          {users.length === 0 && (
            <li className="py-3 text-sm text-muted-foreground">
              {t("Sonuç bulunamadı.")}
            </li>
          )}
        </ul>
      </SectionCard>
    </div>
  );
}
