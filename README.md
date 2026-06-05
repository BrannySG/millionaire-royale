# Millionaire Royale

Millionaire Royale is a small browser multiplayer trivia battle royale. Friends join a room, lock in A/B/C/D answers, watch the reveal, and survive until one winner takes a fictional `$1,000,000`.

## Stack

- React + TypeScript + Tailwind via Vite for the frontend.
- Cloudflare Worker serving static assets, API routes, and WebSocket upgrades.
- One SQLite-backed Durable Object `GameRoom` per room for live authoritative state.
- D1 for persistent questions, game results, and event records.
- pnpm workspaces for `apps/web`, `apps/worker`, and `packages/shared`.

## Local Setup

```powershell
pnpm install
pnpm questions:validate
pnpm questions:seed-sql
pnpm db:migrate:local
pnpm build:web
npx wrangler dev --port 8787
```

Open `http://127.0.0.1:8787`.

Static UI preview is available at:

```text
http://127.0.0.1:8787/?preview
```

## Useful Commands

```powershell
pnpm typecheck
pnpm test
pnpm build
node scripts/smoke-ws.mjs
```

`scripts/smoke-ws.mjs` starts a two-player WebSocket game against local `wrangler dev`.

## Cloudflare Deployment

1. Authenticate Wrangler:

   ```powershell
   npx wrangler login
   ```

2. Create a D1 database:

   ```powershell
   npx wrangler d1 create millionaire-royale
   ```

3. Replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.jsonc` with the returned database id.

4. Apply remote migrations:

   ```powershell
   pnpm db:migrate:remote
   ```

5. Deploy:

   ```powershell
   pnpm deploy
   ```

The app is configured as a single Worker with static assets, Durable Objects, WebSockets, and D1 bindings.

## GitHub

Remote repo: https://github.com/BrannySG/millionaire-royale.git

If this local directory is not initialized yet:

```powershell
git init
git remote add origin https://github.com/BrannySG/millionaire-royale.git
```

