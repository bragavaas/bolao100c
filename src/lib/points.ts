/**
 * Regra do bolão (espelha public.calc_points no banco):
 * 5 — placar exato; 2 — acertou o resultado; 0 — errou.
 */
export function calculatePoints(
  prediction: { home: number; away: number },
  actual: { home: number | null; away: number | null }
): number {
  if (actual.home === null || actual.away === null) return 0;
  if (prediction.home === actual.home && prediction.away === actual.away) return 5;
  if (Math.sign(prediction.home - prediction.away) === Math.sign(actual.home - actual.away)) {
    return 2;
  }
  return 0;
}
