import type { Metadata } from "next";
import { JoinInvite } from "@/components/groups/join-invite";
import { getT } from "@/lib/i18n/server";

export function generateMetadata(): Metadata {
  return { title: getT()("Gruba Katıl") };
}

export default function JoinPage({ params }: { params: { token: string } }) {
  return (
    <div className="py-10">
      <JoinInvite token={params.token} />
    </div>
  );
}
