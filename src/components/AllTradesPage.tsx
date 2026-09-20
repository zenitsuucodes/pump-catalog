import type { Coin, WalletTrade } from '../types'
import { CardGrid } from './CardGrid'
import { TradeCard } from './TradeCard'

type Props = {
  trades: WalletTrade[]
  coinsByMint: Map<string, Coin>
  loading: boolean
  onToast: (msg: string) => void
}

export function AllTradesPage({ trades, coinsByMint, loading, onToast }: Props) {
  return (
    <CardGrid
      title="All wallet trades"
      subtitle="Every buy and sell from the tracked wallet."
      loading={loading}
      loadingMessage="Loading trades…"
      emptyMessage="No trades recorded yet. Once Helius starts sending events, they will appear here."
      count={trades.length}
    >
      {trades.map((trade) => (
        <TradeCard
          key={trade.id}
          trade={trade}
          coin={coinsByMint.get(trade.mint) ?? null}
          onToast={onToast}
        />
      ))}
    </CardGrid>
  )
}
