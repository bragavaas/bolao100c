import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash, randomBytes } from "crypto";
import { Resend } from "resend";
import { dbAdmin } from "@/lib/db";

const schema = z.object({
  email: z.string().trim().email({ message: "E-mail inválido." }),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
  }

  const db = dbAdmin();
  const { data: user } = await db
    .from("users")
    .select("id, display_name")
    .eq("email", parsed.data.email)
    .maybeSingle();

  // Always return ok to prevent user enumeration
  if (!user) return NextResponse.json({ ok: true });

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  // Invalidate any existing unused tokens for this user
  await db.from("reset_tokens").delete().eq("user_id", user.id).is("used_at", null);

  await db.from("reset_tokens").insert({ user_id: user.id, token_hash: tokenHash });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/redefinir-senha?token=${rawToken}`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Bolão do 100c <noreply@bolao100c.com>",
    to: parsed.data.email,
    subject: "Redefinir senha — Bolão do 100c",
    html: `
      <p>Olá, ${user.display_name}!</p>
      <p>Clique no link abaixo para redefinir sua senha. O link expira em <strong>1 hora</strong>.</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Se você não solicitou a redefinição, pode ignorar este e-mail.</p>
    `,
  });

  return NextResponse.json({ ok: true });
}
