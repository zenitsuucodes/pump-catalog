import type { Coin } from '../types'
import { CardGrid } from './CardGrid'
import { TokenCard } from './TokenCard'

type Props = {
  coins: Coin[]
  loading: boolean
  error: string
  onAdd: () => void
  onUpdated: (coin: Coin) => void
  onDeleted: (id: number) => void
  onToast: (msg: string) => void
}

export function CatalogPage({
  coins,
  loading,
  error,
  onAdd,
  onUpdated,
  onDeleted,
  onToast,
}: Props) {
  if (error) {
    return (
      <div className="catalog-page">
        <div className="empty-state">
          <h3>Couldn&apos;t load catalog</h3>
          <p>{error}</p>
          <p>Run <code>npm run dev</code> to start the API and frontend.</p>
        </div>
      </div>
    )
  }

  if (!loading && coins.length === 0) {
    return (
      <div className="catalog-page">
        <div className="page-heading">
          <h2>Catalog</h2>
          <p>Every token the tracked wallet buys, plus anything you add manually.</p>
        </div>
        <div className="empty-state compact">
          <p>Paste a Pump.fun contract address to pull metadata and start cataloging.</p>
          <button type="button" className="btn btn-primary" onClick={onAdd}>
            + Add your first CA
          </button>
        </div>
      </div>
    )
  }

  return (
    <CardGrid
      title="Catalog"
      subtitle="Every token the tracked wallet buys, plus anything you add manually."
      loading={loading}
      loadingMessage="Loading tokens…"
      emptyMessage="No tokens yet."
      count={coins.length}
    >
      {coins.map((coin) => (
        <TokenCard
          key={coin.id}
          coin={coin}
          onUpdated={onUpdated}
          onDeleted={onDeleted}
          onToast={onToast}
        />
      ))}
    </CardGrid>
  )
}
