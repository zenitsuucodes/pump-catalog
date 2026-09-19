import express from 'express'
import cors from 'cors'
import {
  addCoin,
  deleteCoin,
  listCoins,
  lookupMint,
  refreshCoin,
  updateCoin,
} from '../api/_lib/coins.js'

const app = express()
const PORT = process.env.PORT || 8787

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/coins', async (_req, res) => {
  try {
    res.json(await listCoins())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/coins', async (req, res) => {
  try {
    const coin = await addCoin(req.body)
    res.status(201).json(coin)
  } catch (err) {
    if (err.status === 409) return res.status(409).json({ error: err.message, coin: err.coin })
    res.status(err.status || 500).json({ error: err.message || 'Failed to add token' })
  }
})

app.patch('/api/coins/:id', async (req, res) => {
  try {
    res.json(await updateCoin(Number(req.params.id), req.body))
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

app.post('/api/coins/:id/refresh', async (req, res) => {
  try {
    res.json(await refreshCoin(Number(req.params.id)))
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

app.delete('/api/coins/:id', async (req, res) => {
  try {
    res.json(await deleteCoin(Number(req.params.id)))
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

app.get('/api/lookup/:mint', async (req, res) => {
  try {
    res.json(await lookupMint(String(req.params.mint || '').trim()))
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`Pump Catalog API on http://localhost:${PORT}`)
})
