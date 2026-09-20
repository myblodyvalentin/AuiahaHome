import './moderation.css'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    cache: 'no-store',
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

function typeLabel(type) {
  return type === 'flower' ? '草地小花' : '留言板'
}

export function initModeration({ section, navItem, badge }) {
  if (!section) return

  const status = section.querySelector('[data-moderation-status]')
  const list = section.querySelector('[data-moderation-list]')
  const guest = section.querySelector('[data-moderation-guest]')
  const board = section.querySelector('[data-moderation-board]')

  function setStatus(message, isError = false) {
    if (!status) return
    status.textContent = message || ''
    status.classList.toggle('is-error', Boolean(isError && message))
  }

  function setAdminVisible(visible) {
    if (navItem) navItem.hidden = !visible
    section.hidden = !visible
    if (guest) guest.hidden = visible
    if (board) board.hidden = !visible
  }

  function setBadge(count) {
    if (!badge) return
    badge.textContent = count > 0 ? String(count).padStart(2, '0') : '07'
  }

  function renderItems(items) {
    if (!list) return
    if (!items.length) {
      list.innerHTML = `<p class="moderation__empty">当前没有待审核内容。</p>`
      return
    }

    list.innerHTML = items
      .map((item) => {
        const name = escapeHtml(item.user?.name || item.user?.login || '访客')
        const login = escapeHtml(item.user?.login || '')
        const avatar = escapeHtml(item.user?.avatarUrl || '')
        const text = escapeHtml(item.type === 'flower' ? item.comment : item.body)
        const hits = (item.hits || [])
          .map((hit) => `<span class="moderation__hit">${escapeHtml(hit)}</span>`)
          .join('')
        const coord =
          item.type === 'flower' && Number.isInteger(item.col) && Number.isInteger(item.row)
            ? `<p class="moderation__meta">草地坐标（${item.col + 1}, ${item.row + 1}）</p>`
            : ''
        const photos = (item.images || [])
          .map(
            (img, index) => `
            <a class="moderation__photo" href="${escapeHtml(img.url)}" target="_blank" rel="noopener noreferrer">
              <img src="${escapeHtml(img.url)}" alt="${name} 的待审图片 ${index + 1}" />
            </a>`
          )
          .join('')

        return `
          <article class="moderation__card" data-review-id="${escapeHtml(item.id)}">
            <header class="moderation__head">
              <img class="moderation__avatar" src="${avatar}" alt="" width="40" height="40" />
              <div>
                <p class="moderation__who">
                  <span class="moderation__type">${typeLabel(item.type)}</span>
                  <a href="https://github.com/${login}" target="_blank" rel="noopener noreferrer">${name}</a>
                </p>
                <time datetime="${escapeHtml(item.createdAt)}">${escapeHtml(formatTime(item.createdAt))}</time>
              </div>
            </header>
            ${coord}
            ${text ? `<p class="moderation__text">${text}</p>` : `<p class="moderation__text is-muted">没有文字，请核对图片。</p>`}
            ${hits ? `<p class="moderation__hits">命中：${hits}</p>` : ''}
            ${photos ? `<div class="moderation__photos">${photos}</div>` : ''}
            <div class="moderation__actions">
              <button class="moderation__btn" type="button" data-approve="${escapeHtml(item.id)}">审核通过</button>
              <button class="moderation__btn moderation__btn--danger" type="button" data-reject="${escapeHtml(item.id)}">不通过并删除</button>
            </div>
          </article>`
      })
      .join('')
  }

  async function refresh() {
    let isAdmin = false
    try {
      const me = await api('/auth/me')
      isAdmin = Boolean(me.isAdmin || me.user?.isAdmin)
      setAdminVisible(isAdmin)
      if (!isAdmin) {
        setBadge(0)
        renderItems([])
        return
      }

      const boardData = await api('/moderation')
      const items = boardData.items || []
      renderItems(items)
      setBadge(items.length)
      setStatus(items.length ? `待审核 ${items.length} 条` : '审核队列是空的')
    } catch (err) {
      if (!isAdmin) {
        setAdminVisible(false)
        setBadge(0)
        renderItems([])
      }
      setStatus(err.message, true)
    }
  }

  list?.addEventListener('click', async (event) => {
    const approve = event.target.closest('[data-approve]')
    const reject = event.target.closest('[data-reject]')
    const id = approve?.getAttribute('data-approve') || reject?.getAttribute('data-reject')
    if (!id) return

    const action = approve ? 'approve' : 'reject'
    if (action === 'reject' && !window.confirm('确定不通过并删除？删除后无法恢复。')) {
      return
    }

    try {
      await api(`/moderation/${id}/${action}`, { method: 'POST', body: '{}' })
      setStatus(action === 'approve' ? '已通过，已公开发布' : '已拒绝并删除')
      await refresh()
      window.dispatchEvent(new CustomEvent('auiaha-moderation-changed'))
    } catch (err) {
      setStatus(err.message, true)
    }
  })

  window.addEventListener('auiaha-auth-changed', refresh)
  window.addEventListener('hashchange', () => {
    if (window.location.hash.startsWith('#moderation')) refresh()
  })

  refresh()
  return { refresh }
}
