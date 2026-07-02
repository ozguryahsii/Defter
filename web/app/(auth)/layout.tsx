import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AuroraBackground } from "@/components/magic/aurora-background";
import { Logo } from "@/components/layout/logo";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <AuroraBackground />
      <div className="w-full max-w-md">
        <div className="mb-2 flex justify-center">
          <Logo href="/login" size="lg" />
        </div>
        {children}
      </div>
    </div>
  );
}
