# Foxloop Game API (GCloud VM)

Runs on the GCloud VM (port **8001**). Handles prompt → plan → Cursor SDK → Firestore drafts → preview → publish (GitHub push).

The Next.js site in `forge web/foxloop` is UI only (Netlify). It calls this API.

## Layout

```
gcloud/game-api/
  src/
    index.ts              # HTTP server
    routes/               # /games, /preview, /publish
    services/
      cursor.ts           # @cursor/sdk (planner + builder)
      firestore.ts        # drafts, files, chat
      git.ts              # publish → materialize repo + push
      preview.ts          # build/serve draft preview
    templates/            # GameShell, page.tsx snippets for publish
  .env.example
```

## Generated games (publish target)

On publish, files are written into the main web app (same format as Arrow Out / Eat Smaller Fish):

```
forge web/foxloop/src/games/{slug}/
forge web/foxloop/src/components/games/{Name}Game.tsx
forge web/foxloop/src/app/games/{slug}/page.tsx
```

Drafts live in **Firestore** until publish. Published catalog is read from Firestore; showcase games stay in `src/data/games.ts`.

## Env (VM)

See `.env.example`. Never commit secrets.

## Run locally

```bash
cd gcloud/game-api
npm install
cp .env.example .env
# Set CURSOR_API_KEY (required for generation)
npm run dev
```

```bash
cd "forge web/foxloop"
cp .env.local.example .env.local
# NEXT_PUBLIC_GAME_API_URL=http://localhost:8001
npm run dev
```

## API routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service status |
| POST | `/games` | `{ prompt }` → plan + generate draft |
| GET | `/games/:id` | Draft/published metadata |
| GET | `/games/:id/chat` | Chat history |
| POST | `/games/:id/edit` | `{ prompt }` pre-publish edit |
| GET | `/games/:id/preview` | HTML canvas preview |
| POST | `/games/:id/publish` | Materialize to repo + git push |
| DELETE | `/games/:id` | Delete draft |
| GET | `/games/published` | Catalog for Discover Games |

## Storage

- **Without `GOOGLE_CLOUD_PROJECT`:** local `.data/` JSON store (dev)
- **With Firestore:** set `GOOGLE_CLOUD_PROJECT` on the VM

## Deploy

Clone this repo on the GCloud VM, install Node 20+, set env vars, run with systemd or pm2 on port 8001.
