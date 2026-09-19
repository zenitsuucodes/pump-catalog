import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api'
import type { Coin } from '../types'
import { copyText, formatAge, formatMarketCap, twitterHandle } from '../utils'
import { DeleteWarningModal } from './DeleteWarningModal'

type Props = {
  coin: Coin
  onUpdated: (coin: Coin) => void
  onDeleted: (id: number) => void
  onToast: (msg: string) => void
}

export function TokenCard({ coin, onUpdated, onDeleted, onToast }: Props) {
  const [tweetText, setTweetText] = useState(coin.tweetText)
  const [thoughts, setThoughts] = useState(coin.thoughts)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showDeleteWarning, setShowDeleteWarning] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setTweetText(coin.tweetText)
    setThoughts(coin.thoughts)
  }, [coin.tweetText, coin.thoughts])

  const persist = useCallback(
    async (patch: { tweetText?: string; thoughts?: string }) => {
      setSaving(true)
      try {
        const updated = await api.updateCoin(coin.id, patch)
        onUpdated(updated)
      } catch (err) {
        onToast(err instanceof Error ? err.message : 'Save failed')
      } finally {
        setSaving(false)
      }
    },
    [coin.id, onUpdated, onToast],
  )

  function scheduleSave(field: 'tweetText' | 'thoughts', value: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      persist({ [field]: value })
    }, 700)
  }

  async function handleRefresh() {
    setRefreshing(true)
    try {
      const updated = await api.refreshCoin(coin.id)
      onUpdated(updated)
      onToast('Metadata refreshed')
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Refresh failed')
    } finally {
      setRefreshing(false)
    }
  }

  async function handleDeleteConfirm() {
    setDeleting(true)
    try {
      await api.deleteCoin(coin.id)
      onDeleted(coin.id)
      onToast('Token removed')
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Delete failed')
      setDeleting(false)
    }
  }

  const handle = twitterHandle(coin.twitter)

  return (
    <>
    <article className="token-card">
      <div className="token-hero">
        {coin.imageUri ? (
          <img className="token-hero-img" src={coin.imageUri} alt="" loading="lazy" />
        ) : (
          <div className="token-hero-img placeholder">{(coin.symbol || '?').slice(0, 3)}</div>
        )}
        <div className="token-hero-overlay" />
        <div className="token-hero-top">
          {coin.isLive && (
            <span className="live-badge">
              <span className="live-dot" />
              LIVE
            </span>
          )}
          <span className="age-badge">{formatAge(coin.createdTimestamp)}</span>
        </div>
        <div className="token-hero-bottom">
          <span className="mcap-label">Current market cap</span>
          <span className="mcap-value">{formatMarketCap(coin.usdMarketCap)}</span>
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
            href={`https://pump.fun/coin/${coin.mint}`}
            target="_blank"
            rel="noreferrer"
          >
            Open curve
          </a>
        </div>

        <div className="token-title-row">
          <div className="token-title-wrap">
            <div className="token-ticker">${coin.symbol || '???'}</div>
            <div className="token-name-row">
              <h3 className="token-name">{coin.name || 'Untitled'}</h3>
              {coin.peakMarketCap != null && (
                <span className="peak-badge">Peak {formatMarketCap(coin.peakMarketCap)}</span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="icon-square"
            title="Copy contract address"
            onClick={async () => {
              const ok = await copyText(coin.mint)
              onToast(ok ? 'CA copied' : 'Copy failed')
            }}
          >
            ⧉
          </button>
        </div>

        <div className="content-box">
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
            {coin.twitter && (
              <a className="content-box-action" href={coin.twitter} target="_blank" rel="noreferrer">
                Open X ↗
              </a>
            )}
          </div>
          <textarea
            className="content-box-input"
            value={tweetText}
            onChange={(e) => {
              setTweetText(e.target.value)
              scheduleSave('tweetText', e.target.value)
            }}
            onBlur={() => persist({ tweetText })}
            placeholder="Paste the tweet text that launched this token…"
            rows={3}
          />
        </div>

        <div className="content-box thoughts-box">
          <div className="content-box-header">
            <span className="content-box-label">My thoughts</span>
            {saving && <span className="save-hint">Saving…</span>}
          </div>
          <textarea
            className="content-box-input"
            value={thoughts}
            onChange={(e) => {
              setThoughts(e.target.value)
              scheduleSave('thoughts', e.target.value)
            }}
            onBlur={() => persist({ thoughts })}
            placeholder="Your analysis, narrative angle, what stood out…"
            rows={3}
          />
        </div>

        {coin.description && <p className="token-desc">{coin.description}</p>}

        <div className="token-footer">
          <div className="footer-icons">
            {coin.website && (
              <a className="footer-icon" href={coin.website} target="_blank" rel="noreferrer" title="Website">
                🌐
              </a>
            )}
            <button
              type="button"
              className="footer-icon"
              title="Copy CA"
              onClick={async () => {
                const ok = await copyText(coin.mint)
                onToast(ok ? 'CA copied' : 'Copy failed')
              }}
            >
              ⧉
            </button>
            <button
              type="button"
              className="footer-icon"
              title="Refresh metadata"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              ↻
            </button>
            <button
              type="button"
              className="footer-icon danger"
              title="Remove"
              onClick={() => setShowDeleteWarning(true)}
            >
              ✕
            </button>
          </div>
          <div className="footer-actions">
            <a
              className="btn-gmgn"
              href={`https://gmgn.ai/sol/token/${coin.mint}`}
              target="_blank"
              rel="noreferrer"
            >
              GMGN
            </a>
            <a
              className="btn-open"
              href={`https://pump.fun/coin/${coin.mint}`}
              target="_blank"
              rel="noreferrer"
            >
              Open ↗
            </a>
          </div>
        </div>
      </div>
    </article>

    {showDeleteWarning && (
      <DeleteWarningModal
        symbol={coin.symbol}
        name={coin.name}
        deleting={deleting}
        onCancel={() => {
          if (!deleting) setShowDeleteWarning(false)
        }}
        onConfirm={handleDeleteConfirm}
      />
    )}
    </>
  )
}
