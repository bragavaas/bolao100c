"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { formatKickoff } from "@/lib/format";

interface Match {
  id: string;
  group_name: string;
  round: number;
  match_date: string | null;
  home_team: string;
  away_team: string;
  home_flag: string | null;
  away_flag: string | null;
  home_score: number | null;
  away_score: number | null;
  is_finished: boolean;
  external_match_id: string | null;
  api_source: string | null;
}

export default function GameEditPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [isFinished, setIsFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function loadMatch() {
      try {
        const res = await fetch(`/api/admin/games/${params.id}`);
        if (!res.ok) {
          setError("Jogo não encontrado.");
          return;
        }
        const data = await res.json();
        setMatch(data);
        setHomeScore(data.home_score?.toString() ?? "");
        setAwayScore(data.away_score?.toString() ?? "");
        setIsFinished(data.is_finished);
      } catch {
        setError("Erro ao carregar o jogo.");
      } finally {
        setLoading(false);
      }
    }
    loadMatch();
  }, [params.id]);

  async function save() {
    setSaveError(null);
    setSaveSuccess(false);

    const h = Number(homeScore);
    const a = Number(awayScore);
    if (homeScore === "" || awayScore === "" || !Number.isInteger(h) || !Number.isInteger(a)) {
      setSaveError("Informe os dois placares (números inteiros).");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: params.id,
          homeScore: h,
          awayScore: a,
          finish: isFinished,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(body.error ?? "Erro ao salvar.");
        return;
      }
      setSaveSuccess(true);
      if (match) {
        setMatch({ ...match, home_score: h, away_score: a, is_finished: isFinished });
      }
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex items-center gap-2 text-pitch">
          <Loader2 size={16} className="animate-spin" />
          Carregando...
        </div>
      </main>
    );
  }

  if (error || !match) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-8">
        <Link href="/admin" className="flex items-center gap-1 text-sm font-semibold text-pitch">
          <ArrowLeft size={16} />
          Voltar
        </Link>
        <p className="mt-4 text-red-600">{error ?? "Jogo não encontrado."}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <Link href="/admin" className="flex items-center gap-1 text-sm font-semibold text-pitch">
        <ArrowLeft size={16} />
        Voltar para admin
      </Link>

      <div className="mt-6 rounded-2xl bg-white p-6 ring-1 ring-line">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <div className="flex items-center text-[11px] text-ink/55">
              <span>Grupo {match.group_name}</span>
              {match.external_match_id && <span> · fixture {match.external_match_id}</span>}
              {match.api_source && <span> · {match.api_source}</span>}
            </div>
            <p className="font-display text-xl font-semibold">
              {match.home_team} <span className="text-ink/40">×</span> {match.away_team}
            </p>
          </div>
          <div className="text-right text-xs text-ink/55">
            <div>R{match.round}</div>
            <div>{formatKickoff(match.match_date)}</div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-ink/60">Placar</label>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-ink/50">{match.home_team}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className="score-box tabular !h-12 !w-16 !text-lg"
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                />
              </div>
              <span className="text-ink/40">×</span>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-ink/50">{match.away_team}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className="score-box tabular !h-12 !w-16 !text-lg"
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-mist px-3 py-2">
            <input
              type="checkbox"
              id="is-finished"
              checked={isFinished}
              onChange={(e) => setIsFinished(e.target.checked)}
              className="h-4 w-4 rounded border-line accent-pitch"
            />
            <label htmlFor="is-finished" className="flex-1 cursor-pointer text-sm font-medium">
              Jogo encerrado
            </label>
          </div>

          {saveError && <p className="text-sm text-red-600">{saveError}</p>}
          {saveSuccess && (
            <p className="text-sm font-semibold text-pitch">Salvo com sucesso!</p>
          )}

          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded-lg bg-pitch px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-pitch-deep disabled:opacity-50"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Salvando...
              </span>
            ) : (
              "Salvar"
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
