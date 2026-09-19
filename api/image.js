import { fetchImageBuffer } from './_lib/images.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const uri = String(req.query.url || req.query.u || '').trim()
  if (!uri) {
    return res.status(400).json({ error: 'Missing url parameter' })
  }

  try {
    const { buffer, contentType } = await fetchImageBuffer(uri)
    res.setHeader('Content-Type', contentType.split(';')[0])
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400')
    return res.status(200).send(buffer)
  } catch (err) {
    return res.status(err.status || 502).json({ error: err.message || 'Failed to load image' })
  }
}
