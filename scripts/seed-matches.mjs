// Importa os jogos da fase de grupos (data/copa2026.json) na tabela matches.
// Idempotente: usa upsert por local_key. Rode com: npm run seed

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY (ex.: source .env.local)");
  process.exit(1);
}

// Mapa de bandeiras (mesmo conteúdo de src/lib/teams.ts)
const FLAGS = {
  "Alemanha": "de", "Argentina": "ar", "Argélia": "dz", "Arábia Saudita": "sa",
  "Austrália": "au", "Brasil": "br", "Bélgica": "be", "Bósnia e Herzegovina": "ba",
  "Cabo Verde": "cv", "Canadá": "ca", "Catar": "qa", "Colômbia": "co",
  "Coreia do Sul": "kr", "Costa do Marfim": "ci", "Croácia": "hr", "Curaçao": "cw",
  "Egito": "eg", "Equador": "ec", "Escócia": "gb-sct", "Espanha": "es",
  "Estados Unidos": "us", "França": "fr", "Gana": "gh", "Haiti": "ht",
  "Inglaterra": "gb-eng", "Iraque": "iq", "Irã": "ir", "Japão": "jp",
  "Jordânia": "jo", "Marrocos": "ma", "México": "mx", "Noruega": "no",
  "Nova Zelândia": "nz", "Panamá": "pa", "Paraguai": "py", "Países Baixos": "nl",
  "Portugal": "pt", "RD Congo": "cd", "Senegal": "sn", "Suécia": "se",
  "Suíça": "ch", "Tchéquia": "cz", "Tunísia": "tn", "Turquia": "tr",
  "Uruguai": "uy", "Uzbequistão": "uz", "África do Sul": "za", "Áustria": "at",
};

const file = JSON.parse(readFileSync(resolve("data/copa2026.json"), "utf8"));

// kickoffBrasilia está em America/Sao_Paulo (UTC-3, sem horário de verão).
function toUtcIso(date, time) {
  if (!date || !time) return null;
  return new Date(`${date}T${time}:00-03:00`).toISOString();
}

const rows = file.matches.map((m) => {
  const homeFlag = FLAGS[m.homeTeam];
  const awayFlag = FLAGS[m.awayTeam];
  if (!homeFlag || !awayFlag) {
    throw new Error(`Bandeira não mapeada para: ${m.homeTeam} ou ${m.awayTeam}`);
  }
  return {
    local_key: m.id,
    group_name: m.group,
    round: m.matchday,
    match_date: toUtcIso(m.date, m.kickoffBrasilia),
    city: m.city,
    stadium: m.stadium,
    home_team: m.homeTeam,
    away_team: m.awayTeam,
    home_flag: homeFlag,
    away_flag: awayFlag,
    home_score: m.homeScore,
    away_score: m.awayScore,
    is_finished: m.status === "finished",
    api_source: m.apiMatchId ? "api-football" : null,
    external_match_id: m.apiMatchId ? String(m.apiMatchId) : null,
  };
});

const db = createClient(url, key, { auth: { persistSession: false } });
const { error } = await db.from("matches").upsert(rows, { onConflict: "local_key" });
if (error) {
  console.error("Falha no seed:", error.message);
  process.exit(1);
}
console.log(`OK: ${rows.length} jogos importados/atualizados.`);
