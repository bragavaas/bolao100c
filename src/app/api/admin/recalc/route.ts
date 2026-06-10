import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/db";
import { getSession } from "@/lib/auth";

/** Reprocessa a pontuação de todos os palpites e o ranking. */
export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const { error } = await dbAdmin().rpc("recalc_all_points");
  if (error) {
    return NextResponse.json({ error: "Falha ao reprocessar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
