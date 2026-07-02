import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen">
      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className="lg:pl-64 print:pl-0">
        <div className="print:hidden">
          <Topbar
            name={session.user.name ?? session.user.username}
            username={session.user.username}
          />
        </div>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-8 print:max-w-none print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
