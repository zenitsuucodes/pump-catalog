import crypto from 'crypto'
import { AUTH_PASSWORD, AUTH_SECRET, AUTH_USERNAME } from './config.js'

const SESSION_MS = 7 * 24 * 60 * 60 * 1000

export function verifyCredentials(username, password) {
  return username === AUTH_USERNAME && password === AUTH_PASSWORD
}

export function createSessionToken(username) {
  const exp = Date.now() + SESSION_MS
  const payload = JSON.stringify({ user: username, exp })
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url')
  return `${Buffer.from(payload).toString('base64url')}.${sig}`
}

export function parseSessionToken(token) {
  if (!token) return null
  const [payloadB64, sig] = token.split('.')
  if (!payloadB64 || !sig) return null

  try {
    const payload = Buffer.from(payloadB64, 'base64url').toString()
    const expected = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url')
    if (sig !== expected) return null

    const data = JSON.parse(payload)
    if (!data.user || typeof data.exp !== 'number' || data.exp < Date.now()) return null
    return data
  } catch {
    return null
  }
}

export function getSessionCookie(req) {
  const cookie = req.headers.cookie || ''
  const match = cookie.match(/(?:^|;\s*)pc_session=([^;]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

export function getSessionFromReq(req) {
  return parseSessionToken(getSessionCookie(req))
}

export function requireAuth(req, res) {
  const session = getSessionFromReq(req)
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }
  return session
}

function isSecureCookie() {
  return process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'
}

export function setSessionCookie(res, token) {
  const maxAge = Math.floor(SESSION_MS / 1000)
  const secure = isSecureCookie() ? '; Secure' : ''
  res.setHeader(
    'Set-Cookie',
    `pc_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`,
  )
}

export function clearSessionCookie(res) {
  const secure = isSecureCookie() ? '; Secure' : ''
  res.setHeader(
    'Set-Cookie',
    `pc_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
  )
}
