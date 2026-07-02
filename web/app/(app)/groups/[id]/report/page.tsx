import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Download } from "lucide-react";
import { auth } from "@/lib/auth";
import { getGroupDetail } from "@/lib/queries";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/groups/print-button";

export const metadata: Metadata = { title: "Rapor" };

export default async function GroupReportPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  const userId = session!.user.id;
  const detail = await getGroupDetail(params.id, userId);
  if (!detail) notFound();

  const { group, settlement, total, settled, monthSpend, budget } = detail;
  const cur = group.currency;
  const name = (id: string) =>
    group.members.find((m) => m.userId === id)?.user.displayName ??
    group.members.find((m) => m.userId === id)?.user.username ??
    "—";

  return (
    <div className="mx-auto max-w-3xl space-y-6 print:space-y-4">
      {/* Controls (hidden when printing) */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/groups/${group.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Gruba dön
        </Link>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <a href={`/api/groups/${group.id}/export`}>
              <Download className="h-4 w-4" /> CSV
            </a>
          </Button>
          <PrintButton />
        </div>
      </div>

      {/* Report header */}
      <div className="border-b border-border/60 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">{group.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {group.type === "Kisisel" ? "Kişisel Bütçe" : "Tatil / Arkadaş Grubu"}{" "}
          · {group.members.length} üye · {formatDate(new Date())} tarihli rapor
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Toplam Harcama" value={formatCurrency(total, cur)} />
        <Stat label="Bu Ay" value={formatCurrency(monthSpend, cur)} />
        <Stat
          label="Bütçe"
          value={budget != null ? formatCurrency(budget, cur) : "—"}
        />
        <Stat label="Harcama Sayısı" value={String(group.expenses.length)} />
      </div>

      {/* Balances */}
      <Section title="Net Bakiyeler">
        <table className="w-full text-sm">
          <tbody>
            {settlement.balances.map((b) => (
              <tr key={b.userId} className="border-b border-border/40">
                <td className="py-1.5">{b.userName}</td>
                <td
                  className={`py-1.5 text-right tabular-nums ${
                    b.amount > 0.005
                      ? "text-success"
                      : b.amount < -0.005
                        ? "text-destructive"
                        : "text-muted-foreground"
                  }`}
                >
                  {formatCurrency(b.amount, cur)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Outstanding settlement */}
      <Section title="Ödeşme Planı">
        {settlement.transfers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Bekleyen borç yok.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {settlement.transfers.map((t, i) => (
              <li key={i} className="flex justify-between border-b border-border/40 py-1.5">
                <span>
                  {t.fromUserName} → {t.toUserName}
                </span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(t.amount, cur)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Paid */}
      {settled.length > 0 && (
        <Section title="Ödenen">
          <ul className="space-y-1 text-sm">
            {settled.map((s) => (
              <li key={s.id} className="flex justify-between border-b border-border/40 py-1.5">
                <span>
                  {s.fromName} → {s.toName} · {formatDate(s.createdAt)}
                </span>
                <span className="tabular-nums text-muted-foreground line-through">
                  {formatCurrency(s.amount, cur)}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Expenses */}
      <Section title="Harcamalar">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
              <th className="py-1.5">Tarih</th>
              <th className="py-1.5">Açıklama</th>
              <th className="py-1.5">Ödeyen</th>
              <th className="py-1.5 text-right">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {group.expenses.map((e) => (
              <tr key={e.id} className="border-b border-border/40">
                <td className="py-1.5 text-muted-foreground">
                  {formatDate(e.date)}
                </td>
                <td className="py-1.5">
                  {e.description}
                  {e.category ? ` · ${e.category}` : ""}
                </td>
                <td className="py-1.5">{name(e.payerId)}</td>
                <td className="py-1.5 text-right tabular-nums">
                  {formatCurrency(e.amount, cur)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 p-3 print:rounded-none">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}
