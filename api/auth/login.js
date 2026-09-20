import {
  createSessionToken,
  setSessionCookie,
  verifyCredentials,
} from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const username = String(req.body?.username || '').trim()
  const password = String(req.body?.password || '')

  if (!verifyCredentials(username, password)) {
    return res.status(401).json({ error: 'Invalid username or password' })
  }

  const token = createSessionToken(username)
  setSessionCookie(res, token)
  return res.status(200).json({ ok: true, user: username })
}
