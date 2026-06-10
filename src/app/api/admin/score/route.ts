import { NextResponse } from "next/server";
import { z } from "zod";
import { dbAdmin } from "@/lib/db";
import { getSession } from "@/lib/auth";

const schema = z.object({
  matchId: z.string().uuid(),
  homeScore: z.number().int().min(0).max(99),
  awayScore: z.number().int().min(0).max(99),
  finish: z.boolean(),
});

/**
 * Lançamento manual de placar (fallback quando a API estiver indisponível
 * ou o admin quiser sobrescrever o resultado).
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const db = dbAdmin();
  const { error } = await db
    .from("matches")
    .update({
      home_score: parsed.data.homeScore,
      away_score: parsed.data.awayScore,
      is_finished: parsed.data.finish,
      api_source: "manual",
      last_sync: new Date().toISOString(),
    })
    .eq("id", parsed.data.matchId);

  if (error) {
    return NextResponse.json({ error: "Não foi possível salvar." }, { status: 500 });
  }

  const { error: rpcError } = await db.rpc("recalc_match_points", {
    p_match_id: parsed.data.matchId,
  });
  if (rpcError) {
    return NextResponse.json({ error: "Placar salvo, mas o recálculo falhou." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
