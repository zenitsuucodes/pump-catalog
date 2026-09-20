import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, AuthError } from './api'
import type { Coin, PageId, TrackerEvent } from './types'
import { AddCoinModal } from './components/AddCoinModal'
import { AllTradesPage } from './components/AllTradesPage'
import { CatalogPage } from './components/CatalogPage'
import { LoginPage } from './components/LoginPage'
import { ProfitablePage } from './components/ProfitablePage'
import { useRealTimeTracker } from './hooks/useRealTimeTracker'

function formatTrackerEvent(event: TrackerEvent): string {
  const label = event.symbol ? `$${event.symbol}` : event.name || event.mint.slice(0, 6)
  if (event.side === 'buy') {
    return event.autoAdded ? `New buy · ${label} added to catalog` : `New buy · ${label}`
  }
  if (event.profitUsd != null) {
    const sign = event.profitUsd >= 0 ? '+' : ''
    return `Sell · ${label} ${sign}$${event.profitUsd.toFixed(0)}${event.isProfitable ? ' ✓' : ''}`
  }
  return `New sell · ${label}`
}

const PAGES: { id: PageId; label: string }[] = [
  { id: 'catalog', label: 'Catalog' },
  { id: 'all-trades', label: 'All Trades' },
  { id: 'profitable', label: 'Profitable' },
]

function pageFromHash(): PageId {
  const hash = window.location.hash.replace(/^#\/?/, '')
  if (hash === 'trades' || hash === 'all-trades') return 'all-trades'
  if (hash === 'profitable') return 'profitable'
  return 'catalog'
}

function hashForPage(page: PageId) {
  if (page === 'all-trades') return '#/trades'
  if (page === 'profitable') return '#/profitable'
  return ''
}

export default function App() {
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'guest'>('loading')
  const [user, setUser] = useState('')
  const [page, setPage] = useState<PageId>(pageFromHash)
  const [coins, setCoins] = useState<Coin[]>([])
  const [profitableCoins, setProfitableCoins] = useState<Coin[]>([])
  const [allTrades, setAllTrades] = useState<Awaited<ReturnType<typeof api.getTrades>>['trades']>([])
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [loadingTrades, setLoadingTrades] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [trackerWallet, setTrackerWallet] = useState('')
  const [trackerProfit, setTrackerProfit] = useState(100)
  const [liveConnected, setLiveConnected] = useState(false)

  const coinsByMint = useMemo(
    () => new Map(coins.map((coin) => [coin.mint, coin])),
    [coins],
  )

  const refresh = useCallback(async () => {
    try {
      const profitableData = await api.getProfitableCatalog()
      setProfitableCoins(profitableData.coins)
      setTrackerProfit(profitableData.minProfitUsd)

      const [catalogCoins, tradesData] = await Promise.all([
        api.getCoins(),
        api.getTrades('all'),
      ])
      setCoins(catalogCoins)
      setAllTrades(tradesData.trades)
      setError('')
    } catch (err) {
      if (err instanceof AuthError) {
        setAuthState('guest')
        setUser('')
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoadingCatalog(false)
      setLoadingTrades(false)
    }
  }, [])

  useEffect(() => {
    api.getSession()
      .then((session) => {
        if (session.authenticated && session.user) {
          setUser(session.user)
          setAuthState('authenticated')
        } else {
          setAuthState('guest')
        }
      })
      .catch(() => setAuthState('guest'))
  }, [])

  useEffect(() => {
    if (authState !== 'authenticated') return
    refresh()
  }, [authState, refresh])

  useEffect(() => {
    if (authState !== 'authenticated') return
    api.getTrackerStatus().then((status) => {
      setTrackerWallet(status.trackedWallet)
      setTrackerProfit(status.minProfitUsd)
    }).catch(() => {})
  }, [authState])

  useRealTimeTracker({
    enabled: authState === 'authenticated' && Boolean(trackerWallet),
    onUpdate: refresh,
    onEvent: (event) => setToast(formatTrackerEvent(event)),
    onConnectionChange: setLiveConnected,
  })

  useEffect(() => {
    const syncPage = () => setPage(pageFromHash())
    window.addEventListener('hashchange', syncPage)
    window.addEventListener('popstate', syncPage)
    return () => {
      window.removeEventListener('hashchange', syncPage)
      window.removeEventListener('popstate', syncPage)
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2600)
    return () => clearTimeout(t)
  }, [toast])

  function navigate(next: PageId) {
    if (next === page) return
    setPage(next)
    const base = `${window.location.pathname}${window.location.search}`
    const hash = hashForPage(next)
    window.history.replaceState(null, '', hash ? `${base}${hash}` : base)
  }

  function handleUpdated(coin: Coin) {
    setCoins((prev) => prev.map((c) => (c.id === coin.id ? coin : c)))
    setProfitableCoins((prev) => {
      const inList = coin.realizedProfitUsd != null && coin.realizedProfitUsd >= trackerProfit
      if (inList) {
        const exists = prev.some((c) => c.id === coin.id)
        if (exists) return prev.map((c) => (c.id === coin.id ? coin : c))
        return [coin, ...prev]
      }
      return prev.filter((c) => c.id !== coin.id)
    })
  }

  function handleDeleted(id: number) {
    setCoins((prev) => prev.filter((c) => c.id !== id))
    setProfitableCoins((prev) => prev.filter((c) => c.id !== id))
  }

  async function handleSignOut() {
    try {
      await api.logout()
    } catch {
      // Still clear local session if logout request fails.
    }
    setAuthState('guest')
    setUser('')
    setCoins([])
    setProfitableCoins([])
    setAllTrades([])
  }

  if (authState === 'loading') {
    return (
      <div className="login-page">
        <div className="login-card login-loading">Loading…</div>
      </div>
    )
  }

  if (authState === 'guest') {
    return (
      <LoginPage
        onSuccess={(signedInUser) => {
          setUser(signedInUser)
          setAuthState('authenticated')
          setLoadingCatalog(true)
          setLoadingTrades(true)
        }}
      />
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            Pump<span>Catalog</span>
          </div>
          <div className="brand-sub">Track Pump.fun launches — tweet text &amp; your thoughts</div>
        </div>
        <nav className="page-nav">
          {PAGES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`page-nav-btn${page === item.id ? ' active' : ''}`}
              onClick={() => navigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="topbar-actions">
          <span className="user-pill">{user}</span>
          <button type="button" className="btn btn-ghost" onClick={handleSignOut}>
            Sign out
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setShowAdd(true)}>
            + Add CA
          </button>
        </div>
      </header>

      {trackerWallet && (
        <div className="tracker-bar">
          <span className={`tracker-dot${liveConnected ? ' live' : ''}`} />
          <span className="live-label">{liveConnected ? 'Live' : 'Connecting…'}</span>
          Watching wallet <code>{trackerWallet.slice(0, 4)}…{trackerWallet.slice(-4)}</code>
          {' · '}catalogs buys · profitable ≥ ${trackerProfit}
        </div>
      )}

      <main className="catalog-main">
        <div className={`page-panel${page === 'catalog' ? ' is-active' : ''}`}>
          <CatalogPage
            coins={coins}
            loading={loadingCatalog}
            error={error}
            onAdd={() => setShowAdd(true)}
            onUpdated={handleUpdated}
            onDeleted={handleDeleted}
            onToast={setToast}
          />
        </div>

        <div className={`page-panel${page === 'all-trades' ? ' is-active' : ''}`}>
          <AllTradesPage
            trades={allTrades}
            coinsByMint={coinsByMint}
            loading={loadingTrades}
            onToast={setToast}
          />
        </div>

        <div className={`page-panel${page === 'profitable' ? ' is-active' : ''}`}>
          <ProfitablePage
            coins={profitableCoins}
            loading={loadingTrades}
            minProfitUsd={trackerProfit}
            onUpdated={handleUpdated}
            onDeleted={handleDeleted}
            onToast={setToast}
          />
        </div>
      </main>

      {showAdd && (
        <AddCoinModal
          onClose={() => setShowAdd(false)}
          onAdded={async () => {
            await refresh()
            setToast('Token added to catalog')
          }}
        />
      )}

      {toast && <div className="status">{toast}</div>}
    </div>
  )
}
