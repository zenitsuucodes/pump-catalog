# Pump Catalog

A React app to catalog Pump.fun token launches. Paste a Solana contract address to pull image, metadata, and market cap — then add the tweet text and your thoughts on each card.

## Run locally

```bash
npm install
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:8787

## Features

- **Add CA** — Fetches token data from Pump.fun (name, symbol, image, market cap, social links)
- **Token cards** — Dark-themed cards styled like a trading dashboard
- **Tweet text** — Editable box on each card for the original tweet
- **My thoughts** — Separate notes section below the tweet
- **Auto-save** — Tweet and thoughts save automatically as you type
- **Refresh** — Update market cap and metadata from Pump.fun
- **Links** — Quick access to Pump.fun, GMGN, X/Twitter, and website

## Deploy

This app has two parts: a **React frontend** (Vercel) and an **Express + SQLite API** (Render/Railway). Vercel cannot run the SQLite backend persistently, so host the API separately.

### 1. Push to GitHub

Already set up at `zenitsuucodes/pump-catalog`.

### 2. Deploy the API (Render — free tier)

1. Go to [render.com](https://render.com) and sign in with GitHub.
2. **New → Blueprint** (or **Web Service**) and connect `zenitsuucodes/pump-catalog`.
3. Use these settings:
   - **Root directory:** (leave blank)
   - **Build command:** `npm install`
   - **Start command:** `node server/index.js`
   - **Instance type:** Free
4. Add environment variable:
   - `ALLOWED_ORIGINS` = `https://YOUR-VERCEL-APP.vercel.app` (add after Vercel deploy)
5. Deploy and copy your API URL (e.g. `https://pump-catalog-api.onrender.com`).

### 3. Deploy the frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. **Add New → Project** → import `zenitsuucodes/pump-catalog`.
3. Framework preset: **Vite** (auto-detected).
4. Add environment variable:
   - `VITE_API_URL` = your Render API URL (no trailing slash)
5. Click **Deploy**.

### 4. Finish CORS

Go back to Render and update `ALLOWED_ORIGINS` with your live Vercel URL, then redeploy the API.

### Environment variables

| Variable | Where | Example |
|---|---|---|
| `VITE_API_URL` | Vercel | `https://pump-catalog-api.onrender.com` |
| `ALLOWED_ORIGINS` | Render | `https://pump-catalog.vercel.app` |
| `PORT` | Render | set automatically |
