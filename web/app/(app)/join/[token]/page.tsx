import type { Metadata } from "next";
import { JoinInvite } from "@/components/groups/join-invite";

export const metadata: Metadata = { title: "Gruba Katıl" };

export default function JoinPage({ params }: { params: { token: string } }) {
  return (
    <div className="py-10">
      <JoinInvite token={params.token} />
    </div>
  );
}
