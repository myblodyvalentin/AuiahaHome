import './style.css'

const GITHUB_URL = 'https://github.com/myblodyvalentin'
const AVATAR_URL = 'https://avatars.githubusercontent.com/u/233668318?v=4'

const MODULES = [
  {
    id: 'home',
    title: '首页',
    desc: '回到 AuiahaHome 的起点，感受主视觉与品牌气质。',
  },
  {
    id: 'about',
    title: '关于',
    desc: '了解 Xu Zhiquan — 东北大学，代码与生活交汇处。',
  },
  {
    id: 'projects',
    title: '项目',
    desc: '精选作品与实验，记录从想法到落地的过程。',
  },
  {
    id: 'notes',
    title: '笔记',
    desc: '技术札记、学习路径，以及路上随手记下的想法。',
  },
  {
    id: 'contact',
    title: '联系',
    desc: '通过 GitHub 或其他方式与我取得联系。',
  },
]

function renderModulesList() {
  return MODULES.map(
    (m, i) => `
    <li>
      <a class="side-nav__link" href="#${m.id}">
        <span class="side-nav__title">${m.title}</span>
        <span class="side-nav__index">${String(i + 1).padStart(2, '0')}</span>
      </a>
    </li>`
  ).join('')
}

function renderModulesGrid() {
  return MODULES.map(
    (m, i) => `
    <article class="module-item" id="${m.id}">
      <span class="module-item__index">${String(i + 1).padStart(2, '0')}</span>
      <h3 class="module-item__title">${m.title}</h3>
      <p class="module-item__desc">${m.desc}</p>
    </article>`
  ).join('')
}

document.querySelector('#app').innerHTML = `
  <div class="shell" id="shell">
    <aside class="side-nav" id="side-nav" aria-label="站点模块导航" aria-hidden="true">
      <p class="side-nav__label">全部模块</p>
      <ul class="side-nav__list">
        ${renderModulesList()}
      </ul>
      <p class="side-nav__footer">悬停左侧菜单展开导航；点击右侧头像前往 GitHub。</p>
    </aside>

    <div class="page-stage" id="page-stage">
      <div class="page-dim" id="page-dim" aria-hidden="true"></div>

      <header class="top-bar">
        <button
          class="nav-trigger"
          id="nav-trigger"
          type="button"
          aria-expanded="false"
          aria-controls="side-nav"
          aria-label="打开导航菜单"
        >
          <span class="nav-trigger__icon" aria-hidden="true">
            <span></span><span></span><span></span>
          </span>
          <span class="nav-trigger__text">菜单</span>
        </button>

        <span class="brand-mark">AuiahaHome</span>

        <a
          class="github-entry"
          href="${GITHUB_URL}"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="前往 GitHub 主页 myblodyvalentin"
          title="GitHub · myblodyvalentin"
        >
          <img
            class="github-entry__avatar"
            src="${AVATAR_URL}"
            alt="myblodyvalentin 的 GitHub 头像"
            width="40"
            height="40"
          />
          <span class="github-entry__meta">
            <span class="github-entry__label">GitHub</span>
            <span class="github-entry__name">myblodyvalentin</span>
          </span>
        </a>
      </header>

      <main>
        <section class="hero" aria-labelledby="hero-brand">
          <div class="hero__atmosphere" aria-hidden="true"></div>
          <div class="hero__grain" aria-hidden="true"></div>
          <div class="hero__content">
            <h1 class="hero__brand" id="hero-brand">Auiaha<em>Home</em></h1>
            <p class="hero__lead">
              一座属于自己的数字居所——记录项目、笔记与路上的风景。
            </p>
            <a class="hero__cta" href="#modules">
              探索模块
              <span class="hero__cta-arrow" aria-hidden="true">→</span>
            </a>
          </div>
        </section>

        <section class="modules" id="modules" aria-labelledby="modules-heading">
          <h2 class="modules__heading" id="modules-heading">站点模块</h2>
          <p class="modules__sub">
            从左侧菜单可展开全部入口；下方是当前规划中的内容版图。
          </p>
          <div class="modules__grid">
            ${renderModulesGrid()}
          </div>
        </section>
      </main>
    </div>
  </div>
`

const shell = document.getElementById('shell')
const navTrigger = document.getElementById('nav-trigger')
const sideNav = document.getElementById('side-nav')
const pageDim = document.getElementById('page-dim')

let closeTimer = null
const CLOSE_DELAY = 160

function openNav() {
  clearTimeout(closeTimer)
  shell.classList.add('is-nav-open')
  navTrigger.setAttribute('aria-expanded', 'true')
  navTrigger.setAttribute('aria-label', '关闭导航菜单')
  sideNav.setAttribute('aria-hidden', 'false')
}

function closeNav() {
  clearTimeout(closeTimer)
  closeTimer = setTimeout(() => {
    shell.classList.remove('is-nav-open')
    navTrigger.setAttribute('aria-expanded', 'false')
    navTrigger.setAttribute('aria-label', '打开导航菜单')
    sideNav.setAttribute('aria-hidden', 'true')
  }, CLOSE_DELAY)
}

function closeNavImmediate() {
  clearTimeout(closeTimer)
  shell.classList.remove('is-nav-open')
  navTrigger.setAttribute('aria-expanded', 'false')
  navTrigger.setAttribute('aria-label', '打开导航菜单')
  sideNav.setAttribute('aria-hidden', 'true')
}

// Desktop: hover on left trigger expands; keep open while over side nav
navTrigger.addEventListener('mouseenter', openNav)
navTrigger.addEventListener('mouseleave', closeNav)
sideNav.addEventListener('mouseenter', openNav)
sideNav.addEventListener('mouseleave', closeNav)

// Click / tap toggle for touch devices
navTrigger.addEventListener('click', (e) => {
  e.preventDefault()
  if (shell.classList.contains('is-nav-open')) {
    closeNavImmediate()
  } else {
    openNav()
  }
})

pageDim.addEventListener('click', closeNavImmediate)

sideNav.querySelectorAll('.side-nav__link').forEach((link) => {
  link.addEventListener('click', closeNavImmediate)
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeNavImmediate()
})
