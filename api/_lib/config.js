export const TRACKED_WALLET =
  process.env.TRACKED_WALLET || '4mugTfk3Aw5X4rNTw8w3fgdAtKo76FVM4a8c9PNS1zSh'

export const MIN_PROFIT_USD = Number(process.env.MIN_PROFIT_USD || 100)

export const HELIUS_API_KEY = process.env.HELIUS_API_KEY || ''
export const HELIUS_WEBHOOK_SECRET = process.env.HELIUS_WEBHOOK_SECRET || ''
export const GMGN_API_KEY = process.env.GMGN_API_KEY || ''
export const CRON_SECRET = process.env.CRON_SECRET || ''

export const AUTH_USERNAME = process.env.AUTH_USERNAME || 'admin'
export const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'Makeeasymoney1!'
export const AUTH_SECRET =
  process.env.AUTH_SECRET || process.env.CRON_SECRET || 'pump-catalog-auth-secret'

export const GMGN_API_BASE = process.env.GMGN_API_BASE || 'https://openapi.gmgn.ai'

export const SOL_MINT = 'So11111111111111111111111111111111111111112'
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
