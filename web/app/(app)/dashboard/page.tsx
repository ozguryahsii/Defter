import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Layers, Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/dashboard/page-header";
import { KpiGrid } from "@/components/dashboard/kpi-grid";
import { SectionCard } from "@/components/dashboard/section-card";
import { GroupCard } from "@/components/dashboard/group-card";
import { RecentExpenses } from "@/components/dashboard/recent-expenses";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Reveal } from "@/components/magic/reveal";
import { Button } from "@/components/ui/button";
import { CategoryDonut } from "@/components/charts/category-donut";
import { getT } from "@/lib/i18n/server";

export function generateMetadata(): Metadata {
  return { title: getT()("Genel Bakış") };
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;
  const data = await getDashboardData(userId);
  const t = getT();
  const cur = data.primaryCurrency;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Merhaba, {name} 👋", { name: session!.user.name ?? "" })}
        description={t("Tüm gruplarındaki harcama ve borç durumunun özeti. (Kişisel Bütçe alanındaki harcama ve gelirler bu alana yansıtılmaz.)")}
      >
        <Button asChild variant="brand">
          <Link href="/groups/new">
            <Plus /> {t("Yeni Grup Ekle")}
          </Link>
        </Button>
      </PageHeader>

      {data.groups.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={t("Henüz bir grubun yok")}
          description={t("Bir tatil ya da arkadaş grubu için ilk grubunu oluştur, arkadaşlarını ekle ve harcamaları girmeye başla.")}
          actionLabel={t("İlk grubunu oluştur")}
          actionHref="/groups/new"
        />
      ) : (
        <>
          {/* KPIs — tıklanınca detay dökümü açılır */}
          <KpiGrid
            items={[
              {
                key: "spent",
                label: t("Toplam Harcama"),
                value: formatCurrency(data.kpis.totalSpent, cur),
                hint: t("tüm gruplar"),
                icon: "wallet",
                rows: data.details.spent,
                emptyText: t("Henüz harcama yok."),
                detailHint: t("Grup bazında toplam harcamalar"),
              },
              {
                key: "paid",
                label: t("Senin Ödediğin"),
                value: formatCurrency(data.kpis.youPaid, cur),
                hint: t("cebinden çıkan"),
                tone: "brand",
                icon: "receipt",
                rows: data.details.paid,
                emptyText: t("Henüz ödeme yapmadın."),
                detailHint: t("Grup bazında senin ödediklerin"),
              },
              {
                key: "owed",
                label: t("Sana Borçlu"),
                value: formatCurrency(data.kpis.owedToYou, cur),
                hint: t("alacağın"),
                tone: "success",
                icon: "in",
                rows: data.details.owedToYou,
                emptyText: t("Kimsenin sana borcu yok."),
                detailHint: t("Kim, hangi gruptan, ne kadar borçlu"),
              },
              {
                key: "owe",
                label: t("Senin Borcun"),
                value: formatCurrency(data.kpis.youOwe, cur),
                hint: t("ödeyeceğin"),
                tone: "destructive",
                icon: "out",
                rows: data.details.youOwe,
                emptyText: t("Borcun yok. 🎉"),
                detailHint: t("Kime, hangi grupta, ne kadar borçlusun"),
              },
              {
                key: "pending",
                label: t("Bekleyen Ödeşme"),
                value: t("{n} işlem", { n: data.kpis.pendingSettlements }),
                hint: t("seni ilgilendiren"),
                icon: "scale",
                rows: data.details.pending,
                emptyText: t("Bekleyen ödeşme yok."),
                detailHint: t("Seni ilgilendiren açık transferler"),
              },
            ]}
          />

          {/* Groups + side column */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="min-w-0 space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold tracking-tight">{t("Gruplarım")}</h2>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/groups">
                    {t("Tümü")} <ArrowRight />
                  </Link>
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {data.groups.slice(0, 4).map((g) => (
                  <GroupCard key={g.id} group={g} />
                ))}
              </div>
            </div>

            <div className="min-w-0 space-y-4">
              <Reveal delay={0.1}>
                <SectionCard
                  title={t("Kategori Dağılımı")}
                  description={t("Nereye harcandı?")}
                >
                  {data.categoryBreakdown.length ? (
                    <CategoryDonut data={data.categoryBreakdown} currency={cur} />
                  ) : (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                      {t("Kategori verisi yok.")}
                    </p>
                  )}
                </SectionCard>
              </Reveal>

              <Reveal delay={0.15}>
                <SectionCard
                  title={t("Son Hareketler")}
                  description={t("En güncel harcamalar")}
                >
                  <RecentExpenses items={data.recentExpenses} />
                </SectionCard>
              </Reveal>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
