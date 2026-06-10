// Cliente da API-Football (https://www.api-football.com/) — somente servidor.
// Endpoint principal: GET /fixtures?league={id}&season={ano}
// Detalhe por partida: GET /fixtures?ids=a-b-c (máx. 20 ids por chamada).

const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);
const LIVE_STATUSES = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT"]);

export interface ApiFixture {
  fixtureId: number;
  dateUtc: string; // ISO
  statusShort: string;
  venueName: string | null;
  venueCity: string | null;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number | null;
  awayGoals: number | null;
  round: string;
}

interface RawResponse {
  errors: unknown;
  results: number;
  response: unknown[];
}

function config() {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("Defina API_FOOTBALL_KEY no .env.local");
  return {
    key,
    baseUrl: process.env.API_FOOTBALL_BASE_URL ?? "https://v3.football.api-sports.io",
    leagueId: Number(process.env.API_FOOTBALL_LEAGUE_ID ?? "1"),
    season: Number(process.env.API_FOOTBALL_SEASON ?? "2026"),
  };
}

async function apiGet(path: string): Promise<RawResponse> {
  const { key, baseUrl } = config();
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { "x-apisports-key": key },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`API-Football ${path} respondeu ${res.status}`);
  }
  const body = (await res.json()) as RawResponse;
  const errors = body.errors;
  if (errors && (Array.isArray(errors) ? errors.length > 0 : Object.keys(errors).length > 0)) {
    throw new Error(`API-Football retornou erro: ${JSON.stringify(errors)}`);
  }
  return body;
}

/**
 * Confirma que o league id configurado é mesmo a Copa do Mundo antes de
 * usar os dados (ids variam entre contas/planos; verificar via /leagues).
 */
export async function verifyWorldCupLeague(): Promise<void> {
  const { leagueId } = config();
  const body = await apiGet(`/leagues?id=${leagueId}`);
  const entry = body.response[0] as { league?: { name?: string } } | undefined;
  const name = entry?.league?.name ?? "";
  if (!/world cup/i.test(name)) {
    throw new Error(
      `league=${leagueId} retornou "${name || "nada"}" — confirme o id da Copa do Mundo no dashboard da API-Football`
    );
  }
}

function parseFixture(raw: unknown): ApiFixture | null {
  const item = raw as {
    fixture?: {
      id?: number;
      date?: string;
      status?: { short?: string };
      venue?: { name?: string | null; city?: string | null };
    };
    league?: { round?: string };
    teams?: { home?: { name?: string }; away?: { name?: string } };
    goals?: { home?: number | null; away?: number | null };
  };
  if (!item.fixture?.id || !item.teams?.home?.name || !item.teams?.away?.name) return null;
  return {
    fixtureId: item.fixture.id,
    dateUtc: item.fixture.date ?? "",
    statusShort: item.fixture.status?.short ?? "NS",
    venueName: item.fixture.venue?.name ?? null,
    venueCity: item.fixture.venue?.city ?? null,
    homeTeam: item.teams.home.name,
    awayTeam: item.teams.away.name,
    homeGoals: item.goals?.home ?? null,
    awayGoals: item.goals?.away ?? null,
    round: item.league?.round ?? "",
  };
}

/** Todas as partidas da Copa na temporada configurada. */
export async function fetchSeasonFixtures(): Promise<ApiFixture[]> {
  const { leagueId, season } = config();
  const body = await apiGet(`/fixtures?league=${leagueId}&season=${season}`);
  return body.response
    .map(parseFixture)
    .filter((f): f is ApiFixture => f !== null);
}

/** Partidas específicas por id, em lotes de no máximo 20 por chamada. */
export async function fetchFixturesByIds(ids: number[]): Promise<ApiFixture[]> {
  const out: ApiFixture[] = [];
  for (let i = 0; i < ids.length; i += 20) {
    const batch = ids.slice(i, i + 20);
    const body = await apiGet(`/fixtures?ids=${batch.join("-")}`);
    out.push(
      ...body.response.map(parseFixture).filter((f): f is ApiFixture => f !== null)
    );
  }
  return out;
}

export function isFinishedStatus(statusShort: string): boolean {
  return FINISHED_STATUSES.has(statusShort);
}

export function isLiveStatus(statusShort: string): boolean {
  return LIVE_STATUSES.has(statusShort);
}
