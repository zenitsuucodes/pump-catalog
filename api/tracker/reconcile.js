import { CRON_SECRET } from '../_lib/config.js'
import { reconcileTrackerData } from '../_lib/reconcile.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = req.headers.authorization || ''
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const result = await reconcileTrackerData()
    return res.status(200).json({ ok: true, ...result })
  } catch (err) {
    console.error('Reconcile error:', err)
    return res.status(500).json({ error: err.message || 'Reconcile failed' })
  }
}
