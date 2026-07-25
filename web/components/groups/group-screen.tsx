import Link from "next/link";
import {
  Archive,
  ArrowDownCircle,
  ArrowLeft,
  ArrowUpCircle,
  FileText,
  Plane,
  Users,
  Wallet,
} from "lucide-react";
import type { GroupDetail } from "@/lib/queries";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { Separator } from "@/components/ui/separator";
import { SectionCard } from "@/components/dashboard/section-card";
import { GroupSettlement } from "@/components/groups/group-settlement";
import { BalanceList } from "@/components/dashboard/balance-list";
import { KpiGrid } from "@/components/dashboard/kpi-grid";
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
import {
  ArchiveGroupButton,
  LeaveGroupButton,
} from "@/components/groups/group-member-actions";
import { RemoveMemberButton } from "@/components/groups/remove-member-button";
import { RenameGroupButton } from "@/components/groups/rename-group-button";
import { CategoryDonut } from "@/components/charts/category-donut";
import { getT } from "@/lib/i18n/server";

export function GroupScreen({
  detail,
  userId,
}: {
  detail: GroupDetail;
  userId: string;
}) {
  const {
    group,
    settlement,
    settled,
    activities,
    recurring,
    monthSpend,
    budget,
    pendingInvites,
  } = detail;
  const t = getT();
  const isPersonal = group.type === "Kisisel";
  const isOwner = group.createdById === userId;
  const isArchived = group.archivedAt != null;
  const Icon = isPersonal ? Wallet : Plane;

  const members = group.members.map((m) => ({
    userId: m.userId,
    name: m.user.displayName ?? m.user.username,
  }));

  const expenseItems = group.expenses.map((e) => {
    const canManage =
      !isArchived && (e.payerId === userId || group.createdById === userId);
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
    const cat = e.category?.trim() || t("Diğer");
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + e.amount);
  }
  const categoryBreakdown = [...categoryMap.entries()]
    .map(([category, amount]) => ({ category, amount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  // KPI drill-down rows (this group only)
  const cur = group.currency;
  const paidByMember = members
    .map((m) => ({
      left: m.name,
      right: formatCurrency(
        expensesOnly
          .filter((e) => e.payerId === m.userId)
          .reduce((s, e) => s + e.amount, 0),
        cur,
      ),
      amount: expensesOnly
        .filter((e) => e.payerId === m.userId)
        .reduce((s, e) => s + e.amount, 0),
    }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .map(({ left, right }) => ({ left, right }));

  const myExpenseRows = expensesOnly
    .filter((e) => e.payerId === userId)
    .slice(0, 15)
    .map((e) => ({
      left: e.description,
      sub: formatDate(e.date),
      right: formatCurrency(e.amount, cur),
    }));

  const owedRows = settlement.transfers
    .filter((t) => t.toUserId === userId)
    .map((t) => ({ left: t.fromUserName, right: formatCurrency(t.amount, cur) }));
  const owedTotal = settlement.transfers
    .filter((t) => t.toUserId === userId)
    .reduce((s, t) => s + t.amount, 0);

  const oweRows = settlement.transfers
    .filter((t) => t.fromUserId === userId)
    .map((t) => ({ left: t.toUserName, right: formatCurrency(t.amount, cur) }));
  const oweTotal = settlement.transfers
    .filter((t) => t.fromUserId === userId)
    .reduce((s, t) => s + t.amount, 0);

  const pendingRows = settlement.transfers.map((t) => ({
    left: `${t.fromUserName} → ${t.toUserName}`,
    right: formatCurrency(t.amount, cur),
  }));

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
          <ArrowLeft className="h-4 w-4" /> {t("Gruplar")}
        </Link>
      )}

      {isArchived && (
        <div className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm">
          <Archive className="h-4 w-4 shrink-0 text-warning" />
          {t("Bu grup arşivlendi — kayıtlar salt okunur; yeni harcama ve ödeme yapılamaz.")}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl border border-border/60 bg-secondary/50 text-brand">
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-2xl font-semibold tracking-tight">
                {group.name}
              </h1>
              {!isPersonal && isOwner && !isArchived && (
                <RenameGroupButton
                  groupId={group.id}
                  currentName={group.name}
                />
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge variant={isPersonal ? "brand" : "secondary"}>
                {isPersonal ? t("Kişisel") : t("Tatil / Arkadaş")}
              </Badge>
              <Badge variant="outline">{group.currency}</Badge>
              {!isPersonal && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" /> {t("{n} üye", { n: group.members.length })}
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
            <FileText className="h-4 w-4" /> {t("Rapor")}
          </Link>
          {isPersonal && !isArchived && (
            <AddExpenseDialog
              groupId={group.id}
              currency={group.currency}
              members={members}
              currentUserId={userId}
              personal
              mode="income"
            />
          )}
          {!isArchived && (
            <AddExpenseDialog
              groupId={group.id}
              currency={group.currency}
              members={members}
              currentUserId={userId}
              personal={isPersonal}
            />
          )}
        </div>
      </div>

      {/* Summary strip */}
      {isPersonal ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryTile
            label={t("Gelir")}
            value={formatCurrency(incomeTotal, group.currency)}
            icon={<ArrowUpCircle className="h-4 w-4" />}
            tone="success"
          />
          <SummaryTile
            label={t("Gider")}
            value={formatCurrency(expenseTotal, group.currency)}
            icon={<ArrowDownCircle className="h-4 w-4" />}
            tone="destructive"
          />
          <SummaryTile
            label={t("Kalan")}
            value={formatCurrency(remaining, group.currency)}
            icon={<Wallet className="h-4 w-4" />}
            tone={remaining >= 0 ? "success" : "destructive"}
          />
        </div>
      ) : (
        <KpiGrid
          items={[
            {
              key: "spent",
              label: t("Toplam Harcama"),
              value: formatCurrency(expenseTotal, cur),
              hint: t("bu grup"),
              icon: "wallet",
              rows: paidByMember,
              emptyText: t("Henüz harcama yok."),
              detailHint: t("Üye bazında ödenen tutarlar"),
            },
            {
              key: "paid",
              label: t("Senin Ödediğin"),
              value: formatCurrency(youPaid, cur),
              tone: "brand",
              icon: "receipt",
              rows: myExpenseRows,
              emptyText: t("Bu grupta henüz ödeme yapmadın."),
              detailHint: t("Bu gruptaki harcamaların"),
            },
            {
              key: "owed",
              label: t("Sana Borçlu"),
              value: formatCurrency(owedTotal, cur),
              tone: "success",
              icon: "in",
              rows: owedRows,
              emptyText: t("Bu grupta kimsenin sana borcu yok."),
              detailHint: t("Kim sana ne kadar borçlu"),
            },
            {
              key: "owe",
              label: t("Senin Borcun"),
              value: formatCurrency(oweTotal, cur),
              tone: "destructive",
              icon: "out",
              rows: oweRows,
              emptyText: t("Bu grupta borcun yok. 🎉"),
              detailHint: t("Kime ne kadar borçlusun"),
            },
            {
              key: "pending",
              label: t("Bekleyen Ödeşme"),
              value: t("{n} işlem", { n: settlement.transfers.length }),
              icon: "scale",
              rows: pendingRows,
              emptyText: t("Bekleyen ödeşme yok."),
              detailHint: t("Gruptaki tüm açık transferler"),
            },
          ]}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Main column */}
        <div className="min-w-0 space-y-4 lg:col-span-2">
          {!isPersonal && (
            <Reveal>
              <SectionCard
                title={t("Borç Durumu")}
                description={t("Minimum transferle nasıl ödeşilir — ödemeyi yalnızca alacaklı onaylar")}
              >
                <GroupSettlement
                  groupId={group.id}
                  transfers={settlement.transfers}
                  settled={settled}
                  currency={group.currency}
                  currentUserId={userId}
                  payInfo={payInfo}
                  readOnly={isArchived}
                />
              </SectionCard>
            </Reveal>
          )}

          <Reveal delay={0.05}>
            <SectionCard
              title={isPersonal ? t("Gelir & Giderler") : t("Harcamalar")}
              description={t("{n} kayıt", { n: group.expenses.length })}
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
        <div className="min-w-0 space-y-4">
          {isPersonal && (
            <Reveal delay={0.06}>
              <SectionCard title={t("Bütçe")} description={t("Aylık harcama hedefin")}>
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
            <SectionCard title={t("Kategori Dağılımı")} description={t("Nereye harcandı?")}>
              {categoryBreakdown.length ? (
                <CategoryDonut
                  data={categoryBreakdown}
                  currency={group.currency}
                />
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t("Kategori verisi yok.")}
                </p>
              )}
            </SectionCard>
          </Reveal>

          {isPersonal && (
            <Reveal delay={0.1}>
              <SectionCard
                title={t("Tekrarlayan")}
                description={t("Kira, abonelik gibi düzenli giderler")}
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
              <SectionCard title={t("Net Bakiyeler")} description={t("Kim ne durumda")}>
                <BalanceList
                  balances={settlement.balances}
                  currency={group.currency}
                  currentUserId={userId}
                />
              </SectionCard>
            </Reveal>
          )}

          <Reveal delay={0.14}>
            <SectionCard title={t("Hareketler")} description={t("Son aktiviteler")}>
              <ActivityFeed items={activities} />
            </SectionCard>
          </Reveal>

          {!isPersonal && (
            <Reveal delay={0.15}>
              <SectionCard title={`${t("Üyeler")} (${group.members.length})`}>
                <ul className="space-y-2.5">
                  {group.members.map((m) => {
                    const name = m.user.displayName ?? m.user.username;
                    return (
                      <li key={m.userId} className="flex items-center gap-3">
                        <UserAvatar
                          userId={m.userId}
                          name={name}
                          className="h-8 w-8"
                          fallbackClassName="text-[10px]"
                        />
                        <span className="flex-1 truncate text-sm">{name}</span>
                        {m.userId === group.createdById ? (
                          <Badge variant="secondary" className="text-[10px]">
                            {t("sahip")}
                          </Badge>
                        ) : (
                          isOwner &&
                          !isArchived && (
                            <RemoveMemberButton
                              groupId={group.id}
                              userId={m.userId}
                              name={name}
                            />
                          )
                        )}
                      </li>
                    );
                  })}
                </ul>
                {pendingInvites.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      {t("Bekleyen davetler")} ({pendingInvites.length})
                    </p>
                    <ul className="space-y-1.5">
                      {pendingInvites.map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border/60 px-2.5 py-1.5 text-xs"
                        >
                          <span className="truncate">{p.toName}</span>
                          <span className="shrink-0 text-muted-foreground">
                            {t("onay bekliyor")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {!isArchived && (
                  <>
                    <Separator className="my-4" />
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      {t("Kullanıcı adına göre üye ekle (onayına gider)")}
                    </p>
                    <AddMemberForm groupId={group.id} />
                    <div className="mt-3">
                      <InviteButton groupId={group.id} />
                    </div>
                  </>
                )}
              </SectionCard>

              {/* Grup yönetimi — üyeler kartının hemen altında, görünür */}
              <div className="mt-4 space-y-2">
                {!isOwner && <LeaveGroupButton groupId={group.id} />}
                {isOwner && (
                  <>
                    <ArchiveGroupButton
                      groupId={group.id}
                      archived={isArchived}
                    />
                    <DeleteGroupButton
                      groupId={group.id}
                      groupName={group.name}
                    />
                  </>
                )}
              </div>
            </Reveal>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {t("{what} {date} tarihinde oluşturuldu.", { what: isPersonal ? t("Bütçe") : t("Grup"), date: formatDate(group.createdAt) })}
        </p>
        <span />
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
