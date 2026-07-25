import Link from "next/link";
import type { Metadata } from "next";
import { Archive, Layers, Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { getGroupsList } from "@/lib/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { GroupCard } from "@/components/dashboard/group-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Reveal } from "@/components/magic/reveal";
import { Button } from "@/components/ui/button";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Gruplar" };

export default async function GroupsPage() {
  const session = await auth();
  const groups = await getGroupsList(session!.user.id);
  const t = getT();
  const active = groups.filter((g) => !g.archived);
  const archived = groups.filter((g) => g.archived);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Gruplar")}
        description={t("Katıldığın tüm ortak harcama grupları.")}
      >
        <Button asChild variant="brand">
          <Link href="/groups/new">
            <Plus /> {t("Yeni Grup Ekle")}
          </Link>
        </Button>
      </PageHeader>

      {groups.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={t("Henüz bir grubun yok")}
          description={t("Bir tatil ya da arkadaş grubu için ilk grubunu oluştur ve arkadaşlarını davet et.")}
          actionLabel={t("İlk grubunu oluştur")}
          actionHref="/groups/new"
        />
      ) : (
        <>
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("Aktif grubun yok — hepsi arşivde.")}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {active.map((g, i) => (
                <Reveal key={g.id} delay={i * 0.04}>
                  <GroupCard group={g} />
                </Reveal>
              ))}
            </div>
          )}

          {archived.length > 0 && (
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 font-semibold tracking-tight text-muted-foreground">
                <Archive className="h-4 w-4" /> {t("Arşiv")} ({archived.length})
              </h2>
              <div className="grid gap-4 opacity-75 sm:grid-cols-2 xl:grid-cols-3">
                {archived.map((g, i) => (
                  <Reveal key={g.id} delay={i * 0.04}>
                    <GroupCard group={g} />
                  </Reveal>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
