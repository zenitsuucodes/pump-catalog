import { normalizeImageUri } from './images.js'

export function normalizeLink(value) {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  if (trimmed.startsWith('@')) return `https://x.com/${trimmed.slice(1)}`
  if (trimmed.includes('t.me/') || trimmed.includes('telegram')) {
    return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
  }
  if (/^[A-Za-z0-9_]{1,15}$/.test(trimmed)) return `https://x.com/${trimmed}`
  return trimmed
}

function isTwitterLink(url) {
  if (!url) return false
  return /(?:twitter\.com|x\.com)\//i.test(url)
}

export function twitterHandle(url) {
  if (!url) return null
  const match = url.match(/(?:twitter\.com|x\.com)\/([^/?#]+)/i)
  return match ? `@${match[1]}` : null
}

export async function fetchPumpCoin(mint) {
  const url = `https://frontend-api-v3.pump.fun/coins/${encodeURIComponent(mint)}`
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Origin: 'https://pump.fun',
      'User-Agent': 'PumpCatalog/1.0',
    },
  })
  if (res.status === 404) {
    const err = new Error('Token not found on Pump.fun')
    err.status = 404
    throw err
  }
  if (!res.ok) {
    const err = new Error(`Pump.fun API error (${res.status})`)
    err.status = res.status
    throw err
  }
  return res.json()
}

export function mapPumpData(coin, mint) {
  const twitter = normalizeLink(coin.twitter)
  const website = normalizeLink(coin.website)
  let websiteFinal = website
  let twitterFinal = twitter
  if (!twitterFinal && website && isTwitterLink(website)) {
    twitterFinal = website
    websiteFinal = null
  }
  return {
    mint: coin.mint || mint,
    name: coin.name || 'Unknown',
    symbol: coin.symbol || '???',
    description: coin.description || '',
    imageUri: normalizeImageUri(coin.image_uri) || null,
    twitter: twitterFinal,
    website: websiteFinal,
    telegram: normalizeLink(coin.telegram),
    metadataUri: coin.metadata_uri || null,
    creator: coin.creator || null,
    usdMarketCap: coin.usd_market_cap ?? coin.market_cap_usd ?? null,
    peakMarketCap: coin.ath_market_cap ?? null,
    isLive: Boolean(coin.is_currently_live),
    createdTimestamp: coin.created_timestamp || null,
  }
}

export function toLookupResponse(data) {
  return {
    ...data,
    twitterHandle: twitterHandle(data.twitter),
  }
}
