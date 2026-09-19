import type { Coin, LookupResult } from './types'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return data as T
}

export const api = {
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
}
