import { NOTE_COLUMNS } from './notes-data.js'

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function findColumn(id) {
  return NOTE_COLUMNS.find((c) => c.id === id) || null
}

function findTopic(column, topicId) {
  return column?.topics?.find((t) => t.id === topicId) || null
}

function topicMeta(topic) {
  if (topic.html) {
    const imgs = (topic.html.match(/<img\b/gi) || []).length
    const paras = (topic.html.match(/<p\b/gi) || []).length
    return imgs ? `${paras} 段 · ${imgs} 图` : `${paras} 段笔记`
  }
  return `${topic.paragraphs?.length || 0} 条笔记`
}

function renderHub() {
  return `
    <div class="notes-hub">
      ${NOTE_COLUMNS.map(
        (col) => `
        <button class="notes-col-card" type="button" data-notes-open-col="${col.id}">
          <span class="notes-col-card__eyebrow">专栏</span>
          <span class="notes-col-card__title">${escapeHtml(col.title)}</span>
          <span class="notes-col-card__subtitle">${escapeHtml(col.subtitle)}</span>
          <span class="notes-col-card__summary">${escapeHtml(col.summary)}</span>
          <span class="notes-col-card__cta">进入专栏 · ${col.topics.length} 个模块 →</span>
        </button>`
      ).join('')}
    </div>`
}

function renderColumn(column) {
  return `
    <div class="notes-view">
      <button class="notes-back" type="button" data-notes-back="hub">← 返回专栏</button>
      <header class="notes-view__header">
        <p class="notes-view__eyebrow">专栏</p>
        <h3 class="notes-view__title">${escapeHtml(column.title)}</h3>
        <p class="notes-view__summary">${escapeHtml(column.summary)}</p>
      </header>
      <div class="notes-topic-list">
        ${column.topics
          .map(
            (t) => `
          <button class="notes-topic" type="button" data-notes-open-topic="${column.id}/${t.id}">
            <span class="notes-topic__copy">
              <span class="notes-topic__title">${escapeHtml(t.title)}</span>
              <span class="notes-topic__summary">${escapeHtml(t.summary || '')}</span>
            </span>
            <span class="notes-topic__meta">${escapeHtml(topicMeta(t))}</span>
          </button>`
          )
          .join('')}
      </div>
    </div>`
}

function renderTopic(column, topic) {
  const body = topic.html
    ? topic.html
    : (topic.paragraphs || []).map((p) => `<p>${escapeHtml(p)}</p>`).join('')

  return `
    <div class="notes-view">
      <button class="notes-back" type="button" data-notes-back="col:${column.id}">← 返回 ${escapeHtml(column.title)}</button>
      <header class="notes-view__header">
        <p class="notes-view__eyebrow">${escapeHtml(column.title)}</p>
        <h3 class="notes-view__title">${escapeHtml(topic.title)}</h3>
        ${topic.summary ? `<p class="notes-view__summary">${escapeHtml(topic.summary)}</p>` : ''}
      </header>
      <article class="notes-article notes-article--rich">
        ${body}
      </article>
    </div>`
}

function parseHash() {
  const raw = window.location.hash.replace(/^#/, '')
  if (!raw.startsWith('notes')) return { level: 'hub' }
  const parts = raw.split('/').filter(Boolean)
  if (parts.length === 1) return { level: 'hub' }
  if (parts.length === 2) return { level: 'column', columnId: parts[1] }
  return { level: 'topic', columnId: parts[1], topicId: parts[2] }
}

function setHash(path) {
  const next = path ? `#notes/${path}` : '#notes'
  if (window.location.hash !== next) {
    window.location.hash = next
  } else {
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }
}

export function initNotes(root) {
  if (!root) return

  function render() {
    const state = parseHash()
    if (state.level === 'topic') {
      const column = findColumn(state.columnId)
      const topic = findTopic(column, state.topicId)
      if (column && topic) {
        root.innerHTML = renderTopic(column, topic)
        root.querySelector('.notes-view')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
    if (state.level === 'column') {
      const column = findColumn(state.columnId)
      if (column) {
        root.innerHTML = renderColumn(column)
        return
      }
    }
    root.innerHTML = renderHub()
  }

  root.addEventListener('click', (e) => {
    const openCol = e.target.closest('[data-notes-open-col]')
    if (openCol) {
      setHash(openCol.getAttribute('data-notes-open-col'))
      return
    }
    const openTopic = e.target.closest('[data-notes-open-topic]')
    if (openTopic) {
      setHash(openTopic.getAttribute('data-notes-open-topic'))
      return
    }
    const back = e.target.closest('[data-notes-back]')
    if (back) {
      const target = back.getAttribute('data-notes-back')
      if (target === 'hub') setHash('')
      else if (target.startsWith('col:')) setHash(target.slice(4))
    }
  })

  window.addEventListener('hashchange', () => {
    if (document.getElementById('notes-root')) render()
  })

  render()
}
