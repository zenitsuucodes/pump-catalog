import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import type { Coin } from './types'
import { AddCoinModal } from './components/AddCoinModal'
import { TokenCard } from './components/TokenCard'

export default function App() {
  const [coins, setCoins] = useState<Coin[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const data = await api.getCoins()
      setCoins(data)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load catalog')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2600)
    return () => clearTimeout(t)
  }, [toast])

  function handleUpdated(coin: Coin) {
    setCoins((prev) => prev.map((c) => (c.id === coin.id ? coin : c)))
  }

  function handleDeleted(id: number) {
    setCoins((prev) => prev.filter((c) => c.id !== id))
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
        <div className="topbar-actions">
          <button type="button" className="btn btn-primary" onClick={() => setShowAdd(true)}>
            + Add CA
          </button>
        </div>
      </header>

      <main className="catalog-main">
        {loading ? (
          <div className="empty-state">
            <h3>Loading tokens…</h3>
          </div>
        ) : error ? (
          <div className="empty-state">
            <h3>Couldn&apos;t load catalog</h3>
            <p>{error}</p>
            <p>Run <code>npm run dev</code> to start the API and frontend.</p>
          </div>
        ) : coins.length === 0 ? (
          <div className="empty-state">
            <h3>No tokens yet</h3>
            <p>Paste a Pump.fun contract address to pull metadata and start cataloging.</p>
            <button type="button" className="btn btn-primary" onClick={() => setShowAdd(true)}>
              + Add your first CA
            </button>
          </div>
        ) : (
          <div className="card-grid">
            {coins.map((coin) => (
              <TokenCard
                key={coin.id}
                coin={coin}
                onUpdated={handleUpdated}
                onDeleted={handleDeleted}
                onToast={setToast}
              />
            ))}
          </div>
        )}
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
