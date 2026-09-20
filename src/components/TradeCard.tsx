import type { Coin, WalletTrade } from '../types'
import { CoinImage } from './CoinImage'
import { formatAge, formatMarketCap, twitterHandle } from '../utils'
import { copyText } from '../utils'

type Props = {
  trade: WalletTrade
  coin?: Coin | null
  onToast: (msg: string) => void
}

function formatProfit(value: number | null | undefined) {
  if (value == null) return '—'
  const sign = value >= 0 ? '+' : ''
  return `${sign}$${value.toFixed(0)}`
}

function shortSig(sig: string) {
  return `${sig.slice(0, 6)}…${sig.slice(-4)}`
}

export function TradeCard({ trade, coin, onToast }: Props) {
  const imageUri = coin?.imageUri ?? trade.imageUri
  const symbol = coin?.symbol ?? trade.symbol
  const name = coin?.name ?? trade.name
  const mcap = coin?.usdMarketCap ?? null
  const peak = coin?.peakMarketCap ?? null
  const timestamp = coin?.createdTimestamp ?? new Date(trade.createdAt).getTime()
  const handle = twitterHandle(coin?.twitter ?? null)
  const tweetText = coin?.tweetText ?? ''
  const thoughts = coin?.thoughts ?? ''

  return (
    <article className={`token-card trade-card trade-card-${trade.side}`}>
      <div className="token-hero">
        <CoinImage uri={imageUri} symbol={symbol} className="token-hero-img" />
        <div className="token-hero-overlay" />
        <div className="token-hero-top">
          <span className={`side-pill side-${trade.side}`}>{trade.side.toUpperCase()}</span>
          <span className="age-badge">{formatAge(timestamp)}</span>
        </div>
        <div className="token-hero-bottom">
          {trade.side === 'sell' ? (
            <>
              <span className="mcap-label">Realized PnL</span>
              <span
                className={`mcap-value trade-pnl-hero${
                  trade.profitUsd != null && trade.profitUsd >= 0 ? ' positive' : ' negative'
                }`}
              >
                {formatProfit(trade.profitUsd)}
              </span>
            </>
          ) : (
            <>
              <span className="mcap-label">SOL spent</span>
              <span className="mcap-value">
                {trade.solDelta != null ? `${Math.abs(trade.solDelta).toFixed(3)} SOL` : '—'}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="token-body">
        <div className="token-platform-row">
          <span className="platform-pill">
            <span className="pill-icon">💊</span>
            Pump.fun
          </span>
          <a
            className="curve-link"
            href={`https://pump.fun/coin/${trade.mint}`}
            target="_blank"
            rel="noreferrer"
          >
            Open curve
          </a>
        </div>

        <div className="token-title-row">
          <div className="token-title-wrap">
            <div className="token-ticker">${symbol || '???'}</div>
            <div className="token-name-row">
              <h3 className="token-name">{name || 'Unknown token'}</h3>
              {trade.side === 'sell' && trade.isProfitable && (
                <span className="auto-badge">Profitable</span>
              )}
              {trade.side === 'buy' && trade.autoAdded && (
                <span className="auto-badge">In catalog</span>
              )}
              {peak != null && <span className="peak-badge">Peak {formatMarketCap(peak)}</span>}
            </div>
          </div>
          <button
            type="button"
            className="icon-square"
            title="Copy contract address"
            onClick={async () => {
              const ok = await copyText(trade.mint)
              onToast(ok ? 'CA copied' : 'Copy failed')
            }}
          >
            ⧉
          </button>
        </div>

        {mcap != null && (
          <div className="trade-mcap-row">
            <span className="trade-mcap-label">Market cap</span>
            <span className="trade-mcap-value">{formatMarketCap(mcap)}</span>
          </div>
        )}

        {(tweetText || handle) && (
          <div className="content-box read-only">
            <div className="content-box-header">
              <span className="content-box-label">
                {handle ? (
                  <>
                    <span className="x-icon">𝕏</span> {handle}
                  </>
                ) : (
                  'Tweet text'
                )}
              </span>
            </div>
            <div className="content-box-static">{tweetText || '—'}</div>
          </div>
        )}

        {thoughts && (
          <div className="content-box thoughts-box read-only">
            <div className="content-box-header">
              <span className="content-box-label">Notes</span>
            </div>
            <div className="content-box-static">{thoughts}</div>
          </div>
        )}

        <div className="token-footer">
          <div className="footer-icons">
            <button
              type="button"
              className="footer-icon"
              title="Copy CA"
              onClick={async () => {
                const ok = await copyText(trade.mint)
                onToast(ok ? 'CA copied' : 'Copy failed')
              }}
            >
              ⧉
            </button>
          </div>
          <div className="footer-actions">
            <a
              className="btn-gmgn"
              href={`https://gmgn.ai/sol/token/${trade.mint}`}
              target="_blank"
              rel="noreferrer"
            >
              GMGN
            </a>
            <a
              className="btn-open"
              href={`https://solscan.io/tx/${trade.signature}`}
              target="_blank"
              rel="noreferrer"
            >
              {shortSig(trade.signature)} ↗
            </a>
          </div>
        </div>
      </div>
    </article>
  )
}
