import { NextResponse } from "next/server";
import { z } from "zod";
import { dbAdmin } from "@/lib/db";
import {
  createSessionToken,
  sessionCookieOptions,
  verifyPassword,
  SESSION_COOKIE,
} from "@/lib/auth";

const schema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Informe usuário e senha." }, { status: 400 });
  }

  const db = dbAdmin();
  const { data: user } = await db
    .from("users")
    .select("id, username, display_name, role")
    .eq("username", parsed.data.username)
    .maybeSingle();

  const { data: cred } = user
    ? await db
        .from("credentials")
        .select("password_hash")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const valid =
    user && cred ? await verifyPassword(parsed.data.password, cred.password_hash) : false;

  if (!user || !valid) {
    return NextResponse.json({ error: "Usuário ou senha incorretos." }, { status: 401 });
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
