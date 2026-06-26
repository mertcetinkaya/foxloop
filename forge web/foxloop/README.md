# foxloop

A demo landing site inspired by [Playabl](https://playabl.ai/en) — turn gaming ideas into reality with AI.

## Features

- **Prompt area** — send button activates when you type; clicking it opens the signup modal
- **Signup modal** — Google, GitHub, and email options show a waitlist message (no real auth yet)
- **Discover Games** — showcase section with Penalty Fever, Eat the Smaller Fish, and Arrow Out
- **All Games page** — `/all-games` lists all three games

## Tech stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript |
| Framework | Next.js 15 (App Router) |
| UI | React 19 |
| Styling | Tailwind CSS 3 |
| Icons | Lucide React |
| Backend | None (demo — waitlist is UI-only) |

## Prerequisites

- **Node.js 18+** (Node 20+ recommended for latest Next.js)

## Preview on localhost

```bash
cd foxloop
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build |
| `npm run start` | Run production build locally |

## Connect your domain (after development)

1. Push this repo to GitHub.
2. Import the project on [Vercel](https://vercel.com) (recommended for Next.js).
3. In Vercel → **Settings → Domains**, add your domain.
4. At your DNS provider, set:
   - **A record** `@` → `76.76.21.21`, or
   - **CNAME** `www` → `cname.vercel-dns.com`
5. Wait for SSL provisioning (usually automatic).

## Project structure

```
foxloop/                          # git repo root
  gcloud/game-api/                # GCloud VM API (:8001) — Cursor SDK, Firestore, publish
  forge web/foxloop/              # this app — Netlify UI
    src/
      app/                        # pages + /games/{slug}
      components/                 # Header, PromptArea, GenerationModal, GameCard, …
      games/                      # lite game engines (hand-made + published AI games)
      lib/game-api.ts             # fetch helper → gcloud/game-api
      data/games.ts               # showcase lite games (static)
    public/games/                 # cover images
```

Set `NEXT_PUBLIC_GAME_API_URL` to the GCloud API (e.g. `http://34.x.x.x:8001` or your domain).

**Netlify (foxloop.ai):** also set `GAME_API_INTERNAL_URL` to the same VM URL. The browser uses same-origin `/api/game/*` (HTTPS proxy); SSR and rewrites use `GAME_API_INTERNAL_URL` to reach the VM. On the VM, set `CORS_ORIGINS=http://localhost:3000,https://foxloop.ai` in game-api `.env`.

## Adding a real waitlist later

Add a Next.js API route (`POST /api/waitlist`) and a database (e.g. Supabase) to store emails before showing the same waitlist confirmation.
