"use client";

import Image from "next/image";
import { useState } from "react";
import { Check, Loader2, Lock } from "lucide-react";
import { flagUrl } from "@/lib/teams";
import { formatKickoff } from "@/lib/format";

export interface MatchCardData {
  id: string;
  groupName: string;
  matchDate: string | null;
  city: string | null;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string | null;
  awayFlag: string | null;
  homeScore: number | null;
  awayScore: number | null;
  isFinished: boolean;
  started: boolean;
  predictedHome: number | null;
  predictedAway: number | null;
  earnedPoints: number | null;
}

function Flag({ code, team }: { code: string | null; team: string }) {
  if (!code) {
    return <div className="h-[30px] w-10 rounded bg-mist" aria-hidden />;
  }
  return (
    <Image
      src={flagUrl(code)}
      alt={`Bandeira: ${team}`}
      width={40}
      height={30}
      className="h-[30px] w-10 rounded object-cover shadow-sm ring-1 ring-line"
      unoptimized
    />
  );
}

export function MatchCard({ match }: { match: MatchCardData }) {
  const locked = match.started || match.isFinished;
  const [home, setHome] = useState(match.predictedHome?.toString() ?? "");
  const [away, setAway] = useState(match.predictedAway?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    home !== (match.predictedHome?.toString() ?? "") ||
    away !== (match.predictedAway?.toString() ?? "");

  async function save() {
    setError(null);
    const h = Number(home);
    const a = Number(away);
    if (home === "" || away === "" || !Number.isInteger(h) || !Number.isInteger(a)) {
      setError("Preencha os dois placares.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: match.id, predictedHome: h, predictedAway: a }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Não foi possível salvar.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const pointsTone =
    match.earnedPoints === 5
      ? "bg-pitch text-white"
      : match.earnedPoints === 2
        ? "bg-sun/20 text-pitch-deep"
        : "bg-mist text-ink/60";

  return (
    <article className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(19,26,38,0.07)] ring-1 ring-line">
      <div className="flex items-center justify-between text-[11px] font-medium text-ink/55">
        <span className="rounded-md bg-mist px-2 py-0.5 font-display tracking-wide">
          Grupo {match.groupName}
        </span>
        <span>
          {formatKickoff(match.matchDate)}
          {match.city ? ` \u00b7 ${match.city}` : ""}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex flex-col items-center gap-1.5 text-center">
          <Flag code={match.homeFlag} team={match.homeTeam} />
          <span className="font-display text-sm font-semibold leading-tight">
            {match.homeTeam}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={99}
            className="score-box tabular"
            value={locked ? (match.predictedHome ?? "") : home}
            onChange={(e) => setHome(e.target.value)}
            disabled={locked}
            aria-label={`Gols de ${match.homeTeam}`}
          />
          <span className="font-display text-sm font-semibold text-ink/40">x</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={99}
            className="score-box tabular"
            value={locked ? (match.predictedAway ?? "") : away}
            onChange={(e) => setAway(e.target.value)}
            disabled={locked}
            aria-label={`Gols de ${match.awayTeam}`}
          />
        </div>

        <div className="flex flex-col items-center gap-1.5 text-center">
          <Flag code={match.awayFlag} team={match.awayTeam} />
          <span className="font-display text-sm font-semibold leading-tight">
            {match.awayTeam}
          </span>
        </div>
      </div>

      {match.isFinished ? (
        <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm">
          <span className="text-ink/70">
            Resultado:{" "}
            <strong className="font-display tabular">
              {match.homeScore} x {match.awayScore}
            </strong>
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${pointsTone}`}>
            {match.earnedPoints === null ? "Sem palpite" : `+${match.earnedPoints} pts`}
          </span>
        </div>
      ) : locked ? (
        <div className="mt-3 flex items-center justify-center gap-1.5 border-t border-line pt-3 text-xs text-ink/55">
          <Lock size={13} />
          Palpites encerrados — bola rolando
        </div>
      ) : (
        <div className="mt-3 border-t border-line pt-3">
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-pitch py-2.5 text-sm font-semibold text-white transition-colors hover:bg-pitch-deep disabled:bg-mist disabled:text-ink/40"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : saved ? (
              <Check size={16} />
            ) : null}
            {saved ? "Palpite salvo" : "Salvar palpite"}
          </button>
          {error ? <p className="mt-2 text-center text-xs text-red-600">{error}</p> : null}
        </div>
      )}
    </article>
  );
}
