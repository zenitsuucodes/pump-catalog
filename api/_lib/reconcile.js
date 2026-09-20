import { MIN_PROFIT_USD, TRACKED_WALLET } from './config.js'
import {
  catalogCoinFromWalletBuy,
  updateAutoCoinProfit,
} from './coins.js'
import { syncCatalogPnL } from './pnl-sync.js'
import { loadGmgnTradeData, resolveGmgnSellPnl } from './gmgn.js'
import {
  getTrackerState,
  listTrades,
  markAutoAdded,
  saveTrackerState,
  updateTrade,
  wasAutoAdded,
} from './tracker-state.js'

export async function reconcileTrackerData() {
  const trades = await listTrades()
  const buys = trades.filter((t) => t.side === 'buy')
  const sells = trades.filter((t) => t.side === 'sell')
  const { sells: gmgnSells, buysByMint } = await loadGmgnTradeData(TRACKED_WALLET)

  const pnlSync = await syncCatalogPnL()

  const results = {
    buysChecked: buys.length,
    sellsChecked: sells.length,
    catalogSynced: 0,
    tradesUpdated: 0,
    coinsUpdated: pnlSync.updated,
    gmgnMatches: gmgnSells.size,
    errors: [],
  }

  for (const trade of buys) {
    try {
      await catalogCoinFromWalletBuy({
        mint: trade.mint,
        signature: trade.signature,
        wallet: TRACKED_WALLET,
      })
      if (!(await wasAutoAdded(trade.mint))) {
        await markAutoAdded(trade.mint)
      }
      await updateTrade(trade.id, { autoAdded: true })
      results.catalogSynced += 1
    } catch (err) {
      results.errors.push({
        mint: trade.mint,
        signature: trade.signature,
        error: err.message || 'catalog sync failed',
      })
    }
  }

  for (const trade of sells) {
    const activity = gmgnSells.get(trade.signature)
    const profitUsd = activity ? resolveGmgnSellPnl(activity, buysByMint) : null

    if (profitUsd == null) {
      results.errors.push({
        mint: trade.mint,
        symbol: trade.symbol,
        signature: trade.signature,
        error: 'GMGN PnL unavailable',
      })
      continue
    }

    const isProfitable = profitUsd >= MIN_PROFIT_USD

    await updateTrade(trade.id, {
      profitUsd,
      isProfitable,
      autoAdded: false,
    })
    results.tradesUpdated += 1

    if (await wasAutoAdded(trade.mint)) {
      await updateAutoCoinProfit(trade.mint, profitUsd, trade.signature)
    }
  }

  const tracker = await getTrackerState()
  tracker.autoAddedMints = buys.map((t) => t.mint).filter((mint, i, arr) => arr.indexOf(mint) === i)
  await saveTrackerState(tracker)

  return results
}
