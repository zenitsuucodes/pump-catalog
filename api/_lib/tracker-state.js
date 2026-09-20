import { getStore, getTrackerOnly, saveStore } from './storage.js'

const TRACKER_KEY = 'tracker:state'

function defaultState() {
  return {
    processedSignatures: [],
    positions: {},
    autoAddedMints: [],
    trades: [],
    lastEventAt: null,
    lastEvent: null,
    lastAutoAddAt: null,
    lastError: null,
    eventCount: 0,
  }
}

export async function getTrackerState() {
  const tracker = await getTrackerOnly()
  if (!tracker) return defaultState()
  return { ...defaultState(), ...tracker }
}

export async function saveTrackerState(tracker) {
  const store = await getStore()
  store.tracker = tracker
  await saveStore(store)
}

export function tradeEventKey(event) {
  return `${event.signature}:${event.mint}:${event.side}`
}

export async function markEventProcessed(key) {
  const tracker = await getTrackerState()
  if (tracker.processedSignatures.includes(key)) return false
  tracker.processedSignatures = [key, ...tracker.processedSignatures].slice(0, 2000)
  tracker.eventCount += 1
  tracker.lastEventAt = new Date().toISOString()
  await saveTrackerState(tracker)
  return true
}

export async function hasProcessedEvent(key) {
  const tracker = await getTrackerState()
  return tracker.processedSignatures.includes(key)
}

/** @deprecated use tradeEventKey + hasProcessedEvent */
export async function hasProcessedSignature(signature) {
  const tracker = await getTrackerState()
  return tracker.processedSignatures.some(
    (entry) => entry === signature || entry.startsWith(`${signature}:`),
  )
}

/** @deprecated use markEventProcessed */
export async function markSignatureProcessed(signature) {
  return markEventProcessed(signature)
}

export async function wasAutoAdded(mint) {
  const tracker = await getTrackerState()
  return tracker.autoAddedMints.includes(mint)
}

export async function markAutoAdded(mint) {
  const tracker = await getTrackerState()
  if (!tracker.autoAddedMints.includes(mint)) {
    tracker.autoAddedMints = [mint, ...tracker.autoAddedMints].slice(0, 500)
  }
  tracker.lastAutoAddAt = new Date().toISOString()
  await saveTrackerState(tracker)
}

export async function unmarkAutoAdded(mint) {
  const tracker = await getTrackerState()
  tracker.autoAddedMints = tracker.autoAddedMints.filter((m) => m !== mint)
  await saveTrackerState(tracker)
}

export async function getPosition(wallet, mint) {
  const tracker = await getTrackerState()
  return tracker.positions[`${wallet}:${mint}`] || null
}

export async function savePosition(wallet, mint, position) {
  const tracker = await getTrackerState()
  tracker.positions[`${wallet}:${mint}`] = position
  await saveTrackerState(tracker)
}

export async function recordTrackerError(message) {
  const tracker = await getTrackerState()
  tracker.lastError = { message, at: new Date().toISOString() }
  await saveTrackerState(tracker)
}

export async function recordTrade(trade) {
  const tracker = await getTrackerState()
  const id = `${trade.signature}:${trade.mint}:${trade.side}`
  if (tracker.trades.some((t) => t.id === id)) return tracker.trades.find((t) => t.id === id)

  const entry = {
    id,
    signature: trade.signature,
    side: trade.side,
    mint: trade.mint,
    symbol: trade.symbol || null,
    name: trade.name || null,
    imageUri: trade.imageUri || null,
    profitUsd: trade.profitUsd ?? null,
    solDelta: trade.solDelta ?? null,
    isProfitable: Boolean(trade.isProfitable),
    autoAdded: Boolean(trade.autoAdded),
    wallet: trade.wallet,
    createdAt: trade.createdAt || new Date().toISOString(),
  }

  tracker.trades = [entry, ...tracker.trades].slice(0, 500)
  tracker.lastEvent = {
    at: entry.createdAt,
    side: entry.side,
    mint: entry.mint,
    symbol: entry.symbol,
    name: entry.name,
    profitUsd: entry.profitUsd,
    autoAdded: entry.autoAdded,
    isProfitable: entry.isProfitable,
  }
  await saveTrackerState(tracker)
  return entry
}

export async function updateTrade(id, patch) {
  const tracker = await getTrackerState()
  const index = tracker.trades.findIndex((t) => t.id === id)
  if (index === -1) return null

  tracker.trades[index] = { ...tracker.trades[index], ...patch }
  await saveTrackerState(tracker)
  return tracker.trades[index]
}

export async function listTrades({ profitableOnly = false, minProfitUsd = 0 } = {}) {
  const tracker = await getTrackerState()
  let trades = [...(tracker.trades || [])]

  if (profitableOnly) {
    trades = trades.filter(
      (t) => t.side === 'sell' && t.profitUsd != null && t.profitUsd >= minProfitUsd,
    )
  }

  return trades.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}
