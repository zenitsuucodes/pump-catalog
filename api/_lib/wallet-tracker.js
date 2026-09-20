import {

  MIN_PROFIT_USD,

  TRACKED_WALLET,

  HELIUS_API_KEY,

} from './config.js'

import { extractWalletTradeEventsFromPayload } from './helius-parse.js'

import { getGmgnSellPnl } from './gmgn.js'

import { fetchPumpCoin, mapPumpData } from './pump.js'

import { catalogCoinFromWalletBuy, updateAutoCoinProfit } from './coins.js'

import {
  getPosition,
  hasProcessedEvent,
  markAutoAdded,
  markEventProcessed,
  recordTrackerError,
  recordTrade,
  savePosition,
  tradeEventKey,
  wasAutoAdded,
} from './tracker-state.js'



let cachedSolPrice = { value: 150, at: 0 }



async function getSolPriceUsd() {

  if (Date.now() - cachedSolPrice.at < 60_000) return cachedSolPrice.value

  try {

    const res = await fetch('https://frontend-api-v3.pump.fun/sol-price', {

      headers: { Accept: 'application/json', Origin: 'https://pump.fun' },

      signal: AbortSignal.timeout(8000),

    })

    if (res.ok) {

      const data = await res.json()

      const price = Number(data?.solPrice ?? data?.price ?? data)

      if (Number.isFinite(price) && price > 0) {

        cachedSolPrice = { value: price, at: Date.now() }

        return price

      }

    }

  } catch {

    /* ignore */

  }

  return cachedSolPrice.value

}



async function updatePositionFromBuy(event) {

  const solPrice = await getSolPriceUsd()

  const solSpent = Math.abs(event.solDelta || 0)

  const usdSpent = solSpent > 0 ? solSpent * solPrice : 0

  const existing = (await getPosition(TRACKED_WALLET, event.mint)) || {

    tokenAmount: 0,

    costUsd: 0,

  }



  const next = {

    tokenAmount: existing.tokenAmount + (event.tokenAmount || 0),

    costUsd: existing.costUsd + usdSpent,

    lastBuyAt: new Date().toISOString(),

  }

  await savePosition(TRACKED_WALLET, event.mint, next)

  return next

}



async function estimateSellProfit(event) {

  const solPrice = await getSolPriceUsd()

  const solReceived = Math.max(event.solDelta || 0, 0)

  const proceedsUsd = solReceived > 0 ? solReceived * solPrice : 0

  const position = await getPosition(TRACKED_WALLET, event.mint)



  if (!position || position.tokenAmount <= 0 || position.costUsd <= 0) {

    return null

  }



  const soldAmount = Math.min(event.tokenAmount || 0, position.tokenAmount)

  const soldRatio = soldAmount > 0 ? soldAmount / position.tokenAmount : 1

  const costBasis = position.costUsd * soldRatio

  const profit = proceedsUsd - costBasis



  const remainingTokens = Math.max(position.tokenAmount - soldAmount, 0)

  const remainingCost = Math.max(position.costUsd - costBasis, 0)

  await savePosition(TRACKED_WALLET, event.mint, {

    tokenAmount: remainingTokens,

    costUsd: remainingCost,

    lastSellAt: new Date().toISOString(),

  })



  return profit

}



async function resolveRealizedProfit(event) {

  const gmgnProfit = await getGmgnSellPnl(

    TRACKED_WALLET,

    event.signature,

    event.mint,

  )

  if (gmgnProfit != null) return gmgnProfit

  return estimateSellProfit(event)

}



async function fetchTradeMeta(mint) {

  try {

    const coin = await fetchPumpCoin(mint)

    const data = mapPumpData(coin, mint)

    return { symbol: data.symbol, name: data.name, imageUri: data.imageUri }

  } catch {

    return { symbol: null, name: null, imageUri: null }

  }

}



async function logTrade(event, extra = {}) {

  const meta = await fetchTradeMeta(event.mint)

  return recordTrade({

    signature: event.signature,

    side: event.side,

    mint: event.mint,

    solDelta: event.solDelta,

    wallet: TRACKED_WALLET,

    createdAt: event.timestamp

      ? new Date(event.timestamp * 1000).toISOString()

      : new Date().toISOString(),

    ...meta,

    ...extra,

  })

}



async function isCatalogableBuy(mint) {
  if (mint.endsWith('pump')) return true
  try {
    await fetchPumpCoin(mint)
    return true
  } catch {
    return false
  }
}

async function handleBuyEvent(event) {
  await updatePositionFromBuy(event)

  let cataloged = false
  let coin = null

  if ((await isCatalogableBuy(event.mint)) && !(await wasAutoAdded(event.mint))) {
    try {
      coin = await catalogCoinFromWalletBuy({
        mint: event.mint,
        signature: event.signature,
        wallet: TRACKED_WALLET,
      })
      await markAutoAdded(event.mint)
      cataloged = true
    } catch (err) {
      await recordTrackerError(`Catalog buy failed ${event.mint}: ${err.message}`)
    }
  }

  await logTrade(event, {
    profitUsd: null,
    isProfitable: false,
    autoAdded: cataloged,
  })

  return { tracked: true, side: 'buy', mint: event.mint, cataloged, coin }
}



async function handleSellEvent(event) {

  const profitUsd = await resolveRealizedProfit(event)

  const isProfitable = profitUsd != null && profitUsd >= MIN_PROFIT_USD



  if (profitUsd != null && (await wasAutoAdded(event.mint))) {

    await updateAutoCoinProfit(event.mint, profitUsd, event.signature)

  }



  await logTrade(event, {

    profitUsd,

    isProfitable,

    autoAdded: false,

  })



  return {

    tracked: true,

    side: 'sell',

    mint: event.mint,

    profitUsd,

    isProfitable,

    threshold: MIN_PROFIT_USD,

  }

}



export async function processWalletTradeEvent(event) {
  if (!event?.signature || !event?.mint) return { skipped: true, reason: 'invalid-event' }

  const key = tradeEventKey(event)
  if (await hasProcessedEvent(key)) {
    return { skipped: true, reason: 'duplicate-event', key }
  }

  try {
    let result
    if (event.side === 'buy') {
      result = await handleBuyEvent(event)
    } else if (event.side === 'sell') {
      result = await handleSellEvent(event)
    } else {
      return { skipped: true, reason: 'unknown-side' }
    }

    await markEventProcessed(key)
    return result
  } catch (err) {
    await recordTrackerError(err.message || 'wallet-tracker failed')
    throw err
  }
}



function mintPriority(mint) {
  return mint?.endsWith('pump') ? 0 : 1
}

function sortTradeEvents(events) {
  return [...events].sort((a, b) => {
    const ta = a.timestamp || 0
    const tb = b.timestamp || 0
    if (ta !== tb) return ta - tb

    if (a.signature === b.signature) {
      const byMint = mintPriority(a.mint) - mintPriority(b.mint)
      if (byMint !== 0) return byMint
    }

    if (a.side === 'buy' && b.side === 'sell') return -1
    if (a.side === 'sell' && b.side === 'buy') return 1
    return 0
  })
}



export async function processHeliusPayload(payload) {

  const events = sortTradeEvents(extractWalletTradeEventsFromPayload(payload))

  const results = []



  for (const event of events) {

    results.push(await processWalletTradeEvent(event))

  }



  return { count: events.length, results }

}



export async function scanWalletRecentTransactions() {

  if (!HELIUS_API_KEY) {

    return { skipped: true, reason: 'missing-helius-api-key' }

  }



  const url = new URL(`https://api.helius.xyz/v0/addresses/${TRACKED_WALLET}/transactions`)

  url.searchParams.set('api-key', HELIUS_API_KEY)

  url.searchParams.set('limit', '40')



  const res = await fetch(url, {

    headers: { Accept: 'application/json' },

    signal: AbortSignal.timeout(20000),

  })



  if (!res.ok) {

    const err = new Error(`Helius history error (${res.status})`)

    err.status = res.status

    throw err

  }



  const txs = await res.json()

  return processHeliusPayload(txs)

}



export async function setupHeliusWebhook(webhookUrl) {

  if (!HELIUS_API_KEY) {

    throw new Error('HELIUS_API_KEY is required to create a webhook')

  }



  const res = await fetch(`https://api.helius.xyz/v0/webhooks?api-key=${HELIUS_API_KEY}`, {

    method: 'POST',

    headers: { 'Content-Type': 'application/json' },

    body: JSON.stringify({

      webhookURL: webhookUrl,

      transactionTypes: ['SWAP', 'UNKNOWN'],

      accountAddresses: [TRACKED_WALLET],

      webhookType: 'enhanced',

      authHeader: process.env.HELIUS_WEBHOOK_SECRET || undefined,

    }),

  })



  if (!res.ok) {

    const text = await res.text()

    throw new Error(`Helius webhook create failed (${res.status}): ${text}`)

  }



  return res.json()

}


