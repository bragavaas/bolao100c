import { redirect } from "next/navigation";
import { dbAdmin } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { RankingLive, type RankingEntry } from "@/components/ranking-live";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const { data } = await dbAdmin()
    .from("users")
    .select("id, username, display_name, total_points")
    .order("total_points", { ascending: false })
    .order("username", { ascending: true });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-extrabold tracking-tight">Ranking</h1>
      <RankingLive initial={(data ?? []) as RankingEntry[]} currentUserId={session.id} />
    </div>
  );
}
