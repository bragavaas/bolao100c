// Mapa de-para das 48 seleções: nome em PT (como no JSON importado),
// aliases em EN (como a API-Football costuma retornar) e código de bandeira
// do flagcdn.com. Inglaterra/Escócia usam subdivisões do Reino Unido.

export interface TeamInfo {
  pt: string;
  aliases: string[];
  flag: string;
}

export const TEAMS: TeamInfo[] = [
  { pt: "Alemanha", aliases: ["Germany"], flag: "de" },
  { pt: "Argentina", aliases: ["Argentina"], flag: "ar" },
  { pt: "Argélia", aliases: ["Algeria"], flag: "dz" },
  { pt: "Arábia Saudita", aliases: ["Saudi Arabia"], flag: "sa" },
  { pt: "Austrália", aliases: ["Australia"], flag: "au" },
  { pt: "Brasil", aliases: ["Brazil"], flag: "br" },
  { pt: "Bélgica", aliases: ["Belgium"], flag: "be" },
  {
    pt: "Bósnia e Herzegovina",
    aliases: ["Bosnia and Herzegovina", "Bosnia & Herzegovina", "Bosnia-Herzegovina"],
    flag: "ba",
  },
  { pt: "Cabo Verde", aliases: ["Cape Verde", "Cabo Verde", "Cape Verde Islands"], flag: "cv" },
  { pt: "Canadá", aliases: ["Canada"], flag: "ca" },
  { pt: "Catar", aliases: ["Qatar"], flag: "qa" },
  { pt: "Colômbia", aliases: ["Colombia"], flag: "co" },
  { pt: "Coreia do Sul", aliases: ["South Korea", "Korea Republic"], flag: "kr" },
  {
    pt: "Costa do Marfim",
    aliases: ["Ivory Coast", "Cote d'Ivoire", "Côte d'Ivoire"],
    flag: "ci",
  },
  { pt: "Croácia", aliases: ["Croatia"], flag: "hr" },
  { pt: "Curaçao", aliases: ["Curacao", "Curaçao"], flag: "cw" },
  { pt: "Egito", aliases: ["Egypt"], flag: "eg" },
  { pt: "Equador", aliases: ["Ecuador"], flag: "ec" },
  { pt: "Escócia", aliases: ["Scotland"], flag: "gb-sct" },
  { pt: "Espanha", aliases: ["Spain"], flag: "es" },
  {
    pt: "Estados Unidos",
    aliases: ["USA", "United States", "United States of America"],
    flag: "us",
  },
  { pt: "França", aliases: ["France"], flag: "fr" },
  { pt: "Gana", aliases: ["Ghana"], flag: "gh" },
  { pt: "Haiti", aliases: ["Haiti"], flag: "ht" },
  { pt: "Inglaterra", aliases: ["England"], flag: "gb-eng" },
  { pt: "Iraque", aliases: ["Iraq"], flag: "iq" },
  { pt: "Irã", aliases: ["Iran", "IR Iran"], flag: "ir" },
  { pt: "Japão", aliases: ["Japan"], flag: "jp" },
  { pt: "Jordânia", aliases: ["Jordan"], flag: "jo" },
  { pt: "Marrocos", aliases: ["Morocco"], flag: "ma" },
  { pt: "México", aliases: ["Mexico"], flag: "mx" },
  { pt: "Noruega", aliases: ["Norway"], flag: "no" },
  { pt: "Nova Zelândia", aliases: ["New Zealand"], flag: "nz" },
  { pt: "Panamá", aliases: ["Panama"], flag: "pa" },
  { pt: "Paraguai", aliases: ["Paraguay"], flag: "py" },
  { pt: "Países Baixos", aliases: ["Netherlands", "Holland"], flag: "nl" },
  { pt: "Portugal", aliases: ["Portugal"], flag: "pt" },
  {
    pt: "RD Congo",
    aliases: ["DR Congo", "Congo DR", "Democratic Republic of Congo", "Congo-Kinshasa"],
    flag: "cd",
  },
  { pt: "Senegal", aliases: ["Senegal"], flag: "sn" },
  { pt: "Suécia", aliases: ["Sweden"], flag: "se" },
  { pt: "Suíça", aliases: ["Switzerland"], flag: "ch" },
  { pt: "Tchéquia", aliases: ["Czechia", "Czech Republic"], flag: "cz" },
  { pt: "Tunísia", aliases: ["Tunisia"], flag: "tn" },
  { pt: "Turquia", aliases: ["Turkey", "Türkiye", "Turkiye"], flag: "tr" },
  { pt: "Uruguai", aliases: ["Uruguay"], flag: "uy" },
  { pt: "Uzbequistão", aliases: ["Uzbekistan"], flag: "uz" },
  { pt: "África do Sul", aliases: ["South Africa"], flag: "za" },
  { pt: "Áustria", aliases: ["Austria"], flag: "at" },
];

/** Remove acentos, pontuação e caixa para comparação tolerante de nomes. */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const byNormalized = new Map<string, TeamInfo>();
for (const team of TEAMS) {
  byNormalized.set(normalizeName(team.pt), team);
  for (const alias of team.aliases) {
    byNormalized.set(normalizeName(alias), team);
  }
}

/** Resolve um nome (PT ou EN) para a seleção; undefined se desconhecido. */
export function resolveTeam(name: string): TeamInfo | undefined {
  return byNormalized.get(normalizeName(name));
}

export function flagUrl(code: string, width: 40 | 80 | 160 = 80): string {
  return `https://flagcdn.com/w${width}/${code}.png`;
}
