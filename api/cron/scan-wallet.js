import { CRON_SECRET } from '../_lib/config.js'
import { scanWalletRecentTransactions } from '../_lib/wallet-tracker.js'

export default async function handler(req, res) {
  const auth = req.headers.authorization || ''
  const expected = CRON_SECRET ? `Bearer ${CRON_SECRET}` : null

  if (expected && auth !== expected) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const result = await scanWalletRecentTransactions()
    return res.status(200).json({ ok: true, ...result })
  } catch (err) {
    console.error('Wallet scan cron error:', err)
    return res.status(500).json({ error: err.message || 'Scan failed' })
  }
}
