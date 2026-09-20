import './cats.css'

const PALETTES = [
  { body: '#f4a261', belly: '#ffe8c8', ear: '#e76f51', nose: '#e76f51' },
  { body: '#adb5bd', belly: '#f8f9fa', ear: '#868e96', nose: '#ff8fab' },
  { body: '#fff3d6', belly: '#ffffff', ear: '#f4a261', nose: '#f4a261' },
  { body: '#3d3a41', belly: '#f1faee', ear: '#2d2a32', nose: '#e9c46a' },
  { body: '#e9c46a', belly: '#fff8dc', ear: '#f4a261', nose: '#e76f51' },
  { body: '#ffcad4', belly: '#fff5f7', ear: '#ff8fab', nose: '#e76f51' },
  { body: '#90e0ef', belly: '#caf0f8', ear: '#00b4d8', nose: '#0077b6' },
  { body: '#d4a373', belly: '#faedcd', ear: '#bc6c25', nose: '#e76f51' },
  { body: '#bdb2ff', belly: '#f3efff', ear: '#9381ff', nose: '#ff8fab' },
]

function catMarkup(palette, index) {
  const { body, belly, ear, nose } = palette
  return `
    <div class="hero-cat" data-cat="${index}">
      <svg class="hero-cat__svg" viewBox="0 0 92 64" aria-hidden="true" focusable="false">
        <path class="hero-cat__tail" d="M24 34 Q6 18 14 8" fill="none" stroke="${body}" stroke-width="7" stroke-linecap="round" />
        <ellipse cx="44" cy="38" rx="24" ry="16" fill="${body}" />
        <ellipse cx="40" cy="42" rx="13" ry="9" fill="${belly}" />
        <circle cx="66" cy="24" r="15" fill="${body}" />
        <path d="M52 18 L55 5 L64 16 Z" fill="${ear}" />
        <path d="M66 16 L75 5 L78 18 Z" fill="${ear}" />
        <path d="M54.5 16 L56 9 L62 15 Z" fill="#ffd6e0" />
        <path d="M68 15 L74 9 L75.5 16 Z" fill="#ffd6e0" />
        <ellipse cx="61" cy="24" rx="2.1" ry="2.6" fill="#2b2118" />
        <ellipse cx="71" cy="24" rx="2.1" ry="2.6" fill="#2b2118" />
        <circle cx="61.7" cy="23.3" r="0.7" fill="#fff" />
        <circle cx="71.7" cy="23.3" r="0.7" fill="#fff" />
        <path d="M65 28 L67.4 30.2 L69.8 28" fill="${nose}" />
        <path d="M62 32 Q66.2 35.5 70.4 32" fill="none" stroke="#2b2118" stroke-width="1.4" stroke-linecap="round" />
        <path d="M54 29 L46 27 M54 32 L46 33" stroke="#2b2118" stroke-width="1.15" stroke-linecap="round" />
        <path d="M78 29 L86 27 M78 32 L86 33" stroke="#2b2118" stroke-width="1.15" stroke-linecap="round" />
        <g class="hero-cat__legs">
          <rect class="hero-cat__leg hero-cat__leg--a" x="28" y="48" width="6" height="13" rx="3" fill="${body}" />
          <rect class="hero-cat__leg hero-cat__leg--b" x="38" y="48" width="6" height="13" rx="3" fill="${body}" />
          <rect class="hero-cat__leg hero-cat__leg--c" x="48" y="48" width="6" height="13" rx="3" fill="${body}" />
          <rect class="hero-cat__leg hero-cat__leg--d" x="56" y="47" width="6" height="13" rx="3" fill="${body}" />
        </g>
      </svg>
    </div>`
}

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function initHeroCats(host) {
  if (!host) return

  const count = 9
  host.innerHTML = Array.from({ length: count }, (_, i) =>
    catMarkup(PALETTES[i % PALETTES.length], i)
  ).join('')

  const nodes = [...host.querySelectorAll('.hero-cat')]
  const hero = host.closest('.hero') || host.parentElement
  const cats = nodes.map((el, i) => ({
    el,
    x: 8 + Math.random() * 84,
    y: 42 + Math.random() * 48,
    vx: 0,
    vy: 0,
    pause: Math.random() * 1.4,
    size: 58 + (i % 5) * 8 + Math.random() * 10,
  }))

  function pickWalk(cat) {
    const speed = 6 + Math.random() * 10
    const angle = Math.random() * Math.PI * 2
    cat.vx = Math.cos(angle) * speed
    cat.vy = Math.sin(angle) * speed * 0.38
  }

  cats.forEach(pickWalk)

  function layout() {
    cats.forEach((cat) => {
      cat.el.style.width = `${cat.size}px`
      cat.el.style.left = `${cat.x}%`
      cat.el.style.top = `${cat.y}%`
      cat.el.style.zIndex = String(10 + Math.round(cat.y))
      cat.el.classList.toggle('is-left', cat.vx < 0)
    })
  }

  layout()
  if (reducedMotion()) return

  let last = performance.now()
  let frame = 0

  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now

    cats.forEach((cat) => {
      cat.pause -= dt
      if (cat.pause > 0) {
        cat.el.classList.remove('is-walking')
        return
      }

      if (Math.random() < 0.16 * dt) {
        cat.pause = 0.5 + Math.random() * 1.8
        cat.el.classList.remove('is-walking')
        return
      }

      if (Math.random() < 0.12 * dt) pickWalk(cat)

      cat.x += cat.vx * dt
      cat.y += cat.vy * dt

      if (cat.x < 4) {
        cat.x = 4
        cat.vx = Math.abs(cat.vx)
      }
      if (cat.x > 94) {
        cat.x = 94
        cat.vx = -Math.abs(cat.vx)
      }
      if (cat.y < 42) {
        cat.y = 42
        cat.vy = Math.abs(cat.vy)
      }
      if (cat.y > 88) {
        cat.y = 88
        cat.vy = -Math.abs(cat.vy)
      }

      cat.el.classList.add('is-walking')
      cat.el.classList.toggle('is-left', cat.vx < 0)
    })

    for (let i = 0; i < cats.length; i += 1) {
      for (let j = i + 1; j < cats.length; j += 1) {
        const a = cats[i]
        const b = cats[j]
        const dx = a.x - b.x
        const dy = a.y - b.y
        const dist = Math.hypot(dx, dy) || 0.01
        if (dist < 9) {
          const push = ((9 - dist) / 2) * 0.35
          a.x += (dx / dist) * push
          a.y += (dy / dist) * push
          b.x -= (dx / dist) * push
          b.y -= (dy / dist) * push
        }
      }
    }

    cats.forEach((cat) => {
      cat.el.style.left = `${cat.x}%`
      cat.el.style.top = `${cat.y}%`
      cat.el.style.zIndex = String(10 + Math.round(cat.y))
    })

    frame = requestAnimationFrame(tick)
  }

  frame = requestAnimationFrame(tick)
  window.addEventListener(
    'pagehide',
    () => cancelAnimationFrame(frame),
    { once: true }
  )
}
