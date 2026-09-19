# Pump Catalog

A React app to catalog Pump.fun token launches. Paste a Solana contract address to pull image, metadata, and market cap — then add the tweet text and your thoughts on each card.

## Run locally

```bash
npm install
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:8787
- Local data saves to `server/data/catalog.json` (no KV needed)

## Deploy to Vercel (frontend + API + storage)

Everything runs in one Vercel project. The API uses **Upstash Redis** for persistent storage.

### Step 1 — Push to GitHub

Repo: https://github.com/zenitsuucodes/pump-catalog

### Step 2 — Deploy the project

1. Go to [vercel.com/new](https://vercel.com/new) and import `zenitsuucodes/pump-catalog`
2. Framework: **Vite** (auto-detected)
3. Click **Deploy**

### Step 3 — Add Redis storage

1. Open your project on Vercel → **Storage** tab
2. Click **Create Database** → choose **Upstash Redis**
3. Name it (e.g. `pump-catalog-redis`) and connect it to this project
4. Vercel auto-injects `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
5. **Redeploy** (Deployments → ⋯ → Redeploy)

That's it. Frontend, API routes, and database are all on Vercel.

### How it works

| Path | What it does |
|---|---|
| `/` | React app (static) |
| `/api/coins` | List / add tokens |
| `/api/coins/[id]` | Update / delete |
| `/api/coins/[id]/refresh` | Refresh Pump.fun metadata |
| `/api/lookup/[mint]` | Preview token before adding |

## Features

- **Add CA** — Fetches token data from Pump.fun
- **Token cards** — Dark-themed dashboard cards
- **Tweet text** — Editable box for the original tweet
- **My thoughts** — Separate notes section
- **Auto-save** — Saves as you type
- **Refresh** — Update market cap from Pump.fun
