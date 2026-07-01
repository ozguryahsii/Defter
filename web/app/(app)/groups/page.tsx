import Link from "next/link";
import type { Metadata } from "next";
import { Layers, Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { getGroupsList } from "@/lib/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { GroupCard } from "@/components/dashboard/group-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Reveal } from "@/components/magic/reveal";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Gruplar" };

export default async function GroupsPage() {
  const session = await auth();
  const groups = await getGroupsList(session!.user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gruplar"
        description="Katıldığın tüm ortak harcama grupları."
      >
        <Button asChild variant="brand">
          <Link href="/groups/new">
            <Plus /> Yeni Ortak Harcama
          </Link>
        </Button>
      </PageHeader>

      {groups.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Henüz bir grubun yok"
          description="Bir tatil ya da ortak girişim için ilk grubunu oluştur ve arkadaşlarını davet et."
          actionLabel="İlk grubunu oluştur"
          actionHref="/groups/new"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((g, i) => (
            <Reveal key={g.id} delay={i * 0.04}>
              <GroupCard group={g} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
