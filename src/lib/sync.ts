import { dbAdmin } from "@/lib/db";
import {
  fetchSeasonFixtures,
  isFinishedStatus,
  verifyWorldCupLeague,
  type ApiFixture,
} from "@/lib/api-football";
import { normalizeName, resolveTeam } from "@/lib/teams";

interface DbMatch {
  id: string;
  home_team: string;
  away_team: string;
  match_date: string | null;
  home_score: number | null;
  away_score: number | null;
  external_match_id: string | null;
  is_finished: boolean;
  city: string | null;
  stadium: string | null;
}

export interface SyncResult {
  ran: boolean;
  ok?: boolean;
  message?: string;
  matchesUpdated?: number;
  matchesFinished?: number;
}

function minIntervalMinutes(): number {
  const n = Number(process.env.SYNC_MIN_INTERVAL_MINUTES ?? "10");
  return Number.isFinite(n) && n > 0 ? n : 10;
}

/** Chave de pareamento por nomes normalizados via mapa PT/EN das seleções. */
function pairKey(home: string, away: string): string | null {
  const h = resolveTeam(home);
  const a = resolveTeam(away);
  if (!h || !a) return null;
  return `${normalizeName(h.pt)}|${normalizeName(a.pt)}`;
}

/**
 * Sincroniza placares com a API-Football.
 * - Pareia fixtures com os jogos do banco por dupla de seleções
 *   (e desempata por proximidade de data quando houver rematch).
 * - Preenche match_date/estádio/cidade que ainda estiverem nulos.
 * - Atualiza placar, encerra partidas e recalcula pontos via RPC.
 */
export async function runSync(trigger: "on-read" | "cron" | "manual"): Promise<SyncResult> {
  const db = dbAdmin();

  const { data: log } = await db
    .from("sync_log")
    .insert({ trigger })
    .select("id")
    .single();

  let matchesUpdated = 0;
  let matchesFinished = 0;

  try {
    const { data: state } = await db
      .from("sync_state")
      .select("league_verified")
      .eq("id", true)
      .single();

    if (!state?.league_verified) {
      await verifyWorldCupLeague();
      await db.from("sync_state").update({ league_verified: true }).eq("id", true);
    }

    const [fixtures, { data: matches, error: matchesError }] = await Promise.all([
      fetchSeasonFixtures(),
      db
        .from("matches")
        .select(
          "id, home_team, away_team, match_date, home_score, away_score, external_match_id, is_finished, city, stadium"
        ),
    ]);
    if (matchesError) throw matchesError;

    const byExternalId = new Map<string, ApiFixture>();
    const byPair = new Map<string, ApiFixture[]>();
    for (const fixture of fixtures) {
      byExternalId.set(String(fixture.fixtureId), fixture);
      const key = pairKey(fixture.homeTeam, fixture.awayTeam);
      if (key) {
        const list = byPair.get(key) ?? [];
        list.push(fixture);
        byPair.set(key, list);
      }
    }

    for (const match of (matches ?? []) as DbMatch[]) {
      let fixture: ApiFixture | undefined;

      if (match.external_match_id) {
        fixture = byExternalId.get(match.external_match_id);
      }
      if (!fixture) {
        const key = pairKey(match.home_team, match.away_team);
        const candidates = key ? byPair.get(key) ?? [] : [];
        if (candidates.length === 1) {
          fixture = candidates[0];
        } else if (candidates.length > 1 && match.match_date) {
          const target = new Date(match.match_date).getTime();
          fixture = candidates.reduce((best, current) => {
            const bestDiff = Math.abs(new Date(best.dateUtc).getTime() - target);
            const currentDiff = Math.abs(new Date(current.dateUtc).getTime() - target);
            return currentDiff < bestDiff ? current : best;
          });
        } else if (candidates.length > 1) {
          // Sem data para desempatar (ex.: fase de grupos vs. mata-mata):
          // prefere fixture de fase de grupos.
          fixture = candidates.find((c) => /group/i.test(c.round)) ?? candidates[0];
        }
      }
      if (!fixture) continue;

      const finished = isFinishedStatus(fixture.statusShort);
      const updates: Record<string, unknown> = {};

      if (!match.external_match_id) {
        updates.external_match_id = String(fixture.fixtureId);
        updates.api_source = "api-football";
      }
      if (!match.match_date && fixture.dateUtc) updates.match_date = fixture.dateUtc;
      if (!match.city && fixture.venueCity) updates.city = fixture.venueCity;
      if (!match.stadium && fixture.venueName) updates.stadium = fixture.venueName;
      if (fixture.homeGoals !== null && fixture.homeGoals !== match.home_score) {
        updates.home_score = fixture.homeGoals;
      }
      if (fixture.awayGoals !== null && fixture.awayGoals !== match.away_score) {
        updates.away_score = fixture.awayGoals;
      }
      if (finished !== match.is_finished) updates.is_finished = finished;

      if (Object.keys(updates).length === 0) continue;
      updates.last_sync = new Date().toISOString();

      const { error } = await db.from("matches").update(updates).eq("id", match.id);
      if (error) throw error;
      matchesUpdated += 1;

      const scoreChanged =
        updates.home_score !== undefined || updates.away_score !== undefined;
      if (finished && (scoreChanged || !match.is_finished)) {
        const { error: rpcError } = await db.rpc("recalc_match_points", {
          p_match_id: match.id,
        });
        if (rpcError) throw rpcError;
        matchesFinished += 1;
      }
    }

    await db
      .from("sync_state")
      .update({ last_success: new Date().toISOString() })
      .eq("id", true);

    if (log) {
      await db
        .from("sync_log")
        .update({
          finished_at: new Date().toISOString(),
          ok: true,
          matches_updated: matchesUpdated,
          matches_finished: matchesFinished,
        })
        .eq("id", log.id);
    }

    return { ran: true, ok: true, matchesUpdated, matchesFinished };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (log) {
      await db
        .from("sync_log")
        .update({ finished_at: new Date().toISOString(), ok: false, message })
        .eq("id", log.id);
    }
    return { ran: true, ok: false, message };
  }
}

/**
 * Sync-on-read com debounce atômico: a UPDATE condicional em sync_state
 * garante que só uma instância dispara o sync por janela, mesmo com
 * várias requisições simultâneas.
 */
export async function maybeSync(): Promise<SyncResult> {
  const db = dbAdmin();
  const minutes = minIntervalMinutes();
  const threshold = new Date(Date.now() - minutes * 60_000).toISOString();

  const { data: claimed, error } = await db
    .from("sync_state")
    .update({ last_attempt: new Date().toISOString() })
    .eq("id", true)
    .or(`last_attempt.is.null,last_attempt.lt.${threshold}`)
    .select("id");

  if (error || !claimed || claimed.length === 0) {
    return { ran: false };
  }

  // Só vale a pena chamar a API se houver jogo não finalizado já iniciado
  // (ou com data ainda desconhecida, para completar o calendário).
  const { count } = await db
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("is_finished", false)
    .or(`match_date.is.null,match_date.lte.${new Date().toISOString()}`);

  if (!count) return { ran: false };

  return runSync("on-read");
}
