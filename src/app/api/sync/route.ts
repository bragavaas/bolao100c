import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { runSync } from "@/lib/sync";

/**
 * Retaguarda diária (cron da Vercel, Authorization: Bearer CRON_SECRET)
 * e botão "Sincronizar agora" do admin.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const fromCron = Boolean(cronSecret) && auth === `Bearer ${cronSecret}`;

  if (!fromCron) {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    }
  }

  const result = await runSync(fromCron ? "cron" : "manual");
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
