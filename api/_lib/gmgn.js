import { randomUUID } from 'node:crypto'
import { GMGN_API_BASE, GMGN_API_KEY } from './config.js'

function buildAuthQuery() {
  return {
    timestamp: Math.floor(Date.now() / 1000),
    client_id: randomUUID(),
  }
}

async function gmgnRequest(path, params = {}) {
  if (!GMGN_API_KEY) return null

  const url = new URL(`${GMGN_API_BASE}${path}`)
  const auth = buildAuthQuery()
  const query = { ...params, ...auth }

  for (const [key, value] of Object.entries(query)) {
    if (value != null && value !== '') url.searchParams.set(key, String(value))
  }

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-APIKEY': GMGN_API_KEY,
      'User-Agent': 'PumpCatalog/1.0',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    const err = new Error(`GMGN API error (${res.status})`)
    err.status = res.status
    throw err
  }

  const data = await res.json()
  if (data?.code != null && data.code !== 0) {
    const err = new Error(data.message || data.error || `GMGN error (${data.code})`)
    err.status = data.code === 429 ? 429 : 400
    throw err
  }

  return data
}

function activityFees(activity) {
  return Number(activity?.gas_usd ?? 0) + Number(activity?.dex_usd ?? 0)
}

export function findPairedBuy(sell, buys = []) {
  if (!sell?.token?.address) return null

  const mint = sell.token.address
  const sellTs = sell.timestamp || 0
  const sellAmt = Number(sell.token_amount ?? 0)

  const candidates = buys
    .filter((b) => b.token?.address === mint && b.event_type === 'buy')
    .filter((b) => (b.timestamp || 0) <= sellTs + 1)
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))

  if (candidates.length === 0) return null

  if (sellAmt > 0) {
    const exact = candidates.find((b) => {
      const buyAmt = Number(b.token_amount ?? 0)
      if (!buyAmt) return false
      return Math.abs(buyAmt - sellAmt) / sellAmt < 0.01
    })
    if (exact) return exact
  }

  return candidates[0]
}

export function computeGmgnSellPnl(sell, pairedBuy = null) {
  if (!sell || sell.event_type !== 'sell') return null

  const proceeds = Number(sell.cost_usd ?? 0)
  if (!Number.isFinite(proceeds) || proceeds <= 0) return null

  let costBasis = Number(sell.buy_cost_usd ?? NaN)
  let buyFees = 0

  if (!Number.isFinite(costBasis) || costBasis <= 0) {
    if (!pairedBuy) return null
    costBasis = Number(pairedBuy.cost_usd ?? 0)
    buyFees = activityFees(pairedBuy)
  }

  if (!Number.isFinite(costBasis) || costBasis <= 0) return null

  return proceeds - costBasis - activityFees(sell) - buyFees
}

export async function findGmgnActivity(wallet, { signature, mint, type } = {}) {
  if (!GMGN_API_KEY) return null

  let cursor = null
  const maxPages = 20

  for (let page = 0; page < maxPages; page += 1) {
    const params = {
      chain: 'sol',
      wallet_address: wallet,
      limit: 50,
    }
    if (cursor) params.cursor = cursor
    if (mint) params.token = mint
    if (type) params.type = type

    let data
    try {
      data = await gmgnRequest('/v1/user/wallet_activity', params)
    } catch (err) {
      if (err.status === 429) break
      return null
    }

    const activities = data?.data?.activities || data?.activities || []
    if (signature) {
      const match = activities.find((a) => a.tx_hash === signature)
      if (match) return match
    } else if (mint && type) {
      const match = activities.find(
        (a) => a.token?.address === mint && a.event_type === type,
      )
      if (match) return match
    }

    const next = data?.data?.next || data?.data?.cursor || data?.next || null
    if (!next || activities.length === 0) break
    cursor = next
  }

  return null
}

async function loadGmgnActivities(wallet, { maxPages = 25 } = {}) {
  const activities = []
  if (!GMGN_API_KEY) return activities

  let cursor = null

  for (let page = 0; page < maxPages; page += 1) {
    const params = {
      chain: 'sol',
      wallet_address: wallet,
      limit: 50,
    }
    if (cursor) params.cursor = cursor

    let data
    try {
      data = await gmgnRequest('/v1/user/wallet_activity', params)
    } catch (err) {
      if (err.status === 429) break
      throw err
    }

    const batch = data?.data?.activities || data?.activities || []
    activities.push(...batch)

    const next = data?.data?.next || data?.data?.cursor || data?.next || null
    if (!next || batch.length === 0) break
    cursor = next
  }

  return activities
}

export async function loadGmgnTradeData(wallet, options = {}) {
  const activities = await loadGmgnActivities(wallet, options)
  const sells = new Map()
  const buysByMint = new Map()

  for (const activity of activities) {
    const mint = activity?.token?.address
    if (!mint || !activity.tx_hash) continue

    if (activity.event_type === 'sell') {
      sells.set(activity.tx_hash, activity)
      continue
    }

    if (activity.event_type === 'buy') {
      const list = buysByMint.get(mint) || []
      list.push(activity)
      buysByMint.set(mint, list)
    }
  }

  return { sells, buysByMint, activities }
}

export async function loadGmgnSellActivityMap(wallet, options = {}) {
  const { sells } = await loadGmgnTradeData(wallet, options)
  return sells
}

export function resolveGmgnSellPnl(sell, buysByMint) {
  if (!sell) return null
  const mint = sell.token?.address
  const pairedBuy = findPairedBuy(sell, buysByMint.get(mint) || [])
  return computeGmgnSellPnl(sell, pairedBuy)
}

export async function getGmgnSellPnl(wallet, signature, mint) {
  try {
    const { sells, buysByMint } = await loadGmgnTradeData(wallet, { maxPages: 20 })
    let sell = sells.get(signature)
    if (!sell) {
      sell = [...sells.values()].find(
        (s) => s.tx_hash === signature || s.token?.address === mint,
      )
    }

    if (sell) return resolveGmgnSellPnl(sell, buysByMint)

    const bySig = await findGmgnActivity(wallet, { signature })
    if (bySig?.event_type === 'sell') {
      const byMint = await findGmgnActivity(wallet, { mint, type: 'buy' })
      const buys = byMint ? [byMint] : []
      return computeGmgnSellPnl(bySig, findPairedBuy(bySig, buys))
    }

    return null
  } catch {
    return null
  }
}

export async function getGmgnRecentActivity(wallet, limit = 20) {
  try {
    const data = await gmgnRequest('/v1/user/wallet_activity', {
      chain: 'sol',
      wallet_address: wallet,
      limit,
    })
    return data?.data?.activities || data?.activities || data?.list || []
  } catch {
    return []
  }
}
