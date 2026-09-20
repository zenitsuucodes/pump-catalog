import type { Coin, LookupResult, TrackerEvent, WalletTrade } from './types'

export class AuthError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'AuthError'
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) {
    throw new AuthError(data.error || 'Unauthorized')
  }
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return data as T
}

export const api = {
  getSession: () => request<{ authenticated: boolean; user?: string }>('/api/auth/me'),
  login: (username: string, password: string) =>
    request<{ ok: boolean; user: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  getCoins: () => request<Coin[]>('/api/coins'),
  addCoin: (payload: {
    mint: string
    tweetText?: string
    thoughts?: string
    manual?: boolean
    manualMeta?: {
      name?: string
      symbol?: string
      description?: string
      imageUri?: string
      twitter?: string
      website?: string
      telegram?: string
    }
  }) =>
    request<Coin>('/api/coins', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateCoin: (
    id: number,
    patch: Partial<{
      tweetText: string
      thoughts: string
    }>,
  ) =>
    request<Coin>(`/api/coins/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  refreshCoin: (id: number) =>
    request<Coin>(`/api/coins/${id}/refresh`, { method: 'POST' }),
  deleteCoin: (id: number) =>
    request<{ ok: boolean }>(`/api/coins/${id}`, { method: 'DELETE' }),
  lookup: (mint: string) => request<LookupResult>(`/api/lookup/${mint}`),
  getTrackerStatus: () =>
    request<{
      trackedWallet: string
      minProfitUsd: number
      heliusConfigured: boolean
      gmgnConfigured: boolean
      lastEventAt: string | null
      lastAutoAddAt: string | null
      lastEvent: TrackerEvent | null
      eventCount: number
    }>('/api/tracker/status'),
  watchTracker: (since: number) =>
    request<{
      changed: boolean
      version: number
      lastEventAt: string | null
      lastEvent: TrackerEvent | null
    }>(`/api/tracker/watch?since=${since}`),
  getTrades: (filter: 'all' | 'profitable' = 'all') =>
    request<{ filter: string; minProfitUsd: number; count: number; trades: WalletTrade[] }>(
      `/api/tracker/trades?filter=${filter}`,
    ),
  getProfitableCatalog: () =>
    request<{ count: number; minProfitUsd: number; coins: Coin[] }>(
      '/api/tracker/profitable-catalog',
    ),
}
