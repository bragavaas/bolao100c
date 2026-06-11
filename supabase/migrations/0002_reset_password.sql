-- Adiciona email aos usuários e cria tabela de tokens de redefinição de senha.

alter table public.users add column if not exists email citext unique;

create table public.reset_tokens (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.users (id) on delete cascade,
  token_hash   text        not null unique,
  expires_at   timestamptz not null default (now() + interval '1 hour'),
  used_at      timestamptz
);

create index reset_tokens_user_idx on public.reset_tokens (user_id);

-- reset_tokens: sem policy => sem acesso anon.
alter table public.reset_tokens enable row level security;
