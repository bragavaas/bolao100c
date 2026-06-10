const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
});

const timeFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
});

const weekdayFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "short",
});

/** "qui, 11/06 • 16:00" em horário de Brasília. */
export function formatKickoff(iso: string | null): string {
  if (!iso) return "Data a confirmar";
  const d = new Date(iso);
  const weekday = weekdayFmt.format(d).replace(".", "");
  return `${weekday}, ${dateFmt.format(d)} \u2022 ${timeFmt.format(d)}`;
}

export function hasStarted(iso: string | null): boolean {
  if (!iso) return false; // sem data confirmada o palpite fica aberto
  return new Date(iso).getTime() <= Date.now();
}
