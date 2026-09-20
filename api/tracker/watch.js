import { requireAuth } from '../_lib/auth.js'
import { getTrackerState } from '../_lib/tracker-state.js'

/**
 * Lightweight status check for clients.
 * Intentionally does NOT long-poll or scan the wallet — those burned Fluid
 * provisioned memory (instance held ~25s at 2GB per open tab).
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!requireAuth(req, res)) return

  const sinceVersion = Number(req.query.since || 0)
  const tracker = await getTrackerState()
  const version = tracker.eventCount || 0

  return res.status(200).json({
    changed: version > sinceVersion,
    version,
    lastEventAt: tracker.lastEventAt,
    lastEvent: tracker.lastEvent || null,
  })
}
