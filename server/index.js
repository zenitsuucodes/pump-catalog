import express from 'express'
import cors from 'cors'
import db from './db.js'

const app = express()
const PORT = process.env.PORT || 8787
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
      return callback(null, false)
    },
  }),
)
app.use(express.json())

function normalizeLink(value) {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  if (trimmed.startsWith('@')) return `https://x.com/${trimmed.slice(1)}`
  if (trimmed.includes('t.me/') || trimmed.includes('telegram')) {
    return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
  }
  if (/^[A-Za-z0-9_]{1,15}$/.test(trimmed)) return `https://x.com/${trimmed}`
  return trimmed
}

function isTwitterLink(url) {
  if (!url) return false
  return /(?:twitter\.com|x\.com)\//i.test(url)
}

function twitterHandle(url) {
  if (!url) return null
  const match = url.match(/(?:twitter\.com|x\.com)\/([^/?#]+)/i)
  return match ? `@${match[1]}` : null
}

async function fetchPumpCoin(mint) {
  const url = `https://frontend-api-v3.pump.fun/coins/${encodeURIComponent(mint)}`
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Origin: 'https://pump.fun',
      'User-Agent': 'PumpCatalog/1.0',
    },
  })
  if (res.status === 404) {
    const err = new Error('Token not found on Pump.fun')
    err.status = 404
    throw err
  }
  if (!res.ok) {
    const err = new Error(`Pump.fun API error (${res.status})`)
    err.status = res.status
    throw err
  }
  return res.json()
}

function mapPumpData(coin, mint) {
  const twitter = normalizeLink(coin.twitter)
  const website = normalizeLink(coin.website)
  let websiteFinal = website
  let twitterFinal = twitter
  if (!twitterFinal && website && isTwitterLink(website)) {
    twitterFinal = website
    websiteFinal = null
  }
  return {
    mint: coin.mint || mint,
    name: coin.name || 'Unknown',
    symbol: coin.symbol || '???',
    description: coin.description || '',
    image_uri: coin.image_uri || null,
    twitter: twitterFinal,
    website: websiteFinal,
    telegram: normalizeLink(coin.telegram),
    metadata_uri: coin.metadata_uri || null,
    creator: coin.creator || null,
    usd_market_cap: coin.usd_market_cap ?? coin.market_cap_usd ?? null,
    peak_market_cap: coin.ath_market_cap ?? null,
    is_live: coin.is_currently_live ? 1 : 0,
    created_timestamp: coin.created_timestamp || null,
  }
}

function mapCoin(row) {
  return {
    id: row.id,
    mint: row.mint,
    name: row.name,
    symbol: row.symbol,
    description: row.description,
    imageUri: row.image_uri,
    twitter: row.twitter,
    website: row.website,
    telegram: row.telegram,
    metadataUri: row.metadata_uri,
    creator: row.creator,
    tweetText: row.tweet_text || '',
    thoughts: row.thoughts || '',
    usdMarketCap: row.usd_market_cap,
    peakMarketCap: row.peak_market_cap,
    isLive: Boolean(row.is_live),
    createdTimestamp: row.created_timestamp,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/coins', (_req, res) => {
  const rows = db.prepare('SELECT * FROM coins ORDER BY id DESC').all()
  res.json(rows.map(mapCoin))
})

app.post('/api/coins', async (req, res) => {
  try {
    const mint = String(req.body?.mint || '').trim()
    const tweetText = String(req.body?.tweetText || '')
    const thoughts = String(req.body?.thoughts || '')
    const manual = Boolean(req.body?.manual)
    const manualMeta = req.body?.manualMeta || {}

    if (!mint || mint.length < 32) {
      return res.status(400).json({ error: 'Valid Solana contract address required' })
    }

    const existing = db.prepare('SELECT * FROM coins WHERE mint = ?').get(mint)
    if (existing) {
      return res.status(409).json({ error: 'Token already added', coin: mapCoin(existing) })
    }

    let data
    if (manual && (manualMeta.name || manualMeta.symbol)) {
      data = {
        mint,
        name: manualMeta.name || 'Unknown',
        symbol: manualMeta.symbol || '???',
        description: manualMeta.description || '',
        image_uri: manualMeta.imageUri || null,
        twitter: normalizeLink(manualMeta.twitter),
        website: normalizeLink(manualMeta.website),
        telegram: normalizeLink(manualMeta.telegram),
        metadata_uri: null,
        creator: null,
        usd_market_cap: null,
        peak_market_cap: null,
        is_live: 0,
        created_timestamp: Date.now(),
      }
    } else {
      const coin = await fetchPumpCoin(mint)
      data = mapPumpData(coin, mint)
    }

    const info = db
      .prepare(
        `INSERT INTO coins (
          mint, name, symbol, description, image_uri, twitter, website, telegram,
          metadata_uri, creator, tweet_text, thoughts, usd_market_cap, peak_market_cap,
          is_live, created_timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        data.mint,
        data.name,
        data.symbol,
        data.description,
        data.image_uri,
        data.twitter,
        data.website,
        data.telegram,
        data.metadata_uri,
        data.creator,
        tweetText,
        thoughts,
        data.usd_market_cap,
        data.peak_market_cap,
        data.is_live,
        data.created_timestamp,
      )

    const row = db.prepare('SELECT * FROM coins WHERE id = ?').get(info.lastInsertRowid)
    res.status(201).json(mapCoin(row))
  } catch (err) {
    console.error(err)
    res.status(err.status || 500).json({ error: err.message || 'Failed to add token' })
  }
})

app.patch('/api/coins/:id', (req, res) => {
  const id = Number(req.params.id)
  const existing = db.prepare('SELECT * FROM coins WHERE id = ?').get(id)
  if (!existing) return res.status(404).json({ error: 'Token not found' })

  const tweetText = req.body?.tweetText != null ? String(req.body.tweetText) : existing.tweet_text
  const thoughts = req.body?.thoughts != null ? String(req.body.thoughts) : existing.thoughts

  db.prepare(
    `UPDATE coins SET tweet_text = ?, thoughts = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(tweetText, thoughts, id)

  const row = db.prepare('SELECT * FROM coins WHERE id = ?').get(id)
  res.json(mapCoin(row))
})

app.post('/api/coins/:id/refresh', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const existing = db.prepare('SELECT * FROM coins WHERE id = ?').get(id)
    if (!existing) return res.status(404).json({ error: 'Token not found' })

    const coin = await fetchPumpCoin(existing.mint)
    const data = mapPumpData(coin, existing.mint)

    db.prepare(
      `UPDATE coins SET
        name = ?, symbol = ?, description = ?, image_uri = ?, twitter = ?, website = ?,
        telegram = ?, metadata_uri = ?, creator = ?, usd_market_cap = ?, peak_market_cap = ?,
        is_live = ?, created_timestamp = COALESCE(created_timestamp, ?), updated_at = datetime('now')
       WHERE id = ?`,
    ).run(
      data.name,
      data.symbol,
      data.description,
      data.image_uri,
      data.twitter,
      data.website,
      data.telegram,
      data.metadata_uri,
      data.creator,
      data.usd_market_cap,
      data.peak_market_cap,
      data.is_live,
      data.created_timestamp,
      id,
    )

    const row = db.prepare('SELECT * FROM coins WHERE id = ?').get(id)
    res.json(mapCoin(row))
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Refresh failed' })
  }
})

app.delete('/api/coins/:id', (req, res) => {
  const id = Number(req.params.id)
  const existing = db.prepare('SELECT * FROM coins WHERE id = ?').get(id)
  if (!existing) return res.status(404).json({ error: 'Token not found' })
  db.prepare('DELETE FROM coins WHERE id = ?').run(id)
  res.json({ ok: true })
})

app.get('/api/lookup/:mint', async (req, res) => {
  try {
    const mint = String(req.params.mint || '').trim()
    const coin = await fetchPumpCoin(mint)
    const data = mapPumpData(coin, mint)
    res.json({
      mint: data.mint,
      name: data.name,
      symbol: data.symbol,
      description: data.description,
      imageUri: data.image_uri,
      twitter: data.twitter,
      website: data.website,
      telegram: data.telegram,
      metadataUri: data.metadata_uri,
      creator: data.creator,
      usdMarketCap: data.usd_market_cap,
      peakMarketCap: data.peak_market_cap,
      isLive: Boolean(data.is_live),
      createdTimestamp: data.created_timestamp,
      twitterHandle: twitterHandle(data.twitter),
    })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Lookup failed' })
  }
})

const server = app.listen(PORT, () => {
  console.log(`Pump Catalog API on http://localhost:${PORT}`)
})

server.on('error', (err) => {
  console.error('API server error:', err)
  process.exit(1)
})

process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err)
})

process.on('unhandledRejection', (err) => {
  console.error('unhandledRejection:', err)
})

process.on('exit', (code) => {
  console.error('process exiting with code', code)
})

process.on('SIGINT', () => {
  server.close(() => process.exit(0))
})

process.on('SIGTERM', () => {
  server.close(() => process.exit(0))
})
