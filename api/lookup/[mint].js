import { lookupMint } from '../../_lib/coins.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const mint = String(req.query.mint || '').trim()
  if (!mint) return res.status(400).json({ error: 'Mint required' })

  try {
    return res.status(200).json(await lookupMint(mint))
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Lookup failed' })
  }
}
