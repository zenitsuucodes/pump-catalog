import { readFileSync } from 'fs'
import { extractWalletTradeEventsFromPayload } from '../api/_lib/helius-parse.js'
import { processHeliusPayload } from '../api/_lib/wallet-tracker.js'

try {
  const env = readFileSync('.env.local', 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
} catch {
  /* ignore */
}

const MINT = '29WZcqCEHwvSW1ZjTkBiudtKm7iiDqqwD7tHvi3Tpump'
const WALLET = process.env.TRACKED_WALLET || '4mugTfk3Aw5X4rNTw8w3fgdAtKo76FVM4a8c9PNS1zSh'
const KEY = process.env.HELIUS_API_KEY

const url = new URL(`https://api.helius.xyz/v0/addresses/${WALLET}/transactions`)
url.searchParams.set('api-key', KEY)
url.searchParams.set('limit', '40')

const txs = await fetch(url).then((r) => r.json())
const matching = txs.filter((tx) => (tx.tokenTransfers || []).some((t) => t.mint === MINT))

console.log('processing', matching.length, 'txs for mint')
const result = await processHeliusPayload(matching)
console.log(JSON.stringify(result, null, 2))

const events = extractWalletTradeEventsFromPayload(matching)
console.log(
  'events for mint',
  events.filter((e) => e.mint === MINT),
)
