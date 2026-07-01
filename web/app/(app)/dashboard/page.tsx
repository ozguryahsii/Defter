import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Layers,
  Plus,
  Receipt,
  Scale,
  Wallet,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { SectionCard } from "@/components/dashboard/section-card";
import { GroupCard } from "@/components/dashboard/group-card";
import { RecentExpenses } from "@/components/dashboard/recent-expenses";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Reveal } from "@/components/magic/reveal";
import { Button } from "@/components/ui/button";
import { SpendAreaChart } from "@/components/charts/spend-area-chart";
import { CategoryDonut } from "@/components/charts/category-donut";
import { MemberBarChart } from "@/components/charts/member-bar-chart";

export const metadata: Metadata = { title: "Genel Bakış" };

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;
  const data = await getDashboardData(userId);
  const cur = data.primaryCurrency;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Merhaba, ${session!.user.name} 👋`}
        description="Tüm gruplarındaki harcama ve borç durumunun özeti."
      >
        <Button asChild variant="brand">
          <Link href="/groups/new">
            <Plus /> Yeni Ortak Harcama
          </Link>
        </Button>
      </PageHeader>

      {data.groups.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Henüz bir grubun yok"
          description="Bir tatil ya da ortak girişim için ilk ortak harcama grubunu oluştur, arkadaşlarını ekle ve harcamaları girmeye başla."
          actionLabel="İlk grubunu oluştur"
          actionHref="/groups/new"
        />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Reveal delay={0}>
              <StatCard
                label="Toplam Harcama"
                value={data.kpis.totalSpent}
                icon={<Wallet />}
                currency={cur}
                hint="tüm gruplar"
              />
            </Reveal>
            <Reveal delay={0.05}>
              <StatCard
                label="Senin Ödediğin"
                value={data.kpis.youPaid}
                icon={<Receipt />}
                currency={cur}
                tone="brand"
                hint="cebinden çıkan"
              />
            </Reveal>
            <Reveal delay={0.1}>
              <StatCard
                label="Sana Borçlu"
                value={data.kpis.owedToYou}
                icon={<ArrowRight />}
                currency={cur}
                tone="success"
                hint="alacağın"
              />
            </Reveal>
            <Reveal delay={0.15}>
              <StatCard
                label="Bekleyen Ödeşme"
                value={data.kpis.pendingSettlements}
                icon={<Scale />}
                hint="işlem"
              />
            </Reveal>
          </div>

          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Reveal delay={0.1} className="lg:col-span-2">
              <SectionCard
                title="Harcama Trendi"
                description="Son 6 ayın toplam grup harcaması"
              >
                <SpendAreaChart data={data.monthlySpend} currency={cur} />
              </SectionCard>
            </Reveal>
            <Reveal delay={0.15}>
              <SectionCard
                title="Kategori Dağılımı"
                description="Nereye harcandı?"
              >
                {data.categoryBreakdown.length ? (
                  <CategoryDonut data={data.categoryBreakdown} currency={cur} />
                ) : (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Kategori verisi yok.
                  </p>
                )}
              </SectionCard>
            </Reveal>
          </div>

          {/* Groups + recent */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold tracking-tight">Gruplarım</h2>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/groups">
                    Tümü <ArrowRight />
                  </Link>
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {data.groups.slice(0, 4).map((g) => (
                  <GroupCard key={g.id} group={g} />
                ))}
              </div>
            </div>

            <Reveal delay={0.1}>
              <SectionCard
                title="Son Hareketler"
                description="En güncel harcamalar"
              >
                <RecentExpenses items={data.recentExpenses} />
              </SectionCard>
            </Reveal>
          </div>

          {/* Member spend */}
          {data.memberSpend.length > 0 && (
            <Reveal delay={0.05}>
              <SectionCard
                title="Kim Ne Kadar Ödedi"
                description="Üye bazında toplam ödenen tutar"
              >
                <MemberBarChart data={data.memberSpend} currency={cur} />
              </SectionCard>
            </Reveal>
          )}
        </>
      )}
    </div>
  );
}
