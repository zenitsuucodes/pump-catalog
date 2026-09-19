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
  usdMarketCap: number | null
  peakMarketCap: number | null
  isLive: boolean
  createdTimestamp: number | null
  createdAt: string
  updatedAt: string
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
