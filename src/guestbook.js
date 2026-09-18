const API_BASE = import.meta.env.VITE_API_BASE || '/api'

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    throw new Error(data?.error || `请求失败 (${res.status})`)
  }
  return data
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatTime(iso) {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function renderMessage(message, currentUser) {
  const canDelete = currentUser && currentUser.id === message.user?.id
  const name = escapeHtml(message.user?.name || message.user?.login || '访客')
  const login = escapeHtml(message.user?.login || '')
  const avatar = escapeHtml(message.user?.avatarUrl || '')
  const body = escapeHtml(message.body)
  const time = escapeHtml(formatTime(message.createdAt))

  return `
    <article class="guestbook__item" data-id="${escapeHtml(message.id)}">
      <img class="guestbook__avatar" src="${avatar}" alt="" width="40" height="40" loading="lazy" />
      <div class="guestbook__body">
        <div class="guestbook__meta">
          <a
            class="guestbook__author"
            href="https://github.com/${login}"
            target="_blank"
            rel="noopener noreferrer"
          >${name}</a>
          <time datetime="${escapeHtml(message.createdAt)}">${time}</time>
        </div>
        <p class="guestbook__text">${body}</p>
        ${
          canDelete
            ? `<button class="guestbook__delete" type="button" data-delete="${escapeHtml(message.id)}">删除</button>`
            : ''
        }
      </div>
    </article>`
}

export function initGuestbook(root) {
  if (!root) return

  const loginBtn = root.querySelector('[data-guestbook-login]')
  const logoutBtn = root.querySelector('[data-guestbook-logout]')
  const form = root.querySelector('[data-guestbook-form]')
  const textarea = root.querySelector('[data-guestbook-input]')
  const list = root.querySelector('[data-guestbook-list]')
  const status = root.querySelector('[data-guestbook-status]')
  const userBox = root.querySelector('[data-guestbook-user]')
  const guestBox = root.querySelector('[data-guestbook-guest]')
  const userName = root.querySelector('[data-guestbook-username]')
  const userAvatar = root.querySelector('[data-guestbook-useravatar]')

  let currentUser = null

  function setStatus(message, isError = false) {
    if (!status) return
    status.textContent = message || ''
    status.classList.toggle('is-error', Boolean(isError && message))
  }

  function renderList(messages) {
    if (!list) return
    if (!messages.length) {
      list.innerHTML = `<p class="guestbook__empty">还没有留言，来写第一条吧。</p>`
      return
    }
    list.innerHTML = messages.map((m) => renderMessage(m, currentUser)).join('')
  }

  function syncAuthUi() {
    if (currentUser) {
      if (guestBox) guestBox.hidden = true
      if (userBox) userBox.hidden = false
      if (form) form.hidden = false
      if (userName) userName.textContent = currentUser.name || currentUser.login
      if (userAvatar) {
        userAvatar.src = currentUser.avatarUrl || ''
        userAvatar.alt = currentUser.login || ''
      }
    } else {
      if (guestBox) guestBox.hidden = false
      if (userBox) userBox.hidden = true
      if (form) form.hidden = true
    }
  }

  async function refresh() {
    try {
      const [me, board] = await Promise.all([
        api('/auth/me'),
        api('/messages'),
      ])
      currentUser = me.user
      syncAuthUi()
      renderList(board.messages || [])
      setStatus('')
    } catch (err) {
      setStatus(
        `留言板暂时连不上服务器。请确认已启动 server（${err.message}）`,
        true
      )
      renderList([])
      currentUser = null
      syncAuthUi()
    }
  }

  loginBtn?.addEventListener('click', () => {
    window.location.href = `${API_BASE}/auth/github`
  })

  logoutBtn?.addEventListener('click', async () => {
    try {
      await api('/auth/logout', { method: 'POST', body: '{}' })
      currentUser = null
      syncAuthUi()
      setStatus('已退出登录')
      await refresh()
    } catch (err) {
      setStatus(err.message, true)
    }
  })

  form?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const body = textarea?.value?.trim() || ''
    if (body.length < 2) {
      setStatus('留言至少 2 个字', true)
      return
    }
    try {
      await api('/messages', {
        method: 'POST',
        body: JSON.stringify({ body }),
      })
      if (textarea) textarea.value = ''
      setStatus('留言已发布')
      await refresh()
    } catch (err) {
      setStatus(err.message, true)
    }
  })

  list?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-delete]')
    if (!btn) return
    const id = btn.getAttribute('data-delete')
    if (!id) return
    try {
      await api(`/messages/${id}`, { method: 'DELETE' })
      setStatus('已删除留言')
      await refresh()
    } catch (err) {
      setStatus(err.message, true)
    }
  })

  const params = new URLSearchParams(window.location.hash.split('?')[1] || '')
  if (params.get('auth') === 'ok') setStatus('GitHub 登录成功，可以留言了')
  if (params.get('auth') === 'error') setStatus('GitHub 登录失败，请检查 OAuth 配置', true)

  refresh()
}
