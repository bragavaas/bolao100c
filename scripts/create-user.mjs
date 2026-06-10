// Cria um usuário direto no banco (útil para o primeiro admin).
// Uso: node scripts/create-user.mjs <username> <senha> "<Nome de Exibição>" [admin]

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const [username, password, displayName, roleFlag] = process.argv.slice(2);
if (!username || !password || !displayName) {
  console.error('Uso: node scripts/create-user.mjs <username> <senha> "<Nome>" [admin]');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const role = roleFlag === "admin" ? "admin" : "player";

const { data: user, error } = await db
  .from("users")
  .insert({ username, display_name: displayName, role })
  .select("id")
  .single();
if (error) {
  console.error("Falha:", error.message);
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 10);
const { error: credError } = await db
  .from("credentials")
  .insert({ user_id: user.id, password_hash: passwordHash });
if (credError) {
  await db.from("users").delete().eq("id", user.id);
  console.error("Falha ao salvar credenciais:", credError.message);
  process.exit(1);
}
console.log(`OK: ${username} (${role}) criado.`);
