import { deleteCoin, updateCoin } from '../_lib/coins.js'

export default async function handler(req, res) {
  const id = Number(req.query.id)
  if (!id) return res.status(400).json({ error: 'Invalid id' })

  try {
    if (req.method === 'PATCH') {
      return res.status(200).json(await updateCoin(id, req.body))
    }
    if (req.method === 'DELETE') {
      return res.status(200).json(await deleteCoin(id))
    }
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Request failed' })
  }
}
