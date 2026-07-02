import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowDownCircle,
  ArrowLeft,
  ArrowUpCircle,
  FileText,
  PiggyBank,
  Plane,
  Users,
  Wallet,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { getGroupDetail } from "@/lib/queries";
import { formatCurrency, formatDate, initials } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { SectionCard } from "@/components/dashboard/section-card";
import { GroupSettlement } from "@/components/groups/group-settlement";
import { BalanceList } from "@/components/dashboard/balance-list";
import { Reveal } from "@/components/magic/reveal";
import { AddExpenseDialog } from "@/components/groups/add-expense-dialog";
import { AddMemberForm } from "@/components/groups/add-member-form";
import { InviteButton } from "@/components/groups/invite-button";
import { ExpenseList } from "@/components/groups/expense-list";
import { ActivityFeed } from "@/components/groups/activity-feed";
import { LiveRefresh } from "@/components/groups/live-refresh";
import { BudgetCard } from "@/components/groups/budget-card";
import { RecurringSection } from "@/components/groups/recurring-section";
import { DeleteGroupButton } from "@/components/groups/delete-group-button";
import { CategoryDonut } from "@/components/charts/category-donut";

export const metadata: Metadata = { title: "Grup" };

export default async function GroupDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  const userId = session!.user.id;
  const detail = await getGroupDetail(params.id, userId);
  if (!detail) notFound();

  const { group, settlement, settled, activities, recurring, monthSpend, budget } =
    detail;
  const isPersonal = group.type === "Kisisel";
  const isOwner = group.createdById === userId;
  const Icon = isPersonal ? PiggyBank : Plane;

  const members = group.members.map((m) => ({
    userId: m.userId,
    name: m.user.displayName ?? m.user.username,
  }));

  const expenseItems = group.expenses.map((e) => {
    const canManage = e.payerId === userId || group.createdById === userId;
    const editSplit: "Equal" | "Exact" =
      e.splitType === "Exact" ? "Exact" : "Equal";
    return {
      id: e.id,
      description: e.description,
      category: e.category,
      amount: e.amount,
      date: e.date.toISOString(),
      payerName: e.payer.displayName ?? e.payer.username,
      splitType: e.splitType,
      shareCount: e.shares.length,
      kind: e.kind,
      canDelete: canManage,
      canEdit: canManage,
      receiptPath: e.receiptPath,
      original:
        e.originalAmount != null && e.originalCurrency
          ? { amount: e.originalAmount, currency: e.originalCurrency }
          : null,
      editInit: {
        id: e.id,
        description: e.description,
        category: e.category ?? "",
        amount: e.amount,
        payerId: e.payerId,
        date: e.date.toISOString().slice(0, 10),
        splitType: editSplit,
        participantIds: e.shares.map((s) => s.userId),
        exactAmounts: Object.fromEntries(
          e.shares.map((s) => [s.userId, String(s.amount)]),
        ),
      },
    };
  });

  const payInfo = Object.fromEntries(
    group.members.map((m) => [
      m.userId,
      { iban: m.user.iban, ibanName: m.user.ibanName },
    ]),
  );

  const yourBalance =
    settlement.balances.find((b) => b.userId === userId)?.amount ?? 0;

  const expensesOnly = group.expenses.filter((e) => e.kind !== "income");
  const incomesOnly = group.expenses.filter((e) => e.kind === "income");
  const expenseTotal = expensesOnly.reduce((s, e) => s + e.amount, 0);
  const incomeTotal = incomesOnly.reduce((s, e) => s + e.amount, 0);
  const remaining = incomeTotal - expenseTotal;

  const youPaid = expensesOnly
    .filter((e) => e.payerId === userId)
    .reduce((s, e) => s + e.amount, 0);

  const categoryMap = new Map<string, number>();
  for (const e of expensesOnly) {
    const cat = e.category?.trim() || "Diğer";
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + e.amount);
  }
  const categoryBreakdown = [...categoryMap.entries()]
    .map(([category, amount]) => ({ category, amount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {!isPersonal && (
        <LiveRefresh
          groupId={group.id}
          initialVersion={activities[0]?.createdAt.getTime() ?? 0}
        />
      )}
      {!isPersonal && (
        <Link
          href="/groups"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Gruplar
        </Link>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl border border-border/60 bg-secondary/50 text-brand">
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {group.name}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge variant={isPersonal ? "brand" : "secondary"}>
                {isPersonal ? "Kişisel" : "Tatil / Arkadaş"}
              </Badge>
              <Badge variant="outline">{group.currency}</Badge>
              {!isPersonal && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" /> {group.members.length} üye
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/groups/${group.id}/report`}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border/60 px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <FileText className="h-4 w-4" /> Rapor
          </Link>
          {isPersonal && (
            <AddExpenseDialog
              groupId={group.id}
              currency={group.currency}
              members={members}
              currentUserId={userId}
              personal
              mode="income"
            />
          )}
          <AddExpenseDialog
            groupId={group.id}
            currency={group.currency}
            members={members}
            currentUserId={userId}
            personal={isPersonal}
          />
        </div>
      </div>

      {/* Summary strip */}
      {isPersonal ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryTile
            label="Gelir"
            value={formatCurrency(incomeTotal, group.currency)}
            icon={<ArrowUpCircle className="h-4 w-4" />}
            tone="success"
          />
          <SummaryTile
            label="Gider"
            value={formatCurrency(expenseTotal, group.currency)}
            icon={<ArrowDownCircle className="h-4 w-4" />}
            tone="destructive"
          />
          <SummaryTile
            label="Kalan"
            value={formatCurrency(remaining, group.currency)}
            icon={<Wallet className="h-4 w-4" />}
            tone={remaining >= 0 ? "success" : "destructive"}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryTile
            label="Toplam Harcama"
            value={formatCurrency(expenseTotal, group.currency)}
            icon={<Wallet className="h-4 w-4" />}
          />
          <SummaryTile
            label="Senin Ödediğin"
            value={formatCurrency(youPaid, group.currency)}
          />
          <SummaryTile
            label="Senin Durumun"
            value={
              Math.abs(yourBalance) < 0.005
                ? "Ödeşildi"
                : `${yourBalance > 0 ? "+" : ""}${formatCurrency(yourBalance, group.currency)}`
            }
            tone={
              Math.abs(yourBalance) < 0.005
                ? "muted"
                : yourBalance > 0
                  ? "success"
                  : "destructive"
            }
          />
          <SummaryTile
            label="Bekleyen Ödeşme"
            value={`${settlement.transfers.length} işlem`}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-4 lg:col-span-2">
          {!isPersonal && (
            <Reveal>
              <SectionCard
                title="Borç Durumu"
                description="Minimum transferle nasıl ödeşilir — ödemeyi yalnızca alacaklı onaylar"
              >
                <GroupSettlement
                  groupId={group.id}
                  transfers={settlement.transfers}
                  settled={settled}
                  currency={group.currency}
                  currentUserId={userId}
                  payInfo={payInfo}
                />
              </SectionCard>
            </Reveal>
          )}

          <Reveal delay={0.05}>
            <SectionCard
              title={isPersonal ? "Gelir & Giderler" : "Harcamalar"}
              description={`${group.expenses.length} kayıt`}
            >
              <ExpenseList
                items={expenseItems}
                currency={group.currency}
                members={members}
                currentUserId={userId}
                groupId={group.id}
                personal={isPersonal}
              />
            </SectionCard>
          </Reveal>
        </div>

        {/* Side column */}
        <div className="space-y-4">
          {isPersonal && (
            <Reveal delay={0.06}>
              <SectionCard title="Bütçe" description="Aylık harcama hedefin">
                <BudgetCard
                  groupId={group.id}
                  currency={group.currency}
                  monthSpend={monthSpend}
                  budget={budget}
                  isOwner={isOwner}
                />
              </SectionCard>
            </Reveal>
          )}

          <Reveal delay={0.08}>
            <SectionCard title="Kategori Dağılımı" description="Nereye harcandı?">
              {categoryBreakdown.length ? (
                <CategoryDonut
                  data={categoryBreakdown}
                  currency={group.currency}
                />
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Kategori verisi yok.
                </p>
              )}
            </SectionCard>
          </Reveal>

          {isPersonal && (
            <Reveal delay={0.1}>
              <SectionCard
                title="Tekrarlayan"
                description="Kira, abonelik gibi düzenli giderler"
              >
                <RecurringSection
                  groupId={group.id}
                  currency={group.currency}
                  items={recurring}
                  members={members}
                  currentUserId={userId}
                />
              </SectionCard>
            </Reveal>
          )}

          {!isPersonal && (
            <Reveal delay={0.1}>
              <SectionCard title="Net Bakiyeler" description="Kim ne durumda">
                <BalanceList
                  balances={settlement.balances}
                  currency={group.currency}
                  currentUserId={userId}
                />
              </SectionCard>
            </Reveal>
          )}

          <Reveal delay={0.14}>
            <SectionCard title="Hareketler" description="Son aktiviteler">
              <ActivityFeed items={activities} />
            </SectionCard>
          </Reveal>

          {!isPersonal && (
            <Reveal delay={0.15}>
              <SectionCard title={`Üyeler (${group.members.length})`}>
                <ul className="space-y-2.5">
                  {group.members.map((m) => {
                    const name = m.user.displayName ?? m.user.username;
                    return (
                      <li key={m.userId} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-[10px]">
                            {initials(name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 truncate text-sm">{name}</span>
                        {m.userId === group.createdById && (
                          <Badge variant="secondary" className="text-[10px]">
                            sahip
                          </Badge>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <Separator className="my-4" />
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Kullanıcı adına göre üye ekle
                </p>
                <AddMemberForm groupId={group.id} />
                <div className="mt-3">
                  <InviteButton groupId={group.id} />
                </div>
              </SectionCard>
            </Reveal>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {isPersonal ? "Bütçe" : "Grup"} {formatDate(group.createdAt)}{" "}
          tarihinde oluşturuldu.
        </p>
        {isOwner && !isPersonal && (
          <DeleteGroupButton groupId={group.id} groupName={group.name} />
        )}
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: "default" | "success" | "destructive" | "muted";
}) {
  const toneClass = {
    default: "text-foreground",
    success: "text-success",
    destructive: "text-destructive",
    muted: "text-muted-foreground",
  }[tone];
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className={`mt-1.5 text-xl font-semibold tracking-tight ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}
