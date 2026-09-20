import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import { nanoid } from 'nanoid'
import { createMessageStore } from './store.js'
import { createSessionHelpers } from './session.js'
import { registerGarden } from './garden.js'

dotenv.config()

const PORT = Number(process.env.PORT || 8787)
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
const BACKEND_URL = (process.env.BACKEND_URL || `http://localhost:${PORT}`).replace(/\/$/, '')
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || ''
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || ''
const CORS_ORIGIN = (process.env.CORS_ORIGIN || FRONTEND_URL)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const AUTH_NEXT_PAGES = new Set(['notes', 'social', 'contact'])

function readAuthNext(req) {
  const next = String(req.cookies?.oauth_next || '')
  return AUTH_NEXT_PAGES.has(next) ? next : 'notes'
}

function authRedirect(res, status, nextPage = 'notes') {
  const page = AUTH_NEXT_PAGES.has(nextPage) ? nextPage : 'notes'
  res.redirect(`${FRONTEND_URL}/#${page}?auth=${status}`)
}

function setAuthNextCookie(res, nextPage) {
  res.cookie('oauth_next', nextPage, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 10,
    path: '/',
  })
}

const store = createMessageStore()
const session = createSessionHelpers({
  secret: process.env.SESSION_SECRET || '',
  secure: process.env.NODE_ENV === 'production',
})

const app = express()
app.set('trust proxy', 1)
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || CORS_ORIGIN.includes(origin)) {
        callback(null, true)
        return
      }
      callback(new Error(`CORS blocked: ${origin}`))
    },
    credentials: true,
  })
)
app.use(express.json({ limit: '8kb' }))
app.use(cookieParser())

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    dataFile: store.filePath,
    githubConfigured: Boolean(GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET),
  })
})

app.get('/api/auth/me', (req, res) => {
  const user = session.readUser(req)
  res.json({ user })
})

app.get('/api/auth/github', (req, res) => {
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    res.status(500).send('未配置 GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET，请先填写 server/.env')
    return
  }

  const nextPage = AUTH_NEXT_PAGES.has(String(req.query.next || ''))
    ? String(req.query.next)
    : 'notes'
  setAuthNextCookie(res, nextPage)

  const state = nanoid(16)
  res.cookie('oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 10,
    path: '/',
  })

  const redirectUri = `${BACKEND_URL}/api/auth/github/callback`
  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', GITHUB_CLIENT_ID)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', 'read:user')
  url.searchParams.set('state', state)
  res.redirect(url.toString())
})

app.get('/api/auth/github/callback', async (req, res) => {
  try {
    const { code, state } = req.query
    const savedState = req.cookies?.oauth_state
    const nextPage = readAuthNext(req)
    res.clearCookie('oauth_state', { path: '/' })
    res.clearCookie('oauth_next', { path: '/' })

    if (!code || !state || !savedState || state !== savedState) {
      authRedirect(res, 'error', nextPage)
      return
    }

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${BACKEND_URL}/api/auth/github/callback`,
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      authRedirect(res, 'error', nextPage)
      return
    }

    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'AuiahaHome-Guestbook',
      },
    })
    const ghUser = await userRes.json()
    if (!ghUser?.id || !ghUser?.login) {
      authRedirect(res, 'error', nextPage)
      return
    }

    session.setSessionCookie(res, {
      id: ghUser.id,
      login: ghUser.login,
      name: ghUser.name || ghUser.login,
      avatarUrl: ghUser.avatar_url || '',
    })

    authRedirect(res, 'ok', nextPage)
  } catch {
    authRedirect(res, 'error', 'notes')
  }
})

app.post('/api/auth/logout', (req, res) => {
  session.clearSessionCookie(res)
  res.json({ ok: true })
})

app.get('/api/messages', (_req, res) => {
  res.json({ messages: store.list() })
})

app.post('/api/messages', session.requireUser, (req, res) => {
  const body = String(req.body?.body || '').trim()
  if (body.length < 2) {
    res.status(400).json({ error: '留言至少 2 个字' })
    return
  }
  if (body.length > 500) {
    res.status(400).json({ error: '留言最多 500 字' })
    return
  }

  const message = store.add({
    id: nanoid(12),
    body,
    createdAt: new Date().toISOString(),
    user: {
      id: req.user.id,
      login: req.user.login,
      name: req.user.name,
      avatarUrl: req.user.avatarUrl,
    },
  })

  res.status(201).json({ message })
})

app.delete('/api/messages/:id', session.requireUser, (req, res) => {
  const ok = store.remove(req.params.id, req.user.id)
  if (!ok) {
    res.status(404).json({ error: '未找到可删除的留言（只能删除自己的）' })
    return
  }
  res.json({ ok: true })
})

const garden = registerGarden(app, { session })

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: err.message || '服务器错误' })
})

app.listen(PORT, () => {
  console.log(`[auiaha-server] http://localhost:${PORT}`)
  console.log(`[auiaha-server] data -> ${store.filePath}`)
  console.log(`[auiaha-server] flowers -> ${garden.store.filePath}`)
  console.log(`[auiaha-server] uploads -> ${garden.uploadDir}`)
  console.log(`[auiaha-server] frontend -> ${FRONTEND_URL}`)
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    console.warn('[auiaha-server] 警告：尚未配置 GitHub OAuth，登录不可用')
  }
})
