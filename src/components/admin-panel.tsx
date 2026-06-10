"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCcw, Calculator } from "lucide-react";
import { formatKickoff } from "@/lib/format";

export interface AdminMatch {
  id: string;
  group_name: string;
  round: number;
  match_date: string | null;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  is_finished: boolean;
  external_match_id: string | null;
  api_source: string | null;
  last_sync: string | null;
}

export interface AdminUser {
  id: string;
  username: string;
  display_name: string;
  role: string;
  total_points: number;
}

export interface AdminSyncInfo {
  lastAttempt: string | null;
  lastSuccess: string | null;
  lastLog: {
    started_at: string;
    finished_at: string | null;
    trigger: string;
    ok: boolean | null;
    message: string | null;
    matches_updated: number;
    matches_finished: number;
  } | null;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "nunca";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function ScoreEditor({ match, onDone }: { match: AdminMatch; onDone: () => void }) {
  const [home, setHome] = useState(match.home_score?.toString() ?? "");
  const [away, setAway] = useState(match.away_score?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(finish: boolean) {
    setError(null);
    const h = Number(home);
    const a = Number(away);
    if (home === "" || away === "" || !Number.isInteger(h) || !Number.isInteger(a)) {
      setError("Informe os dois placares.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: match.id, homeScore: h, awayScore: a, finish }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Falha ao salvar.");
        return;
      }
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          className="score-box tabular !h-10 !w-12 !text-base"
          value={home}
          onChange={(e) => setHome(e.target.value)}
          aria-label={`Gols de ${match.home_team}`}
        />
        <span className="text-sm text-ink/40">x</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          className="score-box tabular !h-10 !w-12 !text-base"
          value={away}
          onChange={(e) => setAway(e.target.value)}
          aria-label={`Gols de ${match.away_team}`}
        />
        <button
          onClick={() => save(false)}
          disabled={saving}
          className="rounded-lg bg-mist px-3 py-2 text-xs font-semibold text-ink/70 disabled:opacity-50"
        >
          Salvar parcial
        </button>
        <button
          onClick={() => save(true)}
          disabled={saving}
          className="rounded-lg bg-royal px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          Encerrar
        </button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export function AdminPanel({
  matches,
  users,
  syncInfo,
}: {
  matches: AdminMatch[];
  users: AdminUser[];
  syncInfo: AdminSyncInfo;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"sync" | "recalc" | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [round, setRound] = useState(1);

  async function syncNow() {
    setBusy("sync");
    setFeedback(null);
    try {
      const res = await fetch("/api/sync");
      const body = await res.json().catch(() => ({}));
      setFeedback(
        body.ok
          ? `Sincronizado: ${body.matchesUpdated ?? 0} jogos atualizados, ${body.matchesFinished ?? 0} encerrados.`
          : `Falha no sync: ${body.message ?? res.status}`
      );
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function recalc() {
    setBusy("recalc");
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/recalc", { method: "POST" });
      setFeedback(res.ok ? "Pontuação reprocessada." : "Falha ao reprocessar.");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const log = syncInfo.lastLog;

  return (
    <div className="space-y-5">
      <h1 className="font-display text-xl font-extrabold tracking-tight">Admin</h1>

      <section className="rounded-2xl bg-white p-4 ring-1 ring-line">
        <h2 className="font-display text-sm font-bold">Sincronização</h2>
        <dl className="mt-2 space-y-1 text-xs text-ink/65">
          <div className="flex justify-between">
            <dt>Última tentativa</dt>
            <dd className="tabular">{formatDateTime(syncInfo.lastAttempt)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Último sucesso</dt>
            <dd className="tabular">{formatDateTime(syncInfo.lastSuccess)}</dd>
          </div>
          {log ? (
            <div className="flex justify-between">
              <dt>Último log ({log.trigger})</dt>
              <dd>
                {log.ok === false
                  ? `erro: ${log.message ?? "desconhecido"}`
                  : `${log.matches_updated} atualizados, ${log.matches_finished} encerrados`}
              </dd>
            </div>
          ) : null}
        </dl>
        <div className="mt-3 flex gap-2">
          <button
            onClick={syncNow}
            disabled={busy !== null}
            className="flex items-center gap-1.5 rounded-lg bg-pitch px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {busy === "sync" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCcw size={14} />
            )}
            Sincronizar agora
          </button>
          <button
            onClick={recalc}
            disabled={busy !== null}
            className="flex items-center gap-1.5 rounded-lg bg-royal px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {busy === "recalc" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Calculator size={14} />
            )}
            Reprocessar pontuação
          </button>
        </div>
        {feedback ? <p className="mt-2 text-xs text-ink/70">{feedback}</p> : null}
      </section>

      <section className="rounded-2xl bg-white p-4 ring-1 ring-line">
        <h2 className="font-display text-sm font-bold">Participantes ({users.length})</h2>
        <ul className="mt-2 divide-y divide-line text-sm">
          {users.map((user) => (
            <li key={user.id} className="flex items-center justify-between py-2">
              <span>
                {user.display_name}{" "}
                <span className="text-xs text-ink/50">@{user.username}</span>
                {user.role === "admin" ? (
                  <span className="ml-1.5 rounded bg-sun/25 px-1.5 py-0.5 text-[10px] font-semibold text-pitch-deep">
                    admin
                  </span>
                ) : null}
              </span>
              <span className="tabular font-display font-bold">{user.total_points} pts</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold">Jogos — placar manual</h2>
          <div className="flex gap-1">
            {[1, 2, 3].map((r) => (
              <button
                key={r}
                onClick={() => setRound(r)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                  r === round ? "bg-royal text-white" : "bg-white text-ink/60 ring-1 ring-line"
                }`}
              >
                R{r}
              </button>
            ))}
          </div>
        </div>
        {matches
          .filter((m) => m.round === round)
          .map((match) => (
            <div key={match.id} className="rounded-2xl bg-white p-3.5 ring-1 ring-line">
              <div className="flex items-center justify-between text-[11px] text-ink/55">
                <span>
                  Grupo {match.group_name}
                  {match.external_match_id ? ` \u00b7 fixture ${match.external_match_id}` : " \u00b7 sem fixture"}
                  {match.api_source ? ` \u00b7 ${match.api_source}` : ""}
                </span>
                <span>{formatKickoff(match.match_date)}</span>
              </div>
              <p className="mt-1.5 font-display text-sm font-semibold">
                {match.home_team} <span className="text-ink/40">x</span> {match.away_team}
                {match.is_finished ? (
                  <span className="ml-2 rounded bg-pitch/10 px-1.5 py-0.5 text-[10px] font-semibold text-pitch-deep">
                    encerrado {match.home_score} x {match.away_score}
                  </span>
                ) : null}
              </p>
              <ScoreEditor match={match} onDone={() => router.refresh()} />
            </div>
          ))}
      </section>
    </div>
  );
}
