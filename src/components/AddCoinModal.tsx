import { useState, type FormEvent } from 'react'
import { api } from '../api'
import type { LookupResult } from '../types'
import { formatMarketCap } from '../utils'
import { CoinImage } from './CoinImage'

type Props = {
  onClose: () => void
  onAdded: () => void
}

export function AddCoinModal({ onClose, onAdded }: Props) {
  const [mode, setMode] = useState<'fetch' | 'manual'>('fetch')
  const [mint, setMint] = useState('')
  const [tweetText, setTweetText] = useState('')
  const [thoughts, setThoughts] = useState('')
  const [preview, setPreview] = useState<LookupResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [imageUri, setImageUri] = useState('')
  const [twitter, setTwitter] = useState('')
  const [website, setWebsite] = useState('')
  const [telegram, setTelegram] = useState('')
  const [description, setDescription] = useState('')

  async function handleLookup() {
    setError('')
    setPreview(null)
    const ca = mint.trim()
    if (ca.length < 32) {
      setError('Paste a full Solana mint / contract address.')
      return
    }
    setLoading(true)
    try {
      const data = await api.lookup(ca)
      setPreview(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const ca = mint.trim()
    if (ca.length < 32) {
      setError('Paste a full Solana mint / contract address.')
      return
    }
    setLoading(true)
    try {
      if (mode === 'fetch') {
        await api.addCoin({ mint: ca, tweetText, thoughts })
      } else {
        await api.addCoin({
          mint: ca,
          tweetText,
          thoughts,
          manual: true,
          manualMeta: {
            name: name.trim() || 'Unknown',
            symbol: symbol.trim() || '???',
            description,
            imageUri: imageUri.trim() || undefined,
            twitter: twitter.trim() || undefined,
            website: website.trim() || undefined,
            telegram: telegram.trim() || undefined,
          },
        })
      }
      onAdded()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save token')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="overlay" onClick={onClose} role="presentation">
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <h2>Add Pump.fun token</h2>
        <p className="modal-sub">
          Paste a contract address — we&apos;ll pull the image, ticker, name, market cap, and social links.
        </p>

        <div className="tabs">
          <button
            type="button"
            className={`tab${mode === 'fetch' ? ' active' : ''}`}
            onClick={() => setMode('fetch')}
          >
            Fetch from Pump.fun
          </button>
          <button
            type="button"
            className={`tab${mode === 'manual' ? ' active' : ''}`}
            onClick={() => setMode('manual')}
          >
            Add manually
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="mint">Contract address (CA)</label>
            <input
              id="mint"
              value={mint}
              onChange={(e) => setMint(e.target.value)}
              placeholder="Solana mint address…"
              autoFocus
              spellCheck={false}
            />
          </div>

          {mode === 'fetch' && (
            <>
              <div className="form-actions" style={{ marginTop: 0, justifyContent: 'flex-start' }}>
                <button type="button" className="btn btn-ghost" onClick={handleLookup} disabled={loading}>
                  {loading ? 'Looking up…' : 'Preview metadata'}
                </button>
              </div>
              {preview && (
                <div className="preview-card">
                  <CoinImage uri={preview.imageUri} symbol={preview.symbol} className="preview-img" />
                  <div>
                    <strong>{preview.name}</strong>
                    <span>${preview.symbol}</span>
                    <span className="preview-mcap">
                      MCap {formatMarketCap(preview.usdMarketCap)}
                      {preview.peakMarketCap != null && ` · Peak ${formatMarketCap(preview.peakMarketCap)}`}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {mode === 'manual' && (
            <>
              <div className="field">
                <label htmlFor="symbol">Ticker</label>
                <input id="symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="PEPE" />
              </div>
              <div className="field">
                <label htmlFor="name">Name</label>
                <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Token name" />
              </div>
              <div className="field">
                <label htmlFor="imageUri">Image URL</label>
                <input id="imageUri" value={imageUri} onChange={(e) => setImageUri(e.target.value)} placeholder="https://…" />
              </div>
              <div className="field">
                <label htmlFor="twitter">Tweet / X link</label>
                <input id="twitter" value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="https://x.com/…" />
              </div>
              <div className="field">
                <label htmlFor="website">Website</label>
                <input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
              </div>
              <div className="field">
                <label htmlFor="telegram">Telegram</label>
                <input id="telegram" value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="https://t.me/…" />
              </div>
              <div className="field">
                <label htmlFor="description">Description</label>
                <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </>
          )}

          <div className="field">
            <label htmlFor="tweetText">Tweet text</label>
            <textarea
              id="tweetText"
              value={tweetText}
              onChange={(e) => setTweetText(e.target.value)}
              placeholder="What did the tweet say?"
            />
          </div>

          <div className="field">
            <label htmlFor="thoughts">My thoughts</label>
            <textarea
              id="thoughts"
              value={thoughts}
              onChange={(e) => setThoughts(e.target.value)}
              placeholder="Initial notes on this launch…"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding…' : 'Add token'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
