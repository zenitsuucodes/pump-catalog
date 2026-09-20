import { readFileSync } from 'fs'
import { extractWalletTradeEventsFromPayload } from '../api/_lib/helius-parse.js'

try {
  const env = readFileSync('.env.local', 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
} catch {
  /* no local env */
}

const MINT = process.argv[2] || '29WZcqCEHwvSW1ZjTkBiudtKm7iiDqqwD7tHvi3Tpump'
const WALLET = process.env.TRACKED_WALLET || '4mugTfk3Aw5X4rNTw8w3fgdAtKo76FVM4a8c9PNS1zSh'
const KEY = process.env.HELIUS_API_KEY

if (!KEY) {
  console.error('Missing HELIUS_API_KEY')
  process.exit(1)
}

const url = new URL(`https://api.helius.xyz/v0/addresses/${WALLET}/transactions`)
url.searchParams.set('api-key', KEY)
url.searchParams.set('limit', '50')

const res = await fetch(url, { headers: { Accept: 'application/json' } })
const txs = await res.json()

if (!Array.isArray(txs)) {
  console.log('fetch failed', res.status, txs)
  process.exit(1)
}

console.log('recent tx count', txs.length)

const matches = txs.filter((tx) => {
  const mints = (tx.tokenTransfers || []).map((t) => t.mint)
  return mints.includes(MINT) || tx.signature?.includes(MINT)
})

console.log('matching txs', matches.length)

for (const tx of matches) {
  console.log('\n--- tx ---')
  console.log('signature', tx.signature)
  console.log('timestamp', tx.timestamp, tx.timestamp ? new Date(tx.timestamp * 1000).toISOString() : null)
  console.log('type', tx.type, tx.source)
  console.log('description', tx.description)
  console.log('tokenTransfers', JSON.stringify(tx.tokenTransfers, null, 2))
  console.log('accountData wallet native', tx.accountData?.find((a) => a.account === WALLET)?.nativeBalanceChange)
  const events = extractWalletTradeEventsFromPayload([tx])
  console.log('parsed events', JSON.stringify(events, null, 2))
}

if (matches.length === 0) {
  console.log('\nNo direct match. Last 10 wallet swaps:')
  for (const tx of txs.slice(0, 10)) {
    const mints = (tx.tokenTransfers || []).map((t) => `${t.mint?.slice(0, 8)}…`).join(', ')
    console.log(
      new Date((tx.timestamp || 0) * 1000).toISOString(),
      tx.type,
      tx.signature?.slice(0, 16),
      mints || '(no token transfer)',
    )
  }
}
