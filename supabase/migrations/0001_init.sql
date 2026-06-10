-- Bolão do 100c — schema inicial
-- Rodar no SQL Editor do Supabase ou via supabase db push.

create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table public.users (
  id uuid primary key default gen_random_uuid(),
  username citext unique not null,
  display_name text not null,
  role text not null default 'player' check (role in ('player', 'admin')),
  total_points integer not null default 0,
  created_at timestamptz not null default now()
);

-- Hash de senha separado para que `users` possa ser lida publicamente
-- (ranking + realtime) sem expor credenciais.
create table public.credentials (
  user_id uuid primary key references public.users (id) on delete cascade,
  password_hash text not null
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  local_key text unique, -- ex.: wc2026-gs-001 (id do JSON de importação)
  group_name text not null,
  round integer not null check (round between 1 and 3),
  match_date timestamptz, -- nulo enquanto a FIFA/API não confirmar
  city text,
  stadium text,
  home_team text not null,
  away_team text not null,
  home_flag text,
  away_flag text,
  home_score integer,
  away_score integer,
  external_match_id text unique,
  api_source text,
  last_sync timestamptz,
  is_finished boolean not null default false,
  created_at timestamptz not null default now()
);

create index matches_round_idx on public.matches (round, match_date);
create index matches_unfinished_idx on public.matches (is_finished) where not is_finished;

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  predicted_home integer not null check (predicted_home between 0 and 99),
  predicted_away integer not null check (predicted_away between 0 and 99),
  points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, match_id)
);

create index predictions_match_idx on public.predictions (match_id);
create index predictions_user_idx on public.predictions (user_id);

-- Linha única de controle do sync-on-read (debounce entre instâncias).
create table public.sync_state (
  id boolean primary key default true check (id),
  last_attempt timestamptz,
  last_success timestamptz,
  league_verified boolean not null default false
);
insert into public.sync_state (id) values (true);

create table public.sync_log (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  source text not null default 'api-football',
  trigger text not null, -- 'on-read' | 'cron' | 'manual'
  ok boolean,
  message text,
  matches_updated integer not null default 0,
  matches_finished integer not null default 0
);

-- ---------------------------------------------------------------------------
-- Pontuação (fonte de verdade no banco)
-- ---------------------------------------------------------------------------

create or replace function public.calc_points(
  p_home integer, p_away integer,
  a_home integer, a_away integer
) returns integer
language sql immutable as $$
  select case
    when a_home is null or a_away is null then 0
    when p_home = a_home and p_away = a_away then 5
    when sign(p_home - p_away) = sign(a_home - a_away) then 2
    else 0
  end;
$$;

create or replace function public.recalc_match_points(p_match_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update predictions p
  set points = calc_points(p.predicted_home, p.predicted_away, m.home_score, m.away_score),
      updated_at = now()
  from matches m
  where m.id = p_match_id
    and p.match_id = p_match_id
    and m.is_finished;

  update users u
  set total_points = coalesce(t.sum_points, 0)
  from (
    select p.user_id, sum(p.points) as sum_points
    from predictions p
    where p.user_id in (select user_id from predictions where match_id = p_match_id)
    group by p.user_id
  ) t
  where u.id = t.user_id;
end;
$$;

create or replace function public.recalc_all_points()
returns void
language plpgsql security definer set search_path = public as $$
begin
  update predictions p
  set points = calc_points(p.predicted_home, p.predicted_away, m.home_score, m.away_score),
      updated_at = now()
  from matches m
  where p.match_id = m.id and m.is_finished;

  update predictions p
  set points = 0, updated_at = now()
  from matches m
  where p.match_id = m.id and not m.is_finished and p.points <> 0;

  update users u
  set total_points = coalesce(t.sum_points, 0)
  from (
    select user_id, sum(points) as sum_points
    from predictions
    group by user_id
  ) t
  where u.id = t.user_id;

  update users
  set total_points = 0
  where id not in (select distinct user_id from predictions)
    and total_points <> 0;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- O app acessa o banco pelo servidor com a service role key (auth própria).
-- As policies abaixo existem só para o que o cliente anon precisa ler
-- (ranking em realtime e lista de jogos).
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.credentials enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;
alter table public.sync_state enable row level security;
alter table public.sync_log enable row level security;

create policy "ranking publico" on public.users
  for select to anon, authenticated using (true);

create policy "jogos publicos" on public.matches
  for select to anon, authenticated using (true);

-- credentials, predictions, sync_*: sem policies => sem acesso anon.

-- ---------------------------------------------------------------------------
-- Realtime (ranking e placares ao vivo)
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.users;
alter publication supabase_realtime add table public.matches;
