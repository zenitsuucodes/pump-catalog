import { CRON_SECRET } from '../_lib/config.js'
import { setupHeliusWebhook } from '../_lib/wallet-tracker.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = req.headers.authorization || ''
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const webhookUrl =
    req.body?.webhookUrl ||
    `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/webhooks/helius`

  try {
    const webhook = await setupHeliusWebhook(webhookUrl)
    return res.status(200).json({ ok: true, webhookUrl, webhook })
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Webhook setup failed' })
  }
}
