import { MIN_PROFIT_USD, TRACKED_WALLET } from './config.js'
import { listCoins, updateCoinProfit } from './coins.js'
import { loadGmgnTradeData, resolveGmgnSellPnl } from './gmgn.js'
import { listTrades } from './tracker-state.js'

export async function syncCatalogPnL() {
  const trades = await listTrades()
  const sells = trades.filter((t) => t.side === 'sell')
  const { sells: gmgnSells, buysByMint } = await loadGmgnTradeData(TRACKED_WALLET)

  const latestSellByMint = new Map()
  for (const sell of sells) {
    const prev = latestSellByMint.get(sell.mint)
    if (!prev || new Date(sell.createdAt) > new Date(prev.createdAt)) {
      latestSellByMint.set(sell.mint, sell)
    }
  }

  const coins = await listCoins()
  let updated = 0

  for (const coin of coins) {
    const sell = latestSellByMint.get(coin.mint)
    if (!sell) continue

    const activity = gmgnSells.get(sell.signature)
    const profitUsd = activity
      ? resolveGmgnSellPnl(activity, buysByMint)
      : sell.profitUsd

    if (profitUsd == null) continue

    await updateCoinProfit(coin.mint, profitUsd, sell.signature)
    updated += 1
  }

  return { updated, catalogSize: coins.length }
}

export async function listProfitableCatalogCoins() {
  await syncCatalogPnL()
  const coins = await listCoins()
  const profitable = coins.filter(
    (c) => c.realizedProfitUsd != null && c.realizedProfitUsd >= MIN_PROFIT_USD,
  )
  return { coins: profitable, minProfitUsd: MIN_PROFIT_USD, count: profitable.length }
}
