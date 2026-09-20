import { requireAuth } from '../../_lib/auth.js'
import { refreshCoin } from '../../_lib/coins.js'

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return

  const id = Number(req.query.id)
  if (!id) return res.status(400).json({ error: 'Invalid id' })

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    return res.status(200).json(await refreshCoin(id))
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Refresh failed' })
  }
}
