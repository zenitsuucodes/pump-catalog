import express from 'express'
import cors from 'cors'
import {
  clearSessionCookie,
  createSessionToken,
  getSessionFromReq,
  requireAuth,
  setSessionCookie,
  verifyCredentials,
} from '../api/_lib/auth.js'
import {
  addCoin,
  deleteCoin,
  listCoins,
  lookupMint,
  refreshCoin,
  updateCoin,
} from '../api/_lib/coins.js'
import watchHandler from '../api/tracker/watch.js'

const app = express()
const PORT = process.env.PORT || 8787

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

function guard(req, res, next) {
  if (!requireAuth(req, res)) return
  next()
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/auth/me', (req, res) => {
  const session = getSessionFromReq(req)
  if (session) {
    return res.json({ authenticated: true, user: session.user })
  }
  return res.json({ authenticated: false })
})

app.post('/api/auth/login', (req, res) => {
  const username = String(req.body?.username || '').trim()
  const password = String(req.body?.password || '')

  if (!verifyCredentials(username, password)) {
    return res.status(401).json({ error: 'Invalid username or password' })
  }

  const token = createSessionToken(username)
  setSessionCookie(res, token)
  return res.json({ ok: true, user: username })
})

app.post('/api/auth/logout', (_req, res) => {
  clearSessionCookie(res)
  return res.json({ ok: true })
})

app.get('/api/coins', guard, async (_req, res) => {
  try {
    res.json(await listCoins())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/coins', guard, async (req, res) => {
  try {
    const coin = await addCoin(req.body)
    res.status(201).json(coin)
  } catch (err) {
    if (err.status === 409) return res.status(409).json({ error: err.message, coin: err.coin })
    res.status(err.status || 500).json({ error: err.message || 'Failed to add token' })
  }
})

app.patch('/api/coins/:id', guard, async (req, res) => {
  try {
    res.json(await updateCoin(Number(req.params.id), req.body))
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

app.post('/api/coins/:id/refresh', guard, async (req, res) => {
  try {
    res.json(await refreshCoin(Number(req.params.id)))
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

app.delete('/api/coins/:id', guard, async (req, res) => {
  try {
    res.json(await deleteCoin(Number(req.params.id)))
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

app.get('/api/tracker/watch', guard, (req, res) => watchHandler(req, res))

app.get('/api/lookup/:mint', guard, async (req, res) => {
  try {
    res.json(await lookupMint(String(req.params.mint || '').trim()))
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`Pump Catalog API on http://localhost:${PORT}`)
})
