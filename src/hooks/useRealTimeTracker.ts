import { useEffect, useRef } from 'react'
import { api, AuthError } from '../api'
import type { TrackerEvent } from '../types'

type Options = {
  enabled: boolean
  onUpdate: () => void
  onEvent?: (event: TrackerEvent) => void
  onConnectionChange?: (connected: boolean) => void
}

/** Short client polls — avoid long-held Fluid instances (GB-Hrs). */
const POLL_MS = 12_000
const HIDDEN_POLL_MS = 60_000

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

export function useRealTimeTracker({
  enabled,
  onUpdate,
  onEvent,
  onConnectionChange,
}: Options) {
  const versionRef = useRef(0)
  const onUpdateRef = useRef(onUpdate)
  const onEventRef = useRef(onEvent)
  const onConnectionChangeRef = useRef(onConnectionChange)

  onUpdateRef.current = onUpdate
  onEventRef.current = onEvent
  onConnectionChangeRef.current = onConnectionChange

  useEffect(() => {
    if (!enabled) return

    const controller = new AbortController()
    let cancelled = false

    async function tick() {
      const status = await api.getTrackerStatus()
      const version = status.eventCount || 0
      const prev = versionRef.current

      if (prev === 0) {
        versionRef.current = version
        return
      }

      if (version > prev) {
        versionRef.current = version
        onUpdateRef.current()
        if (status.lastEvent) {
          onEventRef.current?.(status.lastEvent)
        }
      }
    }

    async function loop() {
      onConnectionChangeRef.current?.(true)

      while (!cancelled) {
        try {
          if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
            await sleep(HIDDEN_POLL_MS, controller.signal)
            continue
          }

          await tick()
          onConnectionChangeRef.current?.(true)
          await sleep(POLL_MS, controller.signal)
        } catch (err) {
          if (cancelled || (err instanceof DOMException && err.name === 'AbortError')) break
          if (err instanceof AuthError) break
          onConnectionChangeRef.current?.(false)
          try {
            await sleep(5000, controller.signal)
          } catch {
            break
          }
        }
      }

      onConnectionChangeRef.current?.(false)
    }

    loop()

    const onVisible = () => {
      if (document.visibilityState === 'visible' && !cancelled) {
        tick().catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      controller.abort()
      document.removeEventListener('visibilitychange', onVisible)
      onConnectionChangeRef.current?.(false)
    }
  }, [enabled])
}
