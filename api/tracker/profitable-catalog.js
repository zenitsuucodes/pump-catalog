import { requireAuth } from '../_lib/auth.js'
import { listProfitableCatalogCoins } from '../_lib/pnl-sync.js'

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const result = await listProfitableCatalogCoins()
    return res.status(200).json(result)
  } catch (err) {
    console.error('Profitable catalog error:', err)
    return res.status(500).json({ error: err.message || 'Failed to load profitable catalog' })
  }
}
