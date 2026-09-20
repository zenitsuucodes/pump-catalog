export type Coin = {
  id: number
  mint: string
  name: string | null
  symbol: string | null
  description: string | null
  imageUri: string | null
  twitter: string | null
  website: string | null
  telegram: string | null
  metadataUri: string | null
  creator: string | null
  tweetText: string
  thoughts: string
  source?: 'manual' | 'auto'
  trackedWallet?: string | null
  realizedProfitUsd?: number | null
  triggerSignature?: string | null
  usdMarketCap: number | null
  peakMarketCap: number | null
  isLive: boolean
  createdTimestamp: number | null
  createdAt: string
  updatedAt: string
}

export type WalletTrade = {
  id: string
  signature: string
  side: 'buy' | 'sell'
  mint: string
  symbol: string | null
  name: string | null
  imageUri: string | null
  profitUsd: number | null
  solDelta: number | null
  isProfitable: boolean
  autoAdded: boolean
  wallet: string
  createdAt: string
}

export type PageId = 'catalog' | 'all-trades' | 'profitable'

export type TrackerEvent = {
  at: string
  side: 'buy' | 'sell'
  mint: string
  symbol: string | null
  name: string | null
  profitUsd: number | null
  autoAdded: boolean
  isProfitable: boolean
}

export type LookupResult = {
  mint: string
  name: string
  symbol: string
  description: string
  imageUri: string | null
  twitter: string | null
  website: string | null
  telegram: string | null
  metadataUri: string | null
  creator: string | null
  usdMarketCap: number | null
  peakMarketCap: number | null
  isLive: boolean
  createdTimestamp: number | null
  twitterHandle: string | null
}
