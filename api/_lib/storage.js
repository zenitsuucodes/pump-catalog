import { Redis } from '@upstash/redis'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const COINS_KEY = 'catalog:coins'
const NEXT_ID_KEY = 'catalog:nextId'

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
      ? new Redis({
          url: process.env.KV_REST_API_URL,
          token: process.env.KV_REST_API_TOKEN,
        })
      : null

const useRedis = Boolean(redis)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const localFile = path.join(__dirname, '../../server/data/catalog.json')

function readLocal() {
  try {
    if (fs.existsSync(localFile)) {
      return JSON.parse(fs.readFileSync(localFile, 'utf8'))
    }
  } catch {
    /* ignore */
  }
  return { coins: [], nextId: 1 }
}

function writeLocal(data) {
  fs.mkdirSync(path.dirname(localFile), { recursive: true })
  fs.writeFileSync(localFile, JSON.stringify(data, null, 2))
}

export async function getStore() {
  if (useRedis) {
    const [coins, nextId] = await Promise.all([redis.get(COINS_KEY), redis.get(NEXT_ID_KEY)])
    return { coins: coins || [], nextId: nextId || 1 }
  }
  return readLocal()
}

export async function saveStore(store) {
  if (useRedis) {
    await Promise.all([redis.set(COINS_KEY, store.coins), redis.set(NEXT_ID_KEY, store.nextId)])
    return
  }
  writeLocal(store)
}

export function nowIso() {
  return new Date().toISOString()
}
