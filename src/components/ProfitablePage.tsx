import type { Coin } from '../types'
import { CardGrid } from './CardGrid'
import { TokenCard } from './TokenCard'

type Props = {
  coins: Coin[]
  loading: boolean
  minProfitUsd: number
  onUpdated: (coin: Coin) => void
  onDeleted: (id: number) => void
  onToast: (msg: string) => void
}

export function ProfitablePage({
  coins,
  loading,
  minProfitUsd,
  onUpdated,
  onDeleted,
  onToast,
}: Props) {
  return (
    <CardGrid
      title="Profitable"
      subtitle={`Catalog tokens where the wallet closed with at least $${minProfitUsd} profit.`}
      loading={loading}
      loadingMessage="Calculating PnL…"
      emptyMessage={`No catalog tokens above $${minProfitUsd} profit yet.`}
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
