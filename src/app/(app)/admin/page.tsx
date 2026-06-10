import { redirect } from "next/navigation";
import { dbAdmin } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { AdminPanel, type AdminMatch, type AdminSyncInfo, type AdminUser } from "@/components/admin-panel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/");

  const db = dbAdmin();
  const [{ data: matches }, { data: users }, { data: state }, { data: lastLog }] =
    await Promise.all([
      db
        .from("matches")
        .select(
          "id, group_name, round, match_date, home_team, away_team, home_score, away_score, is_finished, external_match_id, api_source, last_sync"
        )
        .order("round")
        .order("match_date", { ascending: true, nullsFirst: false }),
      db
        .from("users")
        .select("id, username, display_name, role, total_points")
        .order("total_points", { ascending: false }),
      db.from("sync_state").select("last_attempt, last_success").eq("id", true).single(),
      db
        .from("sync_log")
        .select("started_at, finished_at, trigger, ok, message, matches_updated, matches_finished")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const syncInfo: AdminSyncInfo = {
    lastAttempt: state?.last_attempt ?? null,
    lastSuccess: state?.last_success ?? null,
    lastLog: lastLog ?? null,
  };

  return (
    <AdminPanel
      matches={(matches ?? []) as AdminMatch[]}
      users={(users ?? []) as AdminUser[]}
      syncInfo={syncInfo}
    />
  );
}
