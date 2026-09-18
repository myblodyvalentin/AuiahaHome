const HOLD_MS = 160
const MIN_POINTS = 4
const MIN_PATH_LENGTH = 18
const FLOAT_SCALE = 0.42
const BLOCK_SELECTOR =
  '.top-bar, .nav-trigger, .theme-picker, .theme-swatch, .github-entry, .hero__cta, .side-nav, .page-dim'

/**
 * Freehand sketch on the hero while the page is still at the main view.
 * Hold LMB to draw; release or enter nav/controls to finish.
 * Finished strokes shrink and float until the page is closed.
 */
export function initSketch({ hero, floatsHost }) {
  const live = document.createElement('canvas')
  live.className = 'sketch-live'
  live.setAttribute('aria-hidden', 'true')

  const floats = floatsHost
  floats.classList.add('sketch-floats')

  const root = document.createElement('div')
  root.className = 'sketch-root'
  root.append(live)
  hero.append(root)
  hero.append(floats)

  const ctx = live.getContext('2d')
  let dpr = 1
  let drawing = false
  let holdTimer = null
  let pendingPoint = null
  let points = []
  let lastPoint = null

  function isMainView() {
    const about = document.getElementById('about')
    if (!about) return window.scrollY < 24
    return about.getBoundingClientRect().top > window.innerHeight * 0.92
  }

  function syncDrawableState() {
    const on = isMainView()
    root.classList.toggle('is-drawable', on)
    hero.classList.toggle('is-sketchable', on)
    if (!on && (drawing || holdTimer)) {
      finishStroke()
    }
  }

  function resizeCanvas() {
    const rect = hero.getBoundingClientRect()
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    live.width = Math.max(1, Math.floor(rect.width * dpr))
    live.height = Math.max(1, Math.floor(rect.height * dpr))
    live.style.width = `${rect.width}px`
    live.style.height = `${rect.height}px`
    redrawLive()
  }

  function heroPointFromEvent(e) {
    const rect = hero.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      clientX: e.clientX,
      clientY: e.clientY,
    }
  }

  function isBlockedTarget(el) {
    if (!el || el === document.documentElement || el === document.body) return false
    return Boolean(el.closest?.(BLOCK_SELECTOR))
  }

  function hitsBlockedUI(clientX, clientY) {
    // Temporarily ignore sketch layer so we can detect UI underneath the cursor
    const prev = root.style.pointerEvents
    root.style.pointerEvents = 'none'
    const el = document.elementFromPoint(clientX, clientY)
    root.style.pointerEvents = prev
    return isBlockedTarget(el)
  }

  function strokeStyle() {
    const styles = getComputedStyle(document.body)
    return styles.getPropertyValue('--home-color').trim() || styles.getPropertyValue('--ink').trim() || '#1e40af'
  }

  function clearLive() {
    ctx.clearRect(0, 0, live.width, live.height)
  }

  function redrawLive() {
    clearLive()
    if (points.length < 2) return
    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = strokeStyle()
    ctx.lineWidth = 3.2
    ctx.globalAlpha = 0.92
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i += 1) {
      ctx.lineTo(points[i].x, points[i].y)
    }
    ctx.stroke()
    ctx.restore()
  }

  function pathLength(pts) {
    let len = 0
    for (let i = 1; i < pts.length; i += 1) {
      const dx = pts[i].x - pts[i - 1].x
      const dy = pts[i].y - pts[i - 1].y
      len += Math.hypot(dx, dy)
    }
    return len
  }

  function startStroke(point) {
    drawing = true
    points = [point]
    lastPoint = point
    root.classList.add('is-drawing')
    document.body.classList.add('is-sketch-drawing')
    redrawLive()
  }

  function extendStroke(point) {
    if (!drawing || !lastPoint) return
    const dx = point.x - lastPoint.x
    const dy = point.y - lastPoint.y
    if (Math.hypot(dx, dy) < 1.2) return
    points.push(point)
    lastPoint = point
    redrawLive()
  }

  function pointsToPath(pts) {
    if (!pts.length) return ''
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
    for (let i = 1; i < pts.length; i += 1) {
      d += ` L ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`
    }
    return d
  }

  function spawnFloatingStroke(pts) {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const p of pts) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }

    const pad = 12
    const width = Math.max(maxX - minX + pad * 2, 24)
    const height = Math.max(maxY - minY + pad * 2, 24)
    const local = pts.map((p) => ({ x: p.x - minX + pad, y: p.y - minY + pad }))

    const wrap = document.createElement('div')
    wrap.className = 'sketch-float'
    wrap.style.left = `${minX + (maxX - minX) / 2}px`
    wrap.style.top = `${minY + (maxY - minY) / 2}px`
    wrap.style.width = `${width}px`
    wrap.style.height = `${height}px`
    wrap.style.setProperty('--float-scale', String(FLOAT_SCALE))
    wrap.style.setProperty('--float-dx', `${(Math.random() * 56 - 28).toFixed(1)}px`)
    wrap.style.setProperty('--float-dy', `${(Math.random() * -64 - 18).toFixed(1)}px`)
    wrap.style.setProperty('--float-rot', `${(Math.random() * 14 - 7).toFixed(1)}deg`)
    wrap.style.setProperty('--float-duration', `${(3.2 + Math.random() * 2.4).toFixed(1)}s`)
    wrap.style.setProperty('--float-delay', `${(Math.random() * 0.4).toFixed(2)}s`)

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
    svg.setAttribute('width', String(width))
    svg.setAttribute('height', String(height))
    svg.setAttribute('aria-hidden', 'true')

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', pointsToPath(local))
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', strokeStyle())
    path.setAttribute('stroke-width', '3.2')
    path.setAttribute('stroke-linecap', 'round')
    path.setAttribute('stroke-linejoin', 'round')
    path.setAttribute('opacity', '0.88')

    svg.append(path)
    wrap.append(svg)
    floats.append(wrap)

    // Next frame: shrink, then drift
    requestAnimationFrame(() => {
      wrap.classList.add('is-afloat')
      let drifted = false
      const startDrift = () => {
        if (drifted) return
        drifted = true
        wrap.classList.add('is-drifting')
      }
      wrap.addEventListener('transitionend', startDrift, { once: true })
      setTimeout(startDrift, 900)
    })
  }

  function finishStroke() {
    clearTimeout(holdTimer)
    holdTimer = null
    pendingPoint = null

    const donePoints = points
    const wasDrawing = drawing
    drawing = false
    points = []
    lastPoint = null
    root.classList.remove('is-drawing')
    document.body.classList.remove('is-sketch-drawing')
    clearLive()

    if (!wasDrawing) return
    if (donePoints.length < MIN_POINTS || pathLength(donePoints) < MIN_PATH_LENGTH) return
    spawnFloatingStroke(donePoints)
  }

  function clearHold() {
    clearTimeout(holdTimer)
    holdTimer = null
    pendingPoint = null
  }

  function onPointerDown(e) {
    if (e.button !== 0 || e.pointerType === 'touch') return
    if (!isMainView()) return
    if (hitsBlockedUI(e.clientX, e.clientY)) return

    pendingPoint = heroPointFromEvent(e)
    clearTimeout(holdTimer)
    holdTimer = setTimeout(() => {
      holdTimer = null
      if (!pendingPoint) return
      if (!isMainView()) return
      if (hitsBlockedUI(pendingPoint.clientX, pendingPoint.clientY)) return
      startStroke(pendingPoint)
      try {
        root.setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }, HOLD_MS)
  }

  function onPointerMove(e) {
    if (holdTimer) {
      pendingPoint = heroPointFromEvent(e)
      if (hitsBlockedUI(e.clientX, e.clientY)) {
        clearHold()
      }
      return
    }

    if (!drawing) return

    if (hitsBlockedUI(e.clientX, e.clientY)) {
      finishStroke()
      return
    }

    const rect = hero.getBoundingClientRect()
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      finishStroke()
      return
    }

    extendStroke(heroPointFromEvent(e))
  }

  function onPointerUp(e) {
    if (e.button !== 0 && e.type !== 'pointercancel') return
    clearHold()
    if (drawing) finishStroke()
  }

  root.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
  window.addEventListener('blur', finishStroke)
  window.addEventListener('scroll', syncDrawableState, { passive: true })
  window.addEventListener('resize', () => {
    resizeCanvas()
    syncDrawableState()
  })

  resizeCanvas()
  syncDrawableState()

  return {
    refresh: () => {
      resizeCanvas()
      syncDrawableState()
    },
  }
}
