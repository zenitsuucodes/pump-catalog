import { Redis } from '@upstash/redis'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const COINS_KEY = 'catalog:coins'
const NEXT_ID_KEY = 'catalog:nextId'
const TRACKER_KEY = 'catalog:tracker'

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
  return { coins: [], nextId: 1, tracker: undefined }
}

function writeLocal(data) {
  fs.mkdirSync(path.dirname(localFile), { recursive: true })
  fs.writeFileSync(localFile, JSON.stringify(data, null, 2))
}

export async function getStore() {
  if (useRedis) {
    const [coins, nextId, tracker] = await Promise.all([
      redis.get(COINS_KEY),
      redis.get(NEXT_ID_KEY),
      redis.get(TRACKER_KEY),
    ])
    return { coins: coins || [], nextId: nextId || 1, tracker: tracker || undefined }
  }
  return readLocal()
}

/** Tracker-only read — avoids loading the full coin catalog on status polls. */
export async function getTrackerOnly() {
  if (useRedis) {
    const tracker = await redis.get(TRACKER_KEY)
    return tracker || undefined
  }
  return readLocal().tracker
}

export async function saveStore(store) {
  if (useRedis) {
    const ops = [redis.set(COINS_KEY, store.coins), redis.set(NEXT_ID_KEY, store.nextId)]
    if (store.tracker) ops.push(redis.set(TRACKER_KEY, store.tracker))
    await Promise.all(ops)
    return
  }
  writeLocal(store)
}

export function nowIso() {
  return new Date().toISOString()
}
