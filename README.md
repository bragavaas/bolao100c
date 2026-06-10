# Bolão do 100c

Bolão da fase de grupos da Copa do Mundo FIFA 2026. Next.js 16 (App Router) + Supabase + Tailwind CSS v4, deploy na Vercel.

## Regras de pontuação

| Acerto | Pontos |
| --- | --- |
| Placar exato | 5 |
| Apenas o resultado (vitória/empate/derrota) | 2 |
| Errou | 0 |

A fonte de verdade do cálculo é o banco (`public.calc_points` + `recalc_match_points`), espelhada em `src/lib/points.ts`.

## Arquitetura

- **Auth própria**: tabela `users` + `credentials` (bcrypt), sessão em cookie httpOnly assinado com JWT (`jose`). Sem Supabase Auth. O guard de rotas fica em `src/proxy.ts` (convenção do Next 16, ex-middleware).
- **Banco**: acesso sempre pelo servidor com a secret key (`sb_secret_...`). O cliente do navegador (publishable key, `sb_publishable_...`) é usado apenas para Realtime no ranking (RLS permite SELECT público só em `users` e `matches`; `credentials` e `predictions` ficam fechadas).
- **Resultados**: API-Football (`GET /fixtures?league=1&season=2026`). O sync valida o league id via `GET /leagues?id=1` na primeira execução antes de confiar nele. Pareamento fixture/jogo por dupla de seleções (mapa PT/EN em `src/lib/teams.ts`) com desempate por data. O sync também preenche datas/estádios que estiverem nulos no banco.
- **Sincronização**: sync-on-read com debounce atômico em `sync_state` (uma UPDATE condicional garante no máximo um sync por janela de `SYNC_MIN_INTERVAL_MINUTES`, disparado via `after()` ao carregar a home) + retaguarda diária via cron da Vercel (`vercel.json`, plano Hobby só permite cron diário). Fallback manual no `/admin`.
- **Palpites**: upsert por `(user_id, match_id)`; o servidor rejeita palpite se `match_date <= now()` ou partida encerrada. Jogos sem data confirmada permanecem abertos.

## Setup

1. **Supabase**: crie um projeto e rode `supabase/migrations/0001_init.sql` no SQL Editor.
2. **Variáveis**: copie `.env.example` para `.env.local` e preencha. `AUTH_SECRET`: `openssl rand -base64 32`.
3. **Dependências**: `npm install`
4. **Jogos**: `npm run seed` (importa `data/copa2026.json`, idempotente).
5. **Primeiro admin**: `node scripts/create-user.mjs andre suaSenha "André" admin`
   (demais participantes se cadastram em `/cadastro` com o `BOLAO_INVITE_CODE`).
6. **Dev**: `npm run dev`

Para carregar o `.env.local` nos scripts: `set -a; source .env.local; set +a` antes de rodá-los, ou use `npx dotenv-cli`.

## Deploy (Vercel)

1. Importe o repositório na Vercel.
2. Cadastre todas as variáveis do `.env.example` em Project Settings → Environment Variables (inclua `CRON_SECRET`; a Vercel envia `Authorization: Bearer $CRON_SECRET` nas invocações do cron).
3. O `vercel.json` registra o cron diário de retaguarda em `/api/sync` (06:00 UTC = 03:00 de Brasília).

## Rotas

| Rota | Descrição |
| --- | --- |
| `/` | Home: perfil, estatísticas, filtro de rodadas, cards de palpite |
| `/ranking` | Ranking com atualização em tempo real (Supabase Realtime) |
| `/palpites` | Palpites do usuário com pontos por jogo |
| `/admin` | Sync manual, reprocessar pontuação, placar manual, participantes |
| `/login`, `/cadastro` | Autenticação (cadastro exige código de convite) |
| `GET /api/sync` | Sync (cron com Bearer `CRON_SECRET`, ou admin logado) |

## Observações

- `next/image` está liberado para `flagcdn.com`; as bandeiras usam `unoptimized` para não consumir otimização de imagem da Vercel com PNGs de 80px.
- O JSON importado usa horário de Brasília (UTC-3, sem horário de verão); o seed converte para UTC.
- shadcn/ui: os componentes atuais são primitivas próprias em Tailwind no mesmo estilo. Se quiser a biblioteca completa: `npx shadcn@latest init` e migre gradualmente.
