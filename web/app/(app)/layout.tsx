import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminUsername } from "@/lib/admin";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Foto yüklenince üst menüdeki avatarın anında tazelenmesi için sürüm.
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarPath: true },
  });

  return (
    <div className="min-h-screen">
      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className="lg:pl-64 print:pl-0">
        <div className="print:hidden">
          <Topbar
            userId={session.user.id}
            name={session.user.name ?? session.user.username}
            username={session.user.username}
            avatarVersion={me?.avatarPath ?? null}
            isAdmin={isAdminUsername(session.user.username)}
          />
        </div>
        {/* pb-24: mobil alt gezinme çubuğunun içeriği örtmemesi için */}
        <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8 print:max-w-none print:p-0">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
