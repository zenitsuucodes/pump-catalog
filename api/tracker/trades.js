import { requireAuth } from '../_lib/auth.js'
import { MIN_PROFIT_USD } from '../_lib/config.js'
import { listTrades } from '../_lib/tracker-state.js'

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const filter = String(req.query.filter || 'all')
  const profitableOnly = filter === 'profitable'

  const trades = await listTrades({
    profitableOnly,
    minProfitUsd: MIN_PROFIT_USD,
  })

  return res.status(200).json({
    filter,
    minProfitUsd: MIN_PROFIT_USD,
    count: trades.length,
    trades,
  })
}
