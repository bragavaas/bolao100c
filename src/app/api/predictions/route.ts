import { NextResponse } from "next/server";
import { z } from "zod";
import { dbAdmin } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasStarted } from "@/lib/format";

const schema = z.object({
  matchId: z.string().uuid(),
  predictedHome: z.number().int().min(0).max(99),
  predictedAway: z.number().int().min(0).max(99),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Palpite inválido." }, { status: 400 });
  }

  const db = dbAdmin();
  const { data: match } = await db
    .from("matches")
    .select("id, match_date, is_finished")
    .eq("id", parsed.data.matchId)
    .maybeSingle();

  if (!match) {
    return NextResponse.json({ error: "Jogo não encontrado." }, { status: 404 });
  }
  if (match.is_finished || hasStarted(match.match_date)) {
    return NextResponse.json(
      { error: "Palpites encerrados: a partida já começou." },
      { status: 409 }
    );
  }

  const { error } = await db.from("predictions").upsert(
    {
      user_id: session.id,
      match_id: match.id,
      predicted_home: parsed.data.predictedHome,
      predicted_away: parsed.data.predictedAway,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,match_id" }
  );

  if (error) {
    return NextResponse.json({ error: "Não foi possível salvar o palpite." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
