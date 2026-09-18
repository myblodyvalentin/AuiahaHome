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
          <span class="notes-col-card__cta">进入专栏 →</span>
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
            <span class="notes-topic__title">${escapeHtml(t.title)}</span>
            <span class="notes-topic__meta">${t.paragraphs.length} 条笔记</span>
          </button>`
          )
          .join('')}
      </div>
    </div>`
}

function renderTopic(column, topic) {
  return `
    <div class="notes-view">
      <button class="notes-back" type="button" data-notes-back="col:${column.id}">← 返回 ${escapeHtml(column.title)}</button>
      <header class="notes-view__header">
        <p class="notes-view__eyebrow">${escapeHtml(column.title)}</p>
        <h3 class="notes-view__title">${escapeHtml(topic.title)}</h3>
      </header>
      <div class="notes-article">
        ${topic.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('')}
      </div>
    </div>`
}

function parseHash() {
  const raw = window.location.hash.replace(/^#/, '')
  // notes / notes/java-web / notes/java-web/servlet
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
    // force re-render when same
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
    if (window.location.hash.startsWith('#notes') || !window.location.hash) {
      // only re-render notes pane when hash related; always safe
      if (document.getElementById('notes-root')) render()
    }
  })

  render()
}
