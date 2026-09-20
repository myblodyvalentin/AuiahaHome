import './garden.css'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'
const PENDING_KEY = 'auiaha-garden-pending'
const FONT_KEY = 'auiaha-letter-font'
const SIZE_KEY = 'auiaha-letter-size'
const MAX_IMAGES = 3
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_COMMENT = 500

const LETTER_FONTS = [
  { id: 'kuaile', label: '快乐体', family: '"ZCOOL KuaiLe", "PingFang SC", sans-serif' },
  { id: 'mashan', label: '手写楷', family: '"Ma Shan Zheng", "KaiTi", cursive' },
  { id: 'xiaowei', label: '小薇体', family: '"ZCOOL XiaoWei", "Songti SC", serif' },
  { id: 'longcang', label: '龙藏体', family: '"Long Cang", "KaiTi", cursive' },
  { id: 'nunito', label: '圆体', family: '"Nunito", "PingFang SC", sans-serif' },
]

const LETTER_SIZES = [16, 18, 20, 22, 24, 28]

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  let body = options.body
  if (body && !(body instanceof FormData) && typeof body !== 'string') {
    body = JSON.stringify(body)
    if (!headers['Content-Type']) headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    cache: 'no-store',
    ...options,
    headers,
    body,
  })

  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    const error = new Error(data?.error || `请求失败 (${res.status})`)
    error.status = res.status
    error.data = data
    throw error
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

function hashStr(value) {
  let hash = 0
  for (const char of String(value)) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return hash
}

function flowerSvg(color) {
  const fill = escapeHtml(color || '#ff8fab')
  return `
    <svg class="garden-flower__svg" viewBox="0 0 80 112" aria-hidden="true" focusable="false">
      <ellipse cx="22" cy="84" rx="13" ry="6.5" fill="#67c15a" transform="rotate(-34 22 84)" />
      <ellipse cx="58" cy="86" rx="13" ry="6.5" fill="#7ed957" transform="rotate(32 58 86)" />
      <path d="M40 54 C39.2 74 40 92 40 106" fill="none" stroke="#4caf50" stroke-width="3.2" stroke-linecap="round" />
      <g fill="${fill}">
        <ellipse cx="40" cy="18" rx="10" ry="15" />
        <ellipse cx="58" cy="30" rx="10" ry="15" transform="rotate(72 58 30)" />
        <ellipse cx="52" cy="50" rx="10" ry="15" transform="rotate(144 52 50)" />
        <ellipse cx="28" cy="50" rx="10" ry="15" transform="rotate(216 28 50)" />
        <ellipse cx="22" cy="30" rx="10" ry="15" transform="rotate(288 22 30)" />
      </g>
      <circle cx="40" cy="34" r="13.8" fill="#fff4b0" />
      <circle cx="35.2" cy="32" r="2.05" fill="#3d2c1e" />
      <circle cx="44.8" cy="32" r="2.05" fill="#3d2c1e" />
      <path d="M35 37.2 Q40 41.6 45 37.2" fill="none" stroke="#3d2c1e" stroke-width="1.85" stroke-linecap="round" />
      <circle cx="32.4" cy="35.4" r="1.7" fill="#ffb4c8" />
      <circle cx="47.6" cy="35.4" r="1.7" fill="#ffb4c8" />
    </svg>`
}

function layersTemplate() {
  const fontOptions = LETTER_FONTS.map(
    (font) => `<option value="${font.id}">${font.label}</option>`
  ).join('')
  const sizeOptions = LETTER_SIZES.map(
    (size) => `<option value="${size}"${size === 20 ? ' selected' : ''}>${size}px</option>`
  ).join('')

  return `
    <div class="garden-layer" data-garden-layers>
      <div class="garden-overlay" data-overlay="login" hidden>
        <div class="garden-card" role="dialog" aria-modal="true" aria-labelledby="garden-login-title">
          <h3 class="garden-card__title" id="garden-login-title">先登录才能种花哦</h3>
          <p class="garden-card__text">选好草地坐标后，需要 GitHub 登录才会打开种花窗口。</p>
          <div class="garden-card__actions">
            <button class="garden-btn garden-btn--ghost" type="button" data-login-back>返回草地</button>
            <button class="garden-btn" type="button" data-login-go>使用 GitHub 登录</button>
          </div>
        </div>
      </div>

      <div class="garden-overlay" data-overlay="plant" hidden>
        <div class="garden-card garden-card--plant" role="dialog" aria-modal="true" aria-labelledby="garden-plant-title">
          <h3 class="garden-card__title" id="garden-plant-title">种一朵小花</h3>
          <p class="garden-card__text" data-plant-coord></p>
          <p class="garden-card__error" data-plant-error role="alert"></p>

          <section class="plant-module">
            <h4 class="plant-module__title">图片</h4>
            <p class="plant-module__help">最多 3 张，每张不超过 5MB，会保存到服务器。</p>
            <ul class="plant-thumbs" data-plant-thumbs></ul>
            <label class="plant-add" data-plant-add>
              <input
                class="plant-add__input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                data-plant-file
              />
              <span>添加图片</span>
            </label>
          </section>

          <section class="plant-module">
            <h4 class="plant-module__title">评论</h4>
            <label class="plant-module__help" for="garden-comment">最多 500 字，写给大家看的小信。</label>
            <textarea
              id="garden-comment"
              class="plant-comment"
              data-plant-comment
              maxlength="${MAX_COMMENT}"
              rows="5"
              placeholder="今天的草地好安静……"
            ></textarea>
            <p class="plant-count"><span data-plant-count>0</span> / ${MAX_COMMENT}</p>
          </section>

          <div class="garden-card__actions">
            <button class="garden-btn garden-btn--ghost" type="button" data-plant-cancel>取消</button>
            <button class="garden-btn" type="button" data-plant-submit>确定</button>
          </div>
        </div>
      </div>

      <div class="garden-overlay garden-overlay--confirm" data-overlay="confirm" hidden>
        <div class="garden-card garden-card--confirm" role="dialog" aria-modal="true" aria-labelledby="garden-confirm-title">
          <h3 class="garden-card__title" id="garden-confirm-title">是否取消？取消则不保存编辑内容</h3>
          <div class="garden-card__actions">
            <button class="garden-btn garden-btn--ghost" type="button" data-confirm-keep>继续编辑</button>
            <button class="garden-btn garden-btn--danger" type="button" data-confirm-yes>确定取消</button>
          </div>
        </div>
      </div>

      <div class="garden-overlay" data-overlay="letter" hidden>
        <div class="letter-sheet" role="dialog" aria-modal="true" aria-labelledby="garden-letter-title">
          <header class="letter-toolbar">
            <div class="letter-who">
              <img class="letter-avatar" data-letter-avatar src="" alt="" width="36" height="36" />
              <div>
                <p class="letter-name" id="garden-letter-title" data-letter-name></p>
                <p class="letter-time" data-letter-time></p>
              </div>
            </div>
            <div class="letter-controls">
              <label class="letter-control">
                <span>字体</span>
                <select data-letter-font>${fontOptions}</select>
              </label>
              <label class="letter-control">
                <span>字号</span>
                <select data-letter-size>${sizeOptions}</select>
              </label>
              <button class="letter-close" type="button" data-letter-close aria-label="关闭">×</button>
            </div>
          </header>
          <div class="letter-scroll" data-letter-scroll>
            <p class="letter-text" data-letter-text></p>
            <div class="letter-photos" data-letter-photos></div>
          </div>
        </div>
      </div>

      <div class="garden-overlay garden-overlay--lightbox" data-overlay="lightbox" hidden>
        <button class="lightbox-close" type="button" data-lightbox-close aria-label="关闭放大图片">×</button>
        <img class="lightbox-image" data-lightbox-image alt="" />
      </div>
    </div>`
}

export function initGarden(root) {
  if (!root) return

  const field = root.querySelector('[data-garden-field]')
  const flowersHost = root.querySelector('[data-garden-flowers]')
  const ghost = root.querySelector('[data-garden-ghost]')
  const hint = root.querySelector('[data-garden-hint]')
  const status = root.querySelector('[data-garden-status]')
  const authLabel = root.querySelector('[data-garden-auth-label]')
  const loginChip = root.querySelector('[data-garden-login]')

  if (!field || !flowersHost) return

  document.body.insertAdjacentHTML('beforeend', layersTemplate())
  const layers = document.querySelector('[data-garden-layers]')
  const overlays = {
    login: layers.querySelector('[data-overlay="login"]'),
    plant: layers.querySelector('[data-overlay="plant"]'),
    confirm: layers.querySelector('[data-overlay="confirm"]'),
    letter: layers.querySelector('[data-overlay="letter"]'),
    lightbox: layers.querySelector('[data-overlay="lightbox"]'),
  }

  let grid = { cols: 18, rows: 7 }
  let flowers = []
  let currentUser = null
  let pendingCoord = null
  let pendingFiles = []
  let planting = false
  let toastTimer = null

  function setStatus(message, isError = false) {
    if (!status) return
    status.textContent = message || ''
    status.classList.toggle('is-error', Boolean(isError && message))
  }

  function syncAuthChip() {
    if (currentUser) {
      if (authLabel) authLabel.textContent = `以 ${currentUser.name || currentUser.login} 的身份种花`
      if (loginChip) loginChip.hidden = true
    } else {
      if (authLabel) authLabel.textContent = '登录后即可在空草地上种花'
      if (loginChip) loginChip.hidden = false
    }
  }

  function occupiedAt(col, row) {
    return flowers.find((flower) => flower.col === col && flower.row === row) || null
  }

  function cellFromEvent(event) {
    const rect = field.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    if (x < 0 || y < 0 || x > 1 || y > 1) return null
    return {
      col: Math.min(grid.cols - 1, Math.max(0, Math.floor(x * grid.cols))),
      row: Math.min(grid.rows - 1, Math.max(0, Math.floor(y * grid.rows))),
    }
  }

  function positionAt(el, col, row) {
    el.style.setProperty('--x', `${((col + 0.5) / grid.cols) * 100}%`)
    el.style.setProperty('--y', `${((row + 0.5) / grid.rows) * 100}%`)
  }

  function renderFlowers() {
    flowersHost.innerHTML = flowers
      .map((flower) => {
        const depth = 0.72 + (flower.row / Math.max(grid.rows - 1, 1)) * 0.52
        const hash = hashStr(flower.id)
        const name = escapeHtml(flower.user?.name || flower.user?.login || '访客')
        return `
          <button
            type="button"
            class="garden-flower"
            data-flower-id="${escapeHtml(flower.id)}"
            style="--x:${((flower.col + 0.5) / grid.cols) * 100}%; --y:${((flower.row + 0.5) / grid.rows) * 100}%; --depth:${depth}; --delay:${(hash % 16) / 10}s; --dur:${2.25 + (hash % 10) / 10}s; z-index:${10 + flower.row}"
            aria-label="查看 ${name} 种的小花"
          >
            <span class="garden-flower__sway">${flowerSvg(flower.color)}</span>
          </button>`
      })
      .join('')

    if (hint) hint.hidden = flowers.length > 0
  }

  function anyOverlayOpen() {
    return Object.values(overlays).some((el) => el && !el.hidden)
  }

  function syncLayer() {
    layers.classList.toggle('is-active', anyOverlayOpen())
    document.body.classList.toggle('is-garden-modal', anyOverlayOpen())
  }

  function showOverlay(name) {
    overlays[name].hidden = false
    syncLayer()
  }

  function hideOverlay(name) {
    overlays[name].hidden = true
    syncLayer()
  }

  function goGithubLogin() {
    window.location.href = `${API_BASE}/auth/github?next=social`
  }

  function savePending(coord) {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(coord))
  }

  function readPending() {
    try {
      const raw = sessionStorage.getItem(PENDING_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (!Number.isInteger(parsed?.col) || !Number.isInteger(parsed?.row)) return null
      return parsed
    } catch {
      return null
    }
  }

  function clearPending() {
    sessionStorage.removeItem(PENDING_KEY)
  }

  function revokeFiles() {
    pendingFiles.forEach((item) => URL.revokeObjectURL(item.url))
    pendingFiles = []
  }

  function renderThumbs() {
    const host = layers.querySelector('[data-plant-thumbs]')
    const add = layers.querySelector('[data-plant-add]')
    host.innerHTML = pendingFiles
      .map(
        (item, index) => `
        <li class="plant-thumb">
          <img src="${escapeHtml(item.url)}" alt="待上传图片 ${index + 1}" />
          <button class="plant-thumb__remove" type="button" data-remove-image="${index}" aria-label="移除图片">×</button>
        </li>`
      )
      .join('')
    add.hidden = pendingFiles.length >= MAX_IMAGES
  }

  function setPlantError(message) {
    const el = layers.querySelector('[data-plant-error]')
    el.textContent = message || ''
  }

  function resetPlantForm() {
    revokeFiles()
    renderThumbs()
    const comment = layers.querySelector('[data-plant-comment]')
    const count = layers.querySelector('[data-plant-count]')
    const fileInput = layers.querySelector('[data-plant-file]')
    comment.value = ''
    count.textContent = '0'
    if (fileInput) fileInput.value = ''
    setPlantError('')
    pendingCoord = null
  }

  function closePlant(discard) {
    hideOverlay('confirm')
    hideOverlay('plant')
    if (discard) resetPlantForm()
  }

  function openLogin(coord) {
    if (coord) savePending(coord)
    showOverlay('login')
    layers.querySelector('[data-login-go]')?.focus()
  }

  function openPlant(coord) {
    pendingCoord = coord
    layers.querySelector('[data-plant-coord]').textContent =
      `已选择草地坐标（${coord.col + 1}, ${coord.row + 1}）`
    setPlantError('')
    showOverlay('plant')
    layers.querySelector('[data-plant-comment]')?.focus()
  }

  async function tryPlant(coord) {
    if (occupiedAt(coord.col, coord.row)) {
      setStatus('这块草地已经有花了，换一个位置吧', true)
      return
    }

    try {
      const me = await api('/auth/me')
      currentUser = me.user
      syncAuthChip()
    } catch (err) {
      setStatus(`花园暂时连不上服务器（${err.message}）`, true)
      return
    }

    if (!currentUser) {
      openLogin(coord)
      return
    }

    clearPending()
    openPlant(coord)
  }

  function addSelectedFiles(fileList) {
    const incoming = Array.from(fileList || [])
    for (const file of incoming) {
      if (pendingFiles.length >= MAX_IMAGES) {
        setPlantError('最多上传 3 张图片')
        break
      }
      if (!file.type.startsWith('image/')) {
        setPlantError('请选择图片文件')
        continue
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setPlantError('每张图片最多 5MB')
        continue
      }
      setPlantError('')
      pendingFiles.push({
        file,
        url: URL.createObjectURL(file),
      })
    }
    renderThumbs()
  }

  function applyLetterStyle() {
    const text = layers.querySelector('[data-letter-text]')
    const fontId = layers.querySelector('[data-letter-font]').value
    const size = Number(layers.querySelector('[data-letter-size]').value)
    const font = LETTER_FONTS.find((item) => item.id === fontId) || LETTER_FONTS[0]
    text.style.fontFamily = font.family
    text.style.fontSize = `${size}px`
    localStorage.setItem(FONT_KEY, font.id)
    localStorage.setItem(SIZE_KEY, String(size))
  }

  function openLetter(flower) {
    const name = flower.user?.name || flower.user?.login || '访客'
    layers.querySelector('[data-letter-name]').textContent = name
    layers.querySelector('[data-letter-time]').textContent = formatTime(flower.createdAt)
    const avatar = layers.querySelector('[data-letter-avatar]')
    avatar.src = flower.user?.avatarUrl || ''
    avatar.alt = name

    const text = layers.querySelector('[data-letter-text]')
    text.textContent = flower.comment || ''
    text.hidden = !flower.comment

    const photos = layers.querySelector('[data-letter-photos]')
    const images = flower.images || []
    photos.hidden = images.length === 0
    photos.innerHTML = images
      .map(
        (img, index) => `
        <button class="letter-photo" type="button">
          <img data-letter-photo src="${escapeHtml(img.url)}" alt="${escapeHtml(name)} 的图片 ${index + 1}" />
        </button>`
      )
      .join('')

    const savedFont = localStorage.getItem(FONT_KEY)
    const savedSize = Number(localStorage.getItem(SIZE_KEY))
    const fontSelect = layers.querySelector('[data-letter-font]')
    const sizeSelect = layers.querySelector('[data-letter-size]')
    if (LETTER_FONTS.some((font) => font.id === savedFont)) fontSelect.value = savedFont
    if (LETTER_SIZES.includes(savedSize)) sizeSelect.value = String(savedSize)
    applyLetterStyle()

    layers.querySelector('[data-letter-scroll]').scrollTop = 0
    showOverlay('letter')
    layers.querySelector('[data-letter-close]')?.focus()
  }

  function openLightbox(src, alt) {
    const image = layers.querySelector('[data-lightbox-image]')
    image.src = src
    image.alt = alt || '放大图片'
    showOverlay('lightbox')
  }

  async function refresh() {
    try {
      const [me, garden] = await Promise.all([api('/auth/me'), api('/garden')])
      currentUser = me.user
      if (garden.grid?.cols && garden.grid?.rows) {
        grid = { cols: garden.grid.cols, rows: garden.grid.rows }
      }
      flowers = garden.flowers || []
      syncAuthChip()
      renderFlowers()
      setStatus(currentUser ? '' : '点空草地后会先确认登录状态')
    } catch (err) {
      currentUser = null
      flowers = []
      syncAuthChip()
      renderFlowers()
      setStatus(`花园暂时连不上服务器。请确认已启动 server（${err.message}）`, true)
    }
  }

  async function resumeAfterLogin() {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '')
    const auth = params.get('auth')
    const onSocial = window.location.hash.startsWith('#social')
    if (!onSocial) return

    root.scrollIntoView({ behavior: 'smooth', block: 'start' })

    if (auth === 'ok') setStatus('GitHub 登录成功，可以种花了')
    if (auth === 'error') setStatus('GitHub 登录失败，请检查 OAuth 配置', true)
    if (auth === 'ok' || auth === 'error') {
      history.replaceState(null, '', `${window.location.pathname}${window.location.search}#social`)
    }

    const pending = readPending()
    if (auth === 'ok' && currentUser && pending) {
      clearPending()
      if (occupiedAt(pending.col, pending.row)) {
        setStatus('你选的位置已被占用，请再点一块空草地', true)
        return
      }
      openPlant(pending)
    }
  }

  field.addEventListener('mousemove', (event) => {
    if (event.target.closest('[data-flower-id]')) {
      ghost.hidden = true
      return
    }
    const cell = cellFromEvent(event)
    if (!cell || occupiedAt(cell.col, cell.row)) {
      ghost.hidden = true
      return
    }
    positionAt(ghost, cell.col, cell.row)
    ghost.hidden = false
  })

  field.addEventListener('mouseleave', () => {
    ghost.hidden = true
  })

  field.addEventListener('click', (event) => {
    if (event.target.closest('[data-flower-id]')) return
    const cell = cellFromEvent(event)
    if (!cell) return
    const existing = occupiedAt(cell.col, cell.row)
    if (existing) {
      openLetter(existing)
      return
    }
    tryPlant(cell)
  })

  flowersHost.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-flower-id]')
    if (!btn) return
    event.stopPropagation()
    const flower = flowers.find((item) => item.id === btn.dataset.flowerId)
    if (flower) openLetter(flower)
  })

  loginChip?.addEventListener('click', goGithubLogin)

  layers.querySelector('[data-login-go]').addEventListener('click', goGithubLogin)
  layers.querySelector('[data-login-back]').addEventListener('click', () => hideOverlay('login'))

  layers.querySelector('[data-plant-file]').addEventListener('change', (event) => {
    addSelectedFiles(event.target.files)
    event.target.value = ''
  })

  layers.querySelector('[data-plant-thumbs]').addEventListener('click', (event) => {
    const btn = event.target.closest('[data-remove-image]')
    if (!btn) return
    const index = Number(btn.dataset.removeImage)
    const item = pendingFiles[index]
    if (item) URL.revokeObjectURL(item.url)
    pendingFiles.splice(index, 1)
    renderThumbs()
  })

  layers.querySelector('[data-plant-comment]').addEventListener('input', (event) => {
    layers.querySelector('[data-plant-count]').textContent = String(event.target.value.length)
  })

  layers.querySelector('[data-plant-cancel]').addEventListener('click', () => {
    showOverlay('confirm')
  })

  overlays.plant.addEventListener('click', (event) => {
    if (event.target === overlays.plant) showOverlay('confirm')
  })

  layers.querySelector('[data-confirm-keep]').addEventListener('click', () => {
    hideOverlay('confirm')
  })

  layers.querySelector('[data-confirm-yes]').addEventListener('click', () => {
    closePlant(true)
    setStatus('已取消，没有保存')
  })

  overlays.confirm.addEventListener('click', (event) => {
    if (event.target === overlays.confirm) hideOverlay('confirm')
  })

  layers.querySelector('[data-plant-submit]').addEventListener('click', async () => {
    if (planting || !pendingCoord) return
    const comment = layers.querySelector('[data-plant-comment]').value.trim()
    if (!comment && pendingFiles.length === 0) {
      setPlantError('请写一点文字，或上传至少一张图片')
      return
    }
    if (comment.length > MAX_COMMENT) {
      setPlantError('评论最多 500 字')
      return
    }

    planting = true
    const submitBtn = layers.querySelector('[data-plant-submit]')
    submitBtn.disabled = true
    submitBtn.textContent = '正在种花…'
    setPlantError('')

    const body = new FormData()
    body.append('col', String(pendingCoord.col))
    body.append('row', String(pendingCoord.row))
    body.append('comment', comment)
    pendingFiles.forEach((item) => body.append('images', item.file))

    try {
      const result = await api('/garden/flowers', { method: 'POST', body })
      if (result.flower) flowers.push(result.flower)
      renderFlowers()
      closePlant(true)
      setStatus('种好啦，小花会一直留在草地上')
    } catch (err) {
      if (err.data?.occupied) {
        setPlantError(err.message)
        await refresh()
      } else {
        setPlantError(err.message)
      }
    } finally {
      planting = false
      submitBtn.disabled = false
      submitBtn.textContent = '确定'
    }
  })

  layers.querySelector('[data-letter-close]').addEventListener('click', () => {
    hideOverlay('letter')
  })

  overlays.letter.addEventListener('click', (event) => {
    if (event.target === overlays.letter) hideOverlay('letter')
  })

  layers.querySelector('[data-letter-photos]').addEventListener('click', (event) => {
    const img = event.target.closest('[data-letter-photo]')
    if (!img) return
    openLightbox(img.getAttribute('src'), img.getAttribute('alt'))
  })

  layers.querySelector('[data-letter-font]').addEventListener('change', applyLetterStyle)
  layers.querySelector('[data-letter-size]').addEventListener('change', applyLetterStyle)

  layers.querySelector('[data-lightbox-close]').addEventListener('click', () => {
    hideOverlay('lightbox')
  })

  overlays.lightbox.addEventListener('click', (event) => {
    if (event.target === overlays.lightbox) hideOverlay('lightbox')
  })

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !anyOverlayOpen()) return
    if (!overlays.lightbox.hidden) {
      hideOverlay('lightbox')
      return
    }
    if (!overlays.confirm.hidden) {
      hideOverlay('confirm')
      return
    }
    if (!overlays.plant.hidden) {
      showOverlay('confirm')
      return
    }
    if (!overlays.letter.hidden) hideOverlay('letter')
    if (!overlays.login.hidden) hideOverlay('login')
  })

  refresh().then(() => {
    resumeAfterLogin()
    if (!toastTimer && status?.textContent) {
      toastTimer = window.setTimeout(() => {
        if (!status.classList.contains('is-error')) setStatus('')
      }, 4200)
    }
  })
}
