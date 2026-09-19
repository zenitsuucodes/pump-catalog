const IPFS_GATEWAYS = [
  'https://pump.mypinata.cloud/ipfs',
  'https://gateway.pinata.cloud/ipfs',
  'https://dweb.link/ipfs',
  'https://w3s.link/ipfs',
]

export function extractIpfsCid(uri: string): string | null {
  const trimmed = uri.trim()
  if (trimmed.startsWith('ipfs://')) {
    return trimmed.slice(7).replace(/^ipfs\//, '').split(/[/?#]/)[0] || null
  }
  const match = trimmed.match(/\/ipfs\/([^/?#]+)/i)
  return match?.[1] || null
}

export function normalizeImageUri(uri: string | null | undefined): string | null {
  if (!uri || typeof uri !== 'string') return null
  const trimmed = uri.trim()
  if (!trimmed) return null

  const cid = extractIpfsCid(trimmed)
  if (cid) return `${IPFS_GATEWAYS[0]}/${cid}`

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return trimmed
}

export function imageProxyUrl(uri: string): string {
  return `/api/image?url=${encodeURIComponent(uri)}`
}

export function imageDisplayCandidates(uri: string | null | undefined): string[] {
  if (!uri) return []
  const normalized = normalizeImageUri(uri)
  if (!normalized) return []

  const cid = extractIpfsCid(normalized)
  const direct = cid
    ? IPFS_GATEWAYS.map((base) => `${base}/${cid}`)
    : [normalized]

  const unique = [...new Set(direct)]
  return [...unique, imageProxyUrl(uri)]
}
