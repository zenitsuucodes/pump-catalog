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

## Wallet auto-tracker

Watches a Solana wallet and **auto-adds winning Pump.fun tokens** to your catalog when realized profit is at least `$100` (configurable).

### Flow

1. **Helius webhook** detects wallet buys/sells in real time
2. On **sell**, profit is checked via **GMGN** (if configured) or internal cost-basis tracking
3. If profit ≥ threshold → fetch Pump.fun metadata + tweet text → save to Redis
4. **Cron backup** scans every 5 minutes if a webhook is missed

### Vercel env vars

| Variable | Required | Description |
|---|---|---|
| `HELIUS_API_KEY` | Yes | Helius API key for webhooks + history |
| `HELIUS_WEBHOOK_SECRET` | Yes | Auth header Helius sends to your webhook |
| `CRON_SECRET` | Yes | Protects cron/setup routes |
| `TRACKED_WALLET` | No | Default: `4mugTfk3Aw5X4rNTw8w3fgdAtKo76FVM4a8c9PNS1zSh` |
| `MIN_PROFIT_USD` | No | Default: `100` |
| `GMGN_API_KEY` | No | Improves per-token PnL accuracy |

### One-time webhook setup (after deploy)

```bash
curl -X POST https://YOUR-APP.vercel.app/api/tracker/setup-webhook \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

Or create the webhook manually in the [Helius dashboard](https://dev.helius.xyz/dashboard/webhooks) pointing to:

```
https://YOUR-APP.vercel.app/api/webhooks/helius
```

### API routes

| Path | What it does |
|---|---|
| `/api/webhooks/helius` | Receives Helius swap events |
| `/api/cron/scan-wallet` | Backup wallet scan (Vercel cron) |
| `/api/tracker/status` | Tracker health + stats |
| `/api/tracker/setup-webhook` | Create Helius webhook via API |

## Features

- **Add CA** — Fetches token data from Pump.fun
- **Auto-track wallet** — Adds profitable trades automatically
- **Token cards** — Dark-themed dashboard cards
- **Tweet text** — Editable box for the original tweet
- **My thoughts** — Separate notes section
- **Auto-save** — Saves as you type
- **Refresh** — Update market cap from Pump.fun
