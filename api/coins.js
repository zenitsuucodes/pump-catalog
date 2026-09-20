import { requireAuth } from './_lib/auth.js'
import { addCoin, listCoins } from './_lib/coins.js'

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return

  try {
    if (req.method === 'GET') {
      return res.status(200).json(await listCoins())
    }
    if (req.method === 'POST') {
      const coin = await addCoin(req.body)
      return res.status(201).json(coin)
    }
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    if (err.status === 409) {
      return res.status(409).json({ error: err.message, coin: err.coin })
    }
    console.error(err)
    return res.status(err.status || 500).json({ error: err.message || 'Request failed' })
  }
}
