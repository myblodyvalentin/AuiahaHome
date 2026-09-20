import './style.css'
import { initSketch } from './sketch.js'
import { initGuestbook } from './guestbook.js'
import { initNotes } from './notes-ui.js'
import { initGarden } from './garden.js'

const GITHUB_URL = 'https://github.com/myblodyvalentin'
const AVATAR_URL = 'https://avatars.githubusercontent.com/u/233668318?v=4'
const THEME_STORAGE_KEY = 'auiahahome-theme'

const THEMES = [
  { id: 'blue', label: '蓝色渐变', swatch: 'linear-gradient(135deg, #60a5fa, #2563eb)' },
  { id: 'pink', label: '粉色渐变', swatch: 'linear-gradient(135deg, #f9a8d4, #ec4899)' },
  { id: 'yellow', label: '黄色渐变', swatch: 'linear-gradient(135deg, #fde047, #eab308)' },
  { id: 'contrast', label: '高对比度', swatch: 'linear-gradient(135deg, #000 50%, #fff 50%)' },
  { id: 'white', label: '纯白色', swatch: '#ffffff' },
]

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
    id: 'social',
    title: '社交',
    desc: '蓝天白云下的草地花园：点空地种花，点小花读信。',
  },
  {
    id: 'projects',
    title: '项目',
    desc: '精选作品与实验，记录从想法到落地的过程。',
  },
  {
    id: 'notes',
    title: '笔记',
    desc: '前端 / Vue 工程化、Java Web 与 Linux 专栏；下方可留言。',
  },
  {
    id: 'contact',
    title: '联系',
    desc: 'GitHub 入口与留言板。',
  },
]

const PROJECTS = [
  {
    name: 'AuiahaHome',
    status: '进行中',
    desc: '个人数字居所：主题切换、侧栏导航，以及主视觉上的长按作画。',
    href: 'https://github.com/myblodyvalentin/AuiahaHome',
  },
  {
    name: '学习实验集',
    status: '持续更新',
    desc: '课堂与自学中的小实验——前端交互、页面结构与视觉节奏的练习场。',
    href: GITHUB_URL,
  },
  {
    name: '日常工具草稿',
    status: '构思中',
    desc: '把重复劳动收成小工具的想法簿，从脚本到轻量网页逐步落地。',
    href: GITHUB_URL,
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

function renderProjects() {
  return PROJECTS.map(
    (p) => `
    <article class="entry">
      <div class="entry__meta">
        <h3 class="entry__title">
          <a href="${p.href}" target="_blank" rel="noopener noreferrer">${p.name}</a>
        </h3>
        <span class="entry__status">${p.status}</span>
      </div>
      <p class="entry__desc">${p.desc}</p>
    </article>`
  ).join('')
}

function renderThemePicker(activeId) {
  return THEMES.map(
    (theme) => `
    <button
      class="theme-swatch${theme.id === activeId ? ' is-active' : ''}"
      type="button"
      data-theme-id="${theme.id}"
      aria-label="${theme.label}"
      aria-pressed="${theme.id === activeId ? 'true' : 'false'}"
      title="${theme.label}"
      style="--swatch: ${theme.swatch}"
    ></button>`
  ).join('')
}

function renderLogo(className = 'logo-mark') {
  return `
    <svg class="${className}" viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
      <g stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 34 L32 12 L50 34" />
        <path d="M14 34 H18" />
        <path d="M46 34 H50" />
        <path d="M44 20 V14" />
        <path d="M27 36 V48" />
        <path d="M37 36 V48" />
        <path d="M27 42 H37" />
        <path d="M16 48 C16 56 22 58 32 58 C42 58 48 56 48 48" />
      </g>
    </svg>`
}

function getInitialTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY)
  if (THEMES.some((t) => t.id === saved)) return saved
  return 'blue'
}

const initialTheme = getInitialTheme()
document.body.dataset.theme = initialTheme

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
        <div class="top-bar__left">
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

          <div class="theme-picker" role="group" aria-label="背景主题色">
            <span class="theme-picker__label">主题</span>
            ${renderThemePicker(initialTheme)}
          </div>
        </div>

        <span class="brand-mark">
          ${renderLogo('brand-mark__logo')}
          <span class="brand-mark__text">AuiahaHome</span>
        </span>

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
        <section class="hero" id="home" aria-labelledby="hero-brand">
          <div class="hero__atmosphere" aria-hidden="true"></div>
          <div class="hero__grain" aria-hidden="true"></div>
          <div class="sketch-floats" id="sketch-floats" aria-hidden="true"></div>
          <div class="hero__content">
            <p class="hero__sketch-hint" aria-live="polite">长按鼠标可以作画</p>
            <div class="hero__logo-wrap" aria-hidden="true">
              ${renderLogo('hero__logo')}
            </div>
            <h1 class="hero__brand" id="hero-brand">Auiaha<em>Home</em></h1>
            <p class="hero__lead">
              一座属于自己的数字居所——记录项目、笔记与路上的风景。
            </p>
            <a class="hero__cta" href="#about">
              了解更多
              <span class="hero__cta-arrow" aria-hidden="true">→</span>
            </a>
          </div>
        </section>

        <section class="panel" id="about" aria-labelledby="about-heading">
          <p class="panel__index">02 / 关于</p>
          <h2 class="panel__heading" id="about-heading">关于</h2>
          <p class="panel__lead">
            我是 Xu Zhiquan，就读于东北大学。写代码，也搭建自己的数字居所。
          </p>
          <div class="about-body">
            <p>
              AuiahaHome 是我的个人站点：把项目、笔记与日常灵感放在同一屋檐下。
              我关注界面节奏、交互细节，以及如何让页面既好看也好用。
            </p>
            <p>
              课堂之外，我会持续练习前端与工程化基础，并把过程公开在 GitHub。
              这里会慢慢长出更多内容——不是一次做完，而是一直住下去。
            </p>
          </div>
          <dl class="about-facts">
            <div class="about-facts__row">
              <dt>姓名</dt>
              <dd>Xu Zhiquan</dd>
            </div>
            <div class="about-facts__row">
              <dt>学校</dt>
              <dd>东北大学</dd>
            </div>
            <div class="about-facts__row">
              <dt>方向</dt>
              <dd>前端 · 个人作品 · 交互实验</dd>
            </div>
            <div class="about-facts__row">
              <dt>GitHub</dt>
              <dd>
                <a href="${GITHUB_URL}" target="_blank" rel="noopener noreferrer">myblodyvalentin</a>
              </dd>
            </div>
          </dl>
        </section>

        <section class="meadow" id="social" aria-labelledby="social-heading">
          <div class="meadow__sky">
            <span class="meadow__sun" aria-hidden="true"></span>
            <span class="meadow__cloud meadow__cloud--a" aria-hidden="true"></span>
            <span class="meadow__cloud meadow__cloud--b" aria-hidden="true"></span>
            <span class="meadow__cloud meadow__cloud--c" aria-hidden="true"></span>
            <div class="meadow__intro">
              <p class="meadow__index">03 / 社交</p>
              <h2 class="meadow__heading" id="social-heading">草地花园</h2>
              <p class="meadow__lead">
                点空草地种一朵会微笑的小花，点小花可以读信。同一块草地只能种一朵。
              </p>
              <p class="meadow__status" data-garden-status role="status"></p>
              <div class="meadow__auth">
                <span class="meadow__auth-label" data-garden-auth-label></span>
                <button class="meadow__login" type="button" data-garden-login>GitHub 登录</button>
              </div>
            </div>
          </div>
          <div
            class="meadow__field"
            data-garden-field
            role="application"
            tabindex="0"
            aria-label="可种花的草地"
          >
            <span class="meadow__field-hint" data-garden-hint>点这里种花</span>
            <div class="garden-ghost" data-garden-ghost hidden></div>
            <div class="garden-flowers" data-garden-flowers></div>
          </div>
        </section>

        <section class="panel panel--alt" id="projects" aria-labelledby="projects-heading">
          <p class="panel__index">04 / 项目</p>
          <h2 class="panel__heading" id="projects-heading">项目</h2>
          <p class="panel__lead">
            从想法到落地的作品与实验。点击名称可前往对应仓库。
          </p>
          <div class="entry-list">
            ${renderProjects()}
          </div>
        </section>

        <section class="panel" id="notes" aria-labelledby="notes-heading">
          <p class="panel__index">05 / 笔记</p>
          <h2 class="panel__heading" id="notes-heading">笔记专栏</h2>
          <p class="panel__lead">
            含前端基础、Vue 工程化、Java Web 与 Linux：点进模块可读完整图文笔记，下方可留言。
          </p>
          <div id="notes-root" class="notes-root"></div>

          <div class="guestbook" id="guestbook">
            <div class="guestbook__header">
              <h3 class="guestbook__title">留言板</h3>
              <p class="guestbook__status" data-guestbook-status role="status"></p>
            </div>

            <div class="guestbook__auth" data-guestbook-guest>
              <p class="guestbook__auth-text">登录 GitHub 后可以发表留言。</p>
              <button class="guestbook__login" type="button" data-guestbook-login>
                使用 GitHub 登录
              </button>
            </div>

            <div class="guestbook__auth guestbook__auth--user" data-guestbook-user hidden>
              <img
                class="guestbook__user-avatar"
                data-guestbook-useravatar
                src=""
                alt=""
                width="36"
                height="36"
              />
              <span class="guestbook__user-name" data-guestbook-username></span>
              <button class="guestbook__logout" type="button" data-guestbook-logout>
                退出
              </button>
            </div>

            <form class="guestbook__form" data-guestbook-form hidden>
              <label class="guestbook__label" for="guestbook-input">写下你的留言</label>
              <textarea
                id="guestbook-input"
                class="guestbook__input"
                data-guestbook-input
                rows="4"
                maxlength="500"
                placeholder="最多 500 字，友善交流～"
                required
              ></textarea>
              <button class="guestbook__submit" type="submit">发布留言</button>
            </form>

            <div class="guestbook__list" data-guestbook-list aria-live="polite"></div>
          </div>
        </section>

        <section class="panel panel--alt" id="contact" aria-labelledby="contact-heading">
          <p class="panel__index">06 / 联系</p>
          <h2 class="panel__heading" id="contact-heading">联系</h2>
          <p class="panel__lead">
            也可以先去笔记区留言，或通过 GitHub 找到我。
          </p>

          <div class="contact-block">
            <a
              class="contact-link"
              href="${GITHUB_URL}"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                class="contact-link__avatar"
                src="${AVATAR_URL}"
                alt=""
                width="56"
                height="56"
              />
              <span class="contact-link__text">
                <span class="contact-link__label">GitHub</span>
                <span class="contact-link__name">myblodyvalentin</span>
                <span class="contact-link__hint">打开主页 →</span>
              </span>
            </a>
            <p class="contact-note">
              <a href="#notes">前往笔记专栏与留言板 →</a>
            </p>
          </div>
        </section>

        <footer class="site-footer">
          <span>AuiahaHome</span>
          <span>Xu Zhiquan · 东北大学</span>
        </footer>
      </main>
    </div>
  </div>
`

const shell = document.getElementById('shell')
const navTrigger = document.getElementById('nav-trigger')
const sideNav = document.getElementById('side-nav')
const pageDim = document.getElementById('page-dim')

let closeTimer = null
const CLOSE_DELAY = 280

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

function setTheme(themeId) {
  if (!THEMES.some((t) => t.id === themeId)) return
  document.body.dataset.theme = themeId
  localStorage.setItem(THEME_STORAGE_KEY, themeId)

  document.querySelectorAll('.theme-swatch').forEach((btn) => {
    const active = btn.dataset.themeId === themeId
    btn.classList.toggle('is-active', active)
    btn.setAttribute('aria-pressed', active ? 'true' : 'false')
  })
}

document.querySelectorAll('.theme-swatch').forEach((btn) => {
  btn.addEventListener('click', () => setTheme(btn.dataset.themeId))
})

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

initSketch({
  hero: document.getElementById('home'),
  floatsHost: document.getElementById('sketch-floats'),
})

initNotes(document.getElementById('notes-root'))
initGuestbook(document.getElementById('guestbook'))
initGarden(document.getElementById('social'))
