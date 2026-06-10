import { redirect } from "next/navigation";
import { dbAdmin } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatKickoff } from "@/lib/format";

export const dynamic = "force-dynamic";

interface PredictionRow {
  predicted_home: number;
  predicted_away: number;
  points: number;
  matches: {
    home_team: string;
    away_team: string;
    home_score: number | null;
    away_score: number | null;
    match_date: string | null;
    is_finished: boolean;
    group_name: string;
  };
}

export default async function PalpitesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const { data } = await dbAdmin()
    .from("predictions")
    .select(
      "predicted_home, predicted_away, points, matches!inner(home_team, away_team, home_score, away_score, match_date, is_finished, group_name)"
    )
    .eq("user_id", session.id);

  const rows = ((data ?? []) as unknown as PredictionRow[]).sort((a, b) => {
    const da = a.matches.match_date ?? "9999";
    const db_ = b.matches.match_date ?? "9999";
    return da.localeCompare(db_);
  });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-extrabold tracking-tight">Meus palpites</h1>
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-ink/60 ring-1 ring-line">
          Você ainda não fez nenhum palpite. Os jogos estão na tela inicial.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row, index) => {
            const m = row.matches;
            const tone = !m.is_finished
              ? "bg-mist text-ink/55"
              : row.points === 5
                ? "bg-pitch text-white"
                : row.points === 2
                  ? "bg-sun/20 text-pitch-deep"
                  : "bg-mist text-ink/60";
            return (
              <li key={index} className="rounded-2xl bg-white p-4 ring-1 ring-line">
                <div className="flex items-center justify-between text-[11px] text-ink/55">
                  <span>Grupo {m.group_name}</span>
                  <span>{formatKickoff(m.match_date)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="font-display text-sm font-semibold">
                    {m.home_team} <span className="text-ink/40">x</span> {m.away_team}
                  </p>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>
                    {m.is_finished ? `+${row.points} pts` : "Aguardando"}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-ink/70">
                  Palpite:{" "}
                  <strong className="tabular font-display">
                    {row.predicted_home} x {row.predicted_away}
                  </strong>
                  {m.is_finished ? (
                    <>
                      {" \u00b7 "}Resultado:{" "}
                      <strong className="tabular font-display">
                        {m.home_score} x {m.away_score}
                      </strong>
                    </>
                  ) : null}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
