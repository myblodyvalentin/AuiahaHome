export function createAdmin() {
  const logins = String(process.env.ADMIN_GITHUB_LOGIN || 'myblodyvalentin')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  const ids = String(process.env.ADMIN_GITHUB_ID || '233668318')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  function isAdmin(user) {
    if (!user) return false
    const login = String(user.login || '').toLowerCase()
    const id = String(user.id || '')
    return logins.includes(login) || ids.includes(id)
  }

  function requireAdmin(req, res, next) {
    const user = req.user
    if (!user) {
      res.status(401).json({ error: '请先使用 GitHub 登录' })
      return
    }
    if (!isAdmin(user)) {
      res.status(403).json({ error: '只有管理员可以审核' })
      return
    }
    next()
  }

  return { isAdmin, requireAdmin }
}
