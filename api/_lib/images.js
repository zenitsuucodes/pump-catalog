const IPFS_GATEWAYS = [
  'https://pump.mypinata.cloud/ipfs',
  'https://gateway.pinata.cloud/ipfs',
  'https://dweb.link/ipfs',
  'https://w3s.link/ipfs',
  'https://ipfs.io/ipfs',
]

export function extractIpfsCid(uri) {
  if (!uri || typeof uri !== 'string') return null
  const trimmed = uri.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('ipfs://')) {
    return trimmed.slice(7).replace(/^ipfs\//, '').split(/[/?#]/)[0] || null
  }

  const match = trimmed.match(/\/ipfs\/([^/?#]+)/i)
  return match?.[1] || null
}

export function ipfsGatewayUrls(cid) {
  if (!cid) return []
  return IPFS_GATEWAYS.map((base) => `${base}/${cid}`)
}

export function normalizeImageUri(uri) {
  if (!uri || typeof uri !== 'string') return null
  const trimmed = uri.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('ipfs://')) {
    const cid = extractIpfsCid(trimmed)
    return cid ? ipfsGatewayUrls(cid)[0] : null
  }

  const cid = extractIpfsCid(trimmed)
  if (cid) return ipfsGatewayUrls(cid)[0]

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return trimmed
}

export function imageFetchUrls(uri) {
  if (!uri || typeof uri !== 'string') return []
  const trimmed = uri.trim()
  if (!trimmed) return []

  const cid = extractIpfsCid(trimmed)
  if (cid) return ipfsGatewayUrls(cid)

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return [trimmed]
  return []
}

export async function fetchImageBuffer(uri) {
  const urls = imageFetchUrls(uri)
  let lastError

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'image/*,*/*', 'User-Agent': 'PumpCatalog/1.0' },
        signal: AbortSignal.timeout(12000),
      })
      if (!res.ok) {
        lastError = new Error(`Gateway ${url} returned ${res.status}`)
        continue
      }
      const contentType = res.headers.get('content-type') || 'image/jpeg'
      const buffer = Buffer.from(await res.arrayBuffer())
      if (buffer.length === 0) {
        lastError = new Error(`Gateway ${url} returned empty body`)
        continue
      }
      return { buffer, contentType }
    } catch (err) {
      lastError = err
    }
  }

  const err = new Error(lastError?.message || 'Image not found')
  err.status = 404
  throw err
}
