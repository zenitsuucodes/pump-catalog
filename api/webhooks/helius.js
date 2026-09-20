import { HELIUS_WEBHOOK_SECRET } from '../_lib/config.js'
import { processHeliusPayload } from '../_lib/wallet-tracker.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (HELIUS_WEBHOOK_SECRET) {
    const auth = req.headers.authorization || req.headers['x-helius-signature'] || ''
    if (auth !== HELIUS_WEBHOOK_SECRET && auth !== `Bearer ${HELIUS_WEBHOOK_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized webhook' })
    }
  }

  try {
    const result = await processHeliusPayload(req.body)
    return res.status(200).json({ ok: true, ...result })
  } catch (err) {
    console.error('Helius webhook error:', err)
    return res.status(500).json({ error: err.message || 'Webhook processing failed' })
  }
}
