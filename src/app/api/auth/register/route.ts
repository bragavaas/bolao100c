import { NextResponse } from "next/server";
import { z } from "zod";
import { dbAdmin } from "@/lib/db";
import {
  createSessionToken,
  hashPassword,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";

const schema = z.object({
  inviteCode: z.string().min(1),
  displayName: z.string().trim().min(2).max(60),
  username: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_.]+$/, "Use apenas letras, números, ponto e underline."),
  email: z.string().trim().email({ message: "E-mail inválido." }).max(254),
  password: z.string().min(6).max(72),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const expected = process.env.BOLAO_INVITE_CODE;
  if (!expected || parsed.data.inviteCode !== expected) {
    return NextResponse.json({ error: "Código de convite inválido." }, { status: 403 });
  }

  const db = dbAdmin();
  const { data: user, error } = await db
    .from("users")
    .insert({
      username: parsed.data.username,
      display_name: parsed.data.displayName,
      email: parsed.data.email,
    })
    .select("id, username, display_name, role")
    .single();

  if (error || !user) {
    const duplicated = error?.code === "23505";
    return NextResponse.json(
      { error: duplicated ? "Esse username já está em uso." : "Não foi possível criar a conta." },
      { status: duplicated ? 409 : 500 }
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const { error: credError } = await db
    .from("credentials")
    .insert({ user_id: user.id, password_hash: passwordHash });

  if (credError) {
    await db.from("users").delete().eq("id", user.id);
    return NextResponse.json({ error: "Não foi possível criar a conta." }, { status: 500 });
  }

  const token = await createSessionToken({
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    role: user.role,
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
