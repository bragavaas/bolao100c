import Link from "next/link";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { Medal, Star } from "lucide-react";
import { dbAdmin } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { maybeSync } from "@/lib/sync";
import { hasStarted } from "@/lib/format";
import { MatchCard, type MatchCardData } from "@/components/match-card";

export const dynamic = "force-dynamic";

interface MatchRow {
  id: string;
  group_name: string;
  round: number;
  match_date: string | null;
  city: string | null;
  home_team: string;
  away_team: string;
  home_flag: string | null;
  away_flag: string | null;
  home_score: number | null;
  away_score: number | null;
  is_finished: boolean;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ rodada?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Sync-on-read: roda depois da resposta, com debounce no banco.
  after(() => maybeSync());

  const db = dbAdmin();
  const params = await searchParams;

  const [{ data: me }, { data: allMatches }, { data: myPredictions }] = await Promise.all([
    db.from("users").select("display_name, total_points").eq("id", session.id).single(),
    db
      .from("matches")
      .select(
        "id, group_name, round, match_date, city, home_team, away_team, home_flag, away_flag, home_score, away_score, is_finished"
      )
      .order("match_date", { ascending: true, nullsFirst: false })
      .order("group_name", { ascending: true }),
    db
      .from("predictions")
      .select("match_id, predicted_home, predicted_away, points")
      .eq("user_id", session.id),
  ]);

  const matches = (allMatches ?? []) as MatchRow[];
  const predictions = new Map(
    (myPredictions ?? []).map((p) => [p.match_id as string, p])
  );

  const { count: ahead } = await db
    .from("users")
    .select("id", { count: "exact", head: true })
    .gt("total_points", me?.total_points ?? 0);
  const rankPosition = (ahead ?? 0) + 1;

  const finishedCount = matches.filter((m) => m.is_finished).length;
  const remaining = matches.length - finishedCount;
  const predictedFinished = matches.filter((m) => m.is_finished && predictions.has(m.id));
  const avgPoints =
    predictedFinished.length > 0
      ? ((me?.total_points ?? 0) / predictedFinished.length).toFixed(1)
      : "—";

  const defaultRound =
    matches.find((m) => !m.is_finished)?.round ?? matches.at(-1)?.round ?? 1;
  const requested = Number(params.rodada);
  const round = [1, 2, 3].includes(requested) ? requested : defaultRound;
  const roundMatches = matches.filter((m) => m.round === round);

  const cards: MatchCardData[] = roundMatches.map((m) => {
    const p = predictions.get(m.id);
    return {
      id: m.id,
      groupName: m.group_name,
      matchDate: m.match_date,
      city: m.city,
      homeTeam: m.home_team,
      awayTeam: m.away_team,
      homeFlag: m.home_flag,
      awayFlag: m.away_flag,
      homeScore: m.home_score,
      awayScore: m.away_score,
      isFinished: m.is_finished,
      started: hasStarted(m.match_date),
      predictedHome: p?.predicted_home ?? null,
      predictedAway: p?.predicted_away ?? null,
      earnedPoints: m.is_finished ? (p?.points ?? null) : null,
    };
  });

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-gradient-to-br from-pitch to-pitch-deep p-5 text-white shadow-md">
        <p className="text-sm/none text-white/75">Olá,</p>
        <h1 className="font-display mt-1 text-2xl font-extrabold tracking-tight">
          {me?.display_name ?? session.displayName}
        </h1>
        <div className="mt-4 flex gap-6">
          <div className="flex items-center gap-2">
            <Star size={18} className="text-sun" fill="currentColor" />
            <div>
              <p className="font-display tabular text-xl font-extrabold leading-none">
                {me?.total_points ?? 0}
              </p>
              <p className="text-[11px] text-white/70">pontos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Medal size={18} className="text-sun" />
            <div>
              <p className="font-display tabular text-xl font-extrabold leading-none">
                {rankPosition}º
              </p>
              <p className="text-[11px] text-white/70">no ranking</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        {[
          { value: predictions.size, label: "palpites" },
          { value: remaining, label: "jogos restantes" },
          { value: avgPoints, label: "média de pts" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl bg-white p-3 text-center ring-1 ring-line"
          >
            <p className="font-display tabular text-lg font-extrabold">{stat.value}</p>
            <p className="text-[11px] text-ink/55">{stat.label}</p>
          </div>
        ))}
      </section>

      <nav className="flex gap-2" aria-label="Rodadas">
        {[1, 2, 3].map((r) => (
          <Link
            key={r}
            href={`/?rodada=${r}`}
            className={`flex-1 rounded-xl py-2 text-center text-sm font-semibold transition-colors ${
              r === round
                ? "bg-royal text-white shadow-sm"
                : "bg-white text-ink/60 ring-1 ring-line"
            }`}
          >
            {r}ª Rodada
          </Link>
        ))}
      </nav>

      {cards.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-ink/60 ring-1 ring-line">
          Nenhum jogo nesta rodada ainda. Volte em breve.
        </p>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <MatchCard key={card.id} match={card} />
          ))}
        </div>
      )}
    </div>
  );
}
