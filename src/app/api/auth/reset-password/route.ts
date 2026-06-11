import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";
import { dbAdmin } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

const schema = z.object({
  token: z.string().length(64),
  password: z.string().min(6).max(72),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const db = dbAdmin();

  const { data: tokenRow } = await db
    .from("reset_tokens")
    .select("id, user_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!tokenRow || tokenRow.used_at || new Date(tokenRow.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "Link inválido ou expirado. Solicite um novo." },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await db
    .from("credentials")
    .update({ password_hash: passwordHash })
    .eq("user_id", tokenRow.user_id);

  await db
    .from("reset_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  return NextResponse.json({ ok: true });
}
