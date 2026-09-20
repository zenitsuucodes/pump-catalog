import { requireAuth } from '../_lib/auth.js'
import { MIN_PROFIT_USD, TRACKED_WALLET, HELIUS_API_KEY, GMGN_API_KEY } from '../_lib/config.js'
import { getTrackerState } from '../_lib/tracker-state.js'

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return

  const tracker = await getTrackerState()
  return res.status(200).json({
    trackedWallet: TRACKED_WALLET,
    minProfitUsd: MIN_PROFIT_USD,
    heliusConfigured: Boolean(HELIUS_API_KEY),
    gmgnConfigured: Boolean(GMGN_API_KEY),
    eventCount: tracker.eventCount || 0,
    lastEventAt: tracker.lastEventAt || null,
    lastAutoAddAt: tracker.lastAutoAddAt || null,
    lastEvent: tracker.lastEvent || null,
    lastError: tracker.lastError || null,
  })
}
