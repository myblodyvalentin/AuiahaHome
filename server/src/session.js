import crypto from 'node:crypto'

const COOKIE_NAME = 'auiaha_session'

function b64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function fromB64url(input) {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4))
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/') + pad
  return Buffer.from(normalized, 'base64').toString('utf8')
}

function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url')
}

export function createSessionHelpers({ secret, secure }) {
  if (!secret || secret.length < 16) {
    throw new Error('SESSION_SECRET 必须设置，且长度至少 16 个字符')
  }

  function encodeSession(user) {
    const body = b64url(
      JSON.stringify({
        id: user.id,
        login: user.login,
        name: user.name,
        avatarUrl: user.avatarUrl,
        exp: Date.now() + 1000 * 60 * 60 * 24 * 14,
      })
    )
    const sig = sign(body, secret)
    return `${body}.${sig}`
  }

  function decodeSession(token) {
    if (!token || !token.includes('.')) return null
    const [body, sig] = token.split('.')
    if (!body || !sig) return null
    const expected = sign(body, secret)
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
    try {
      const user = JSON.parse(fromB64url(body))
      if (!user?.id || !user?.login || user.exp < Date.now()) return null
      return {
        id: user.id,
        login: user.login,
        name: user.name || user.login,
        avatarUrl: user.avatarUrl || '',
      }
    } catch {
      return null
    }
  }

  function setSessionCookie(res, user) {
    res.cookie(COOKIE_NAME, encodeSession(user), {
      httpOnly: true,
      sameSite: 'lax',
      secure: Boolean(secure),
      maxAge: 1000 * 60 * 60 * 24 * 14,
      path: '/',
    })
  }

  function clearSessionCookie(res) {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      secure: Boolean(secure),
      path: '/',
    })
  }

  function readUser(req) {
    return decodeSession(req.cookies?.[COOKIE_NAME])
  }

  function requireUser(req, res, next) {
    const user = readUser(req)
    if (!user) {
      res.status(401).json({ error: '请先使用 GitHub 登录' })
      return
    }
    req.user = user
    next()
  }

  return {
    COOKIE_NAME,
    setSessionCookie,
    clearSessionCookie,
    readUser,
    requireUser,
  }
}
