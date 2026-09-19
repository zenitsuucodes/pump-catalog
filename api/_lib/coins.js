import { fetchPumpCoin, mapPumpData, normalizeLink, toLookupResponse } from './pump.js'
import { normalizeImageUri } from './images.js'
import { getStore, nowIso, saveStore } from './storage.js'

function withNormalizedImage(coin) {
  if (!coin?.imageUri) return coin
  const normalized = normalizeImageUri(coin.imageUri)
  if (normalized === coin.imageUri) return coin
  return { ...coin, imageUri: normalized }
}

export async function listCoins() {
  const store = await getStore()
  return [...store.coins].map(withNormalizedImage).sort((a, b) => b.id - a.id)
}

export async function lookupMint(mint) {
  const coin = await fetchPumpCoin(mint)
  const data = mapPumpData(coin, mint)
  return toLookupResponse(data)
}

export async function addCoin(body) {
  const mint = String(body?.mint || '').trim()
  const tweetText = String(body?.tweetText || '')
  const thoughts = String(body?.thoughts || '')
  const manual = Boolean(body?.manual)
  const manualMeta = body?.manualMeta || {}

  if (!mint || mint.length < 32) {
    const err = new Error('Valid Solana contract address required')
    err.status = 400
    throw err
  }

  const store = await getStore()
  const existing = store.coins.find((c) => c.mint === mint)
  if (existing) {
    const err = new Error('Token already added')
    err.status = 409
    err.coin = existing
    throw err
  }

  let meta
  if (manual && (manualMeta.name || manualMeta.symbol)) {
    meta = {
      mint,
      name: manualMeta.name || 'Unknown',
      symbol: manualMeta.symbol || '???',
      description: manualMeta.description || '',
      imageUri: normalizeImageUri(manualMeta.imageUri) || null,
      twitter: normalizeLink(manualMeta.twitter),
      website: normalizeLink(manualMeta.website),
      telegram: normalizeLink(manualMeta.telegram),
      metadataUri: null,
      creator: null,
      usdMarketCap: null,
      peakMarketCap: null,
      isLive: false,
      createdTimestamp: Date.now(),
    }
  } else {
    const coin = await fetchPumpCoin(mint)
    meta = mapPumpData(coin, mint)
  }

  const ts = nowIso()
  const coin = {
    id: store.nextId,
    ...meta,
    tweetText,
    thoughts,
    createdAt: ts,
    updatedAt: ts,
  }

  store.coins.push(coin)
  store.nextId += 1
  await saveStore(store)
  return coin
}

export async function updateCoin(id, body) {
  const store = await getStore()
  const index = store.coins.findIndex((c) => c.id === id)
  if (index === -1) {
    const err = new Error('Token not found')
    err.status = 404
    throw err
  }

  const existing = store.coins[index]
  const updated = {
    ...existing,
    tweetText: body?.tweetText != null ? String(body.tweetText) : existing.tweetText,
    thoughts: body?.thoughts != null ? String(body.thoughts) : existing.thoughts,
    updatedAt: nowIso(),
  }
  store.coins[index] = updated
  await saveStore(store)
  return updated
}

export async function refreshCoin(id) {
  const store = await getStore()
  const index = store.coins.findIndex((c) => c.id === id)
  if (index === -1) {
    const err = new Error('Token not found')
    err.status = 404
    throw err
  }

  const existing = store.coins[index]
  const coin = await fetchPumpCoin(existing.mint)
  const data = mapPumpData(coin, existing.mint)

  const updated = {
    ...existing,
    ...data,
    createdTimestamp: existing.createdTimestamp || data.createdTimestamp,
    updatedAt: nowIso(),
  }
  store.coins[index] = updated
  await saveStore(store)
  return updated
}

export async function deleteCoin(id) {
  const store = await getStore()
  const index = store.coins.findIndex((c) => c.id === id)
  if (index === -1) {
    const err = new Error('Token not found')
    err.status = 404
    throw err
  }
  store.coins.splice(index, 1)
  await saveStore(store)
  return { ok: true }
}
