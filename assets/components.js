/* ============================================================
   PROSPA FINANCIAL — lead magnet interaction components
   Four behaviours, written in plain JavaScript so the sheets
   keep their defining properties: no build step, no runtime
   dependency, and every page still prints to a clean A4 PDF.

     shortcuts(key)   the cheatsheet shortcut tracker
     strikeList(key)  checklists that cross out as you go
     mountFan(el)     the swipe-file fan
     mountBook(el)    the page-turning ebook

   Ported in behaviour from the Health OS design system's
   SwipeFiles.tsx and Ebook.tsx, rebuilt without React,
   framer-motion or react-pageflip.
   ============================================================ */

import { store } from './sheet.js'

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ==========================================================
   1 · SHORTCUTS — what each item on a cheatsheet saves you,
   and a running tally of the ones you have claimed.
   ========================================================== */

/** The kinds of saving a shortcut can offer. Order sets the tally order. */
export const SAVINGS = {
  tax: { label: 'Tax', tone: 'green', verb: 'tax efficiency' },
  money: { label: 'Money', tone: 'green', verb: 'money' },
  time: { label: 'Time', tone: 'teal', verb: 'time' },
  admin: { label: 'Admin', tone: 'teal', verb: 'admin' },
  risk: { label: 'Risk', tone: 'ember', verb: 'risk removed' },
  knowledge: { label: 'Knowledge', tone: 'slate', verb: 'knowledge' },
}

const SAVE_ICON = {
  tax: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  money: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4"/>',
  time: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  admin: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
  risk: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>',
  knowledge: '<path d="M12 3 2 8l10 5 10-5-10-5Z"/><path d="M6 10.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5"/>',
}

/**
 * Wire every [data-shortcut] on the page to a tally in [data-shortcut-tally].
 * A shortcut is a piece of the sheet that saves the reader something specific.
 * Claiming one is a private note to self — it never leaves the browser.
 */
export function shortcuts(key) {
  const items = Array.from(document.querySelectorAll('[data-shortcut]'))
  if (!items.length) return
  const tally = document.querySelector('[data-shortcut-tally]')
  const saved = store('shortcuts:' + key)
  const claimed = new Set(saved.read() || [])

  items.forEach((item) => {
    const id = item.dataset.shortcut
    const btn = item.querySelector('[data-claim]')
    if (!btn) return
    const set = (on) => {
      item.classList.toggle('claimed', on)
      btn.setAttribute('aria-pressed', String(on))
      btn.querySelector('.claim-text').textContent = on ? 'Noted for me' : 'This applies to me'
    }
    set(claimed.has(id))
    btn.addEventListener('click', () => {
      claimed.has(id) ? claimed.delete(id) : claimed.add(id)
      set(claimed.has(id))
      saved.write([...claimed])
      render()
    })
  })

  function render() {
    if (!tally) return
    const total = items.length
    const n = claimed.size
    const counts = {}
    items.forEach((item) => {
      if (!claimed.has(item.dataset.shortcut)) return
      ;(item.dataset.saves || '')
        .split(/\s+/)
        .filter(Boolean)
        .forEach((k) => (counts[k] = (counts[k] || 0) + 1))
    })

    const chips = Object.keys(SAVINGS)
      .filter((k) => counts[k])
      .map(
        (k) =>
          `<span class="sc-chip sc-${SAVINGS[k].tone}">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SAVE_ICON[k]}</svg>
             ${SAVINGS[k].label} <b>${counts[k]}</b>
           </span>`
      )
      .join('')

    tally.innerHTML = `
      <div class="sc-tally-head">
        <div>
          <span class="sc-tally-k">Shortcuts you have claimed</span>
          <span class="sc-tally-n"><b>${n}</b> <i>of ${total}</i></span>
        </div>
        <div class="sc-tally-track"><i style="transform:scaleX(${(n / total).toFixed(3)})"></i></div>
      </div>
      ${
        n === 0
          ? `<p class="sc-tally-note">Nothing claimed yet. Work down the page and mark the ones that
             apply to you — the list you build is the agenda for a conversation, and it is the part
             of this sheet worth printing.</p>`
          : `<div class="sc-chips">${chips}</div>
             <p class="sc-tally-note">${summary(n, total, counts)}</p>`
      }`
  }

  function summary(n, total, counts) {
    const kinds = Object.keys(SAVINGS).filter((k) => counts[k])
    const named = kinds.map((k) => SAVINGS[k].verb)
    const list =
      named.length === 1
        ? named[0]
        : named.slice(0, -1).join(', ') + ' and ' + named[named.length - 1]
    if (n === total)
      return `Every shortcut on this page is one you have flagged — across ${list}. That is a long
              agenda. Start with whichever has a deadline attached: caps and nominations expire,
              structures do not.`
    return `${n} of ${total} flagged, across ${list}. Each one is a decision already available to
            you that is not yet being used. Print this page and the claimed items come with it.`
  }

  render()
}

/* ==========================================================
   2 · STRIKE LISTS — checklists that cross an item out as it
   is ticked, with a live count.
   ========================================================== */

export function strikeList(key, onChange) {
  const boxes = Array.from(document.querySelectorAll('[data-strike]'))
  if (!boxes.length) return
  const saved = store('strike:' + key)
  const done = new Set(saved.read() || [])

  const sync = (box) => {
    const row = box.closest('.check, .audit-q, .strike-row') || box.parentElement
    row?.classList.toggle('struck', box.checked)
  }

  boxes.forEach((box) => {
    const id = box.dataset.strike
    box.checked = done.has(id)
    sync(box)
    box.addEventListener('change', () => {
      box.checked ? done.add(id) : done.delete(id)
      sync(box)
      saved.write([...done])
      onChange?.(done.size, boxes.length)
    })
  })

  document.querySelectorAll('[data-strike-clear]').forEach((b) =>
    b.addEventListener('click', () => {
      done.clear()
      saved.clear()
      boxes.forEach((box) => {
        box.checked = false
        sync(box)
      })
      onChange?.(0, boxes.length)
    })
  )

  onChange?.(done.size, boxes.length)
  return { count: () => done.size, total: boxes.length }
}

/* ==========================================================
   3 · FAN — the swipe-file fan. Cards sit in an arc; the
   centre one turns over to show what is inside.
   ========================================================== */

/** Slot geometry: rotation in deg, scale, x and y offsets in rem at full spread. */
const FAN_SLOTS = [
  { rot: -21, scale: 0.776, x: -30, y: 7.3, z: 1 },
  { rot: -14, scale: 0.85, x: -22, y: 4.0, z: 2 },
  { rot: -7, scale: 0.935, x: -11, y: 1.3, z: 3 },
  { rot: 0, scale: 1, x: 0, y: 0, z: 10 },
  { rot: 7, scale: 0.935, x: 11, y: 1.3, z: 3 },
  { rot: 14, scale: 0.85, x: 22, y: 4.0, z: 2 },
  { rot: 21, scale: 0.776, x: 30, y: 7.3, z: 1 },
]

/** Card width and fan height in rem, and how far the slots spread, by container width. */
const FAN_STEPS = [
  { below: 480, card: 7.5, height: 25, spread: 0.3 },
  { below: 640, card: 9, height: 28, spread: 0.4 },
  { below: 768, card: 11, height: 31, spread: 0.52 },
  { below: 1024, card: 14, height: 35, spread: 0.76 },
  { below: Infinity, card: 16, height: 38, spread: 1 },
]

export function mountFan(el, files, { actionLabel = 'Use this script', onGet } = {}) {
  if (!el || !files.length) return
  let current = 0
  let turned = false
  let hovered = null

  el.innerHTML = `
    <div class="fan-stage" role="group" aria-roledescription="carousel" aria-label="Swipe files">
      <div class="fan-cards"></div>
    </div>
    <p class="fan-status" aria-live="polite"></p>
    <div class="fan-controls no-print">
      <button type="button" class="fan-nav" data-fan="-1" aria-label="Previous swipe file">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <div class="fan-dots"></div>
      <button type="button" class="fan-nav" data-fan="1" aria-label="Next swipe file">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    </div>`

  const stage = el.querySelector('.fan-stage')
  const track = el.querySelector('.fan-cards')
  const status = el.querySelector('.fan-status')
  const dots = el.querySelector('.fan-dots')

  track.innerHTML = files
    .map(
      (f, i) => `
      <div class="fan-card" data-i="${i}">
        <div class="fan-inner">
          <button type="button" class="fan-face fan-front" data-turn="${i}"
                  aria-label="${esc(f.title)}, ${esc(f.format)}. Turn over to see what is inside">
            <span class="fan-art" style="--tint:${f.tint || 'var(--bg2)'}">
              <span class="fan-art-mark">${f.mark || ''}</span>
            </span>
            <span class="fan-front-copy">
              <span class="badge badge-${f.tone || 'teal'}"><i class="d"></i>${esc(f.format)}</span>
              <span class="fan-title">${esc(f.title)}</span>
              <span class="fan-len">${esc(f.length)}</span>
            </span>
          </button>
          <div class="fan-face fan-back" role="group" aria-label="${esc(f.title)} details" aria-hidden="true">
            <div class="fan-back-head">
              <span class="fan-art-sm" style="--tint:${f.tint || 'var(--bg2)'}">${f.mark || ''}</span>
              <div>
                <span class="badge badge-teal"><i class="d"></i>Swipe file</span>
                <span class="fan-meta">${esc(f.format)} · ${esc(f.length)}</span>
              </div>
            </div>
            <div>
              <h4 class="fan-back-title">${esc(f.title)}</h4>
              <p class="fan-sub">${esc(f.subtitle)}</p>
            </div>
            <div class="fan-inside">
              <span class="fan-inside-k">What's inside</span>
              <ul>${f.inside
                .map(
                  (x) => `<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"
                         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>${esc(
                           x
                         )}</li>`
                )
                .join('')}</ul>
            </div>
            <div class="fan-actions">
              <button type="button" class="btn btn-primary btn-sm" data-get="${i}">${esc(actionLabel)}</button>
              <button type="button" class="btn btn-ghost btn-sm" data-back>Turn it back</button>
            </div>
          </div>
        </div>
      </div>`
    )
    .join('')

  dots.innerHTML = files
    .map((f, i) => `<button type="button" class="fan-dot" data-dot="${i}" aria-label="${esc(f.title)}"></button>`)
    .join('')

  const cards = Array.from(track.querySelectorAll('.fan-card'))

  function metrics() {
    const w = el.clientWidth || 640
    const step = FAN_STEPS.find((s) => w < s.below)
    // Keep the outermost card inside the fan's own width.
    const rem = 16
    const maxX = (w / 2 - (step.card * rem) / 2 - 8) / rem
    const spread = Math.min(step.spread, maxX / 30)
    return { ...step, spread: Math.max(spread, 0.12) }
  }

  function place() {
    const m = metrics()
    stage.style.height = m.height + 'rem'
    stage.style.setProperty('--fan-card-w', m.card + 'rem')

    const half = (FAN_SLOTS.length - 1) / 2
    cards.forEach((card, i) => {
      // Offset from the centre, wrapped so the fan always loops — with exactly as
      // many cards as slots the set still has to spread both ways, not just right.
      const n = files.length
      let d = i - current
      if (n > 1) {
        d = ((d % n) + n) % n
        if (d > Math.floor(n / 2)) d -= n
      }
      const slotIndex = d + half
      const inFan = slotIndex >= 0 && slotIndex < FAN_SLOTS.length
      const slot = FAN_SLOTS[Math.max(0, Math.min(FAN_SLOTS.length - 1, slotIndex))]
      const isCentre = d === 0

      let { rot, scale, x, y, z } = slot
      x *= m.spread
      y *= m.spread

      // Hovering a card lifts it and eases its neighbours apart.
      if (hovered !== null && !turned) {
        const hd = hovered - current
        if (i - current === hd) {
          y -= 2.2 * m.spread
          scale *= 1.07
          z = 20
        } else if (hd !== null) {
          const side = Math.sign(d - hd) || 0
          x += side * 1.6 * m.spread
          rot += side * 2
        }
      }

      if (isCentre && turned) {
        // A modest lift for emphasis. The back is sized to fit the card as it is —
        // scaling magnifies, it does not create layout room.
        scale *= 1.2
        z = 30
      }

      card.style.transform = `translate(-50%,-50%) translate(${x}rem, ${y}rem) rotate(${rot}deg) scale(${scale})`
      card.style.zIndex = String(z)
      card.style.opacity = inFan ? '1' : '0'
      card.style.pointerEvents = inFan ? 'auto' : 'none'
      card.classList.toggle('is-centre', isCentre)
      card.classList.toggle('is-turned', isCentre && turned)

      const front = card.querySelector('.fan-front')
      const back = card.querySelector('.fan-back')
      const showBack = isCentre && turned
      front.tabIndex = isCentre && !turned ? 0 : -1
      front.setAttribute('aria-hidden', showBack ? 'true' : 'false')
      back.setAttribute('aria-hidden', showBack ? 'false' : 'true')
      back.querySelectorAll('button').forEach((b) => (b.tabIndex = showBack ? 0 : -1))
    })

    status.textContent = `Swipe file ${current + 1} of ${files.length}: ${files[current].title}`
    dots.querySelectorAll('.fan-dot').forEach((d, i) => d.classList.toggle('on', i === current))
  }

  function go(delta) {
    turned = false
    current = (current + delta + files.length) % files.length
    place()
  }

  el.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-fan]')
    if (nav) return go(Number(nav.dataset.fan))

    const dot = e.target.closest('[data-dot]')
    if (dot) {
      turned = false
      current = Number(dot.dataset.dot)
      return place()
    }

    const turn = e.target.closest('[data-turn]')
    if (turn) {
      const i = Number(turn.dataset.turn)
      if (i !== current) {
        turned = false
        current = i
        place()
      } else {
        turned = true
        place()
        setTimeout(() => cards[i].querySelector('[data-get]')?.focus({ preventScroll: true }), reduced() ? 0 : 420)
      }
      return
    }

    if (e.target.closest('[data-back]')) {
      turned = false
      place()
      cards[current].querySelector('.fan-front')?.focus({ preventScroll: true })
      return
    }

    const get = e.target.closest('[data-get]')
    if (get) onGet?.(files[Number(get.dataset.get)])
  })

  // Hover eases the neighbours apart; leaving settles the fan again.
  let leaveTimer
  cards.forEach((card, i) => {
    card.addEventListener('pointerenter', () => {
      if (window.matchMedia('(hover: none)').matches) return
      clearTimeout(leaveTimer)
      hovered = i
      place()
    })
    card.addEventListener('pointerleave', () => {
      clearTimeout(leaveTimer)
      leaveTimer = setTimeout(() => {
        hovered = null
        place()
      }, 60)
    })
  })

  el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      go(1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      go(-1)
    } else if (e.key === 'Escape' && turned) {
      turned = false
      place()
      cards[current].querySelector('.fan-front')?.focus({ preventScroll: true })
    }
  })

  const ro = new ResizeObserver(place)
  ro.observe(el)
  place()
  return { go, place }
}

/* ==========================================================
   4 · BOOK — a closed book that opens into a page-turning
   reader. Real sheets with two faces, rotated about the
   spine; no page-flip library.
   ========================================================== */

export function mountBook(el, { title, subtitle, format = 'Guide', pages, readLabel = 'Read a preview' }) {
  if (!el || !pages.length) return

  // Sheet n carries pages[2n] on its front and pages[2n+1] on its back.
  const sheets = []
  for (let i = 0; i < pages.length; i += 2) sheets.push([pages[i], pages[i + 1] || null])

  let open = false
  let turnedTo = 0 // how many sheets have been turned to the left

  el.innerHTML = `
    <div class="book-closed">
      <button type="button" class="book-cover-btn" aria-label="${esc(readLabel)}: ${esc(title)}">
        <span class="book-3d">
          <span class="book-front">
            <span class="book-art"><span class="book-art-mark">${coverMark()}</span></span>
            <span class="book-front-copy">
              <span class="badge badge-green"><i class="d"></i>${esc(format)}</span>
              <span class="book-title">${esc(title)}</span>
              <span class="book-sub">${esc(subtitle)}</span>
            </span>
            <span class="book-crease" aria-hidden="true"></span>
          </span>
          <span class="book-edge" aria-hidden="true"></span>
          <span class="book-back" aria-hidden="true"></span>
        </span>
      </button>
      <div class="book-aside">
        <span class="eyebrow">Preview · ${pages.length} pages</span>
        <h3 class="book-aside-title">${esc(title)}</h3>
        <p class="book-aside-sub">${esc(subtitle)}</p>
        <button type="button" class="btn btn-primary book-open">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M2 4h7a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H2zM22 4h-7a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5H22z"/>
          </svg>
          ${esc(readLabel)}
        </button>
      </div>
    </div>

    <div class="book-reader" hidden>
      <div class="book-stage" tabindex="-1" role="region" aria-label="${esc(title)} reader">
        <div class="book-sheets"></div>
        <div class="book-one" hidden></div>
      </div>
      <div class="book-controls no-print">
        <button type="button" class="fan-nav" data-page="-1" aria-label="Previous page">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <span class="book-status" aria-live="polite"></span>
        <button type="button" class="fan-nav" data-page="1" aria-label="Next page">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
        </button>
        <button type="button" class="btn btn-ghost btn-sm book-close">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
          Close
        </button>
      </div>
    </div>`

  // Explicit width/height: the mark must never depend on CSS alone to be sized.
  function coverMark() {
    return `<svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>`
  }

  const closed = el.querySelector('.book-closed')
  const reader = el.querySelector('.book-reader')
  const stage = el.querySelector('.book-stage')
  const sheetWrap = el.querySelector('.book-sheets')
  const status = el.querySelector('.book-status')

  sheetWrap.innerHTML = sheets
    .map(
      ([front, back], i) => `
      <div class="book-sheet" data-sheet="${i}">
        <div class="book-page book-page-front">${renderPage(front, i * 2 + 1)}</div>
        <div class="book-page book-page-back">${back ? renderPage(back, i * 2 + 2) : '<div class="book-blank"></div>'}</div>
      </div>`
    )
    .join('')

  function renderPage(p, n) {
    if (!p) return '<div class="book-blank"></div>'
    const foot = `<div class="book-foot"><span>${esc(title)}</span><span>${n}</span></div>`
    if (p.kind === 'cover')
      return `<div class="book-pg book-pg-cover">
                <div class="book-art book-art-page"><span class="book-art-mark">${coverMark()}</span></div>
                <div class="book-pg-copy">
                  <span class="badge badge-green"><i class="d"></i>${esc(format)}</span>
                  <p class="book-pg-title">${esc(title)}</p>
                  <p class="book-pg-sub">${esc(subtitle)}</p>
                </div>
              </div>`
    if (p.kind === 'contents')
      return `<div class="book-pg">
                <span class="book-k">Contents</span>
                <h4 class="book-h">${esc(p.title || 'In this preview')}</h4>
                <ol class="book-toc">${p.items
                  .map((it) => `<li><span>${esc(it.label)}</span><em>${it.page}</em></li>`)
                  .join('')}</ol>
                ${foot}
              </div>`
    if (p.kind === 'chapter')
      return `<div class="book-pg">
                ${p.stat ? `<div class="book-stat"><b>${esc(p.stat.v)}</b><span>${esc(p.stat.k)}</span></div>` : ''}
                <span class="book-k">Chapter ${p.number}</span>
                <h4 class="book-h">${esc(p.title)}</h4>
                ${p.body.map((b) => `<p class="book-p">${esc(b)}</p>`).join('')}
                ${foot}
              </div>`
    if (p.kind === 'quote')
      return `<div class="book-pg book-pg-quote">
                <figure>
                  <blockquote><p>${esc(p.text)}</p></blockquote>
                  ${p.cite ? `<figcaption>${esc(p.cite)}</figcaption>` : ''}
                </figure>
                ${foot}
              </div>`
    if (p.kind === 'cta')
      return `<div class="book-pg">
                <span class="book-k">Next step</span>
                <h4 class="book-h">${esc(p.title)}</h4>
                <p class="book-p">${esc(p.body)}</p>
                <a class="btn btn-primary btn-sm book-cta" href="${esc(p.href || '#')}"
                   ${p.href && p.href.startsWith('http') ? 'target="_blank" rel="noopener noreferrer"' : ''}>${esc(
                     p.action || 'Continue'
                   )}</a>
                ${foot}
              </div>`
    return `<div class="book-pg">${foot}</div>`
  }

  const sheetEls = Array.from(sheetWrap.querySelectorAll('.book-sheet'))
  const oneWrap = el.querySelector('.book-one')

  /* Two renderers. Wide: real sheets turning about the spine. Narrow: one page at a
     time — a sheet model on a phone would skip every even page, since the backs
     only become visible mid-turn. `pageIdx` is the shared position. */
  let pageIdx = 0 // 0-based page, used in single mode
  const isSingle = () => el.clientWidth < 720

  function layout() {
    const single = isSingle()
    sheetWrap.classList.toggle('single', single)
    sheetWrap.hidden = single
    oneWrap.hidden = !single

    if (single) {
      pageIdx = Math.max(0, Math.min(pages.length - 1, pageIdx))
      oneWrap.innerHTML = `<div class="book-page book-page-one">${renderPage(pages[pageIdx], pageIdx + 1)}</div>`
      status.textContent = `Page ${pageIdx + 1} of ${pages.length}`
      el.querySelector('[data-page="-1"]').disabled = pageIdx === 0
      el.querySelector('[data-page="1"]').disabled = pageIdx >= pages.length - 1
      return
    }

    sheetEls.forEach((s, i) => {
      const flipped = i < turnedTo
      s.classList.toggle('flipped', flipped)
      // Turned sheets stack upward on the left; untouched sheets stack downward on the right.
      s.style.zIndex = String(flipped ? 100 + i : 100 - i)
    })
    /* Sheet i carries page 2i+1 on its front and 2i+2 on its back. With `turnedTo`
       sheets flipped, the left page is 2·turnedTo and the right is 2·turnedTo+1 —
       so the cover and the final page each show alone. */
    const left = turnedTo === 0 ? null : turnedTo * 2
    const right = turnedTo * 2 + 1 <= pages.length ? turnedTo * 2 + 1 : null
    sheetWrap.classList.toggle('at-cover', turnedTo === 0)
    sheetWrap.classList.toggle('at-end', right === null)
    status.textContent =
      left && right ? `Pages ${left}–${right} of ${pages.length}` : `Page ${left || right} of ${pages.length}`
    el.querySelector('[data-page="-1"]').disabled = turnedTo === 0
    el.querySelector('[data-page="1"]').disabled = turnedTo >= sheets.length
  }

  function turn(delta) {
    if (isSingle()) {
      pageIdx = Math.max(0, Math.min(pages.length - 1, pageIdx + delta))
      // Keep the wide view roughly where the narrow one left off.
      turnedTo = Math.min(sheets.length, Math.ceil(pageIdx / 2))
    } else {
      turnedTo = Math.max(0, Math.min(sheets.length, turnedTo + delta))
      pageIdx = Math.min(pages.length - 1, turnedTo === 0 ? 0 : turnedTo * 2 - 1)
    }
    layout()
  }

  el.addEventListener('click', (e) => {
    if (e.target.closest('.book-open') || e.target.closest('.book-cover-btn')) {
      open = true
      closed.hidden = true
      reader.hidden = false
      layout()
      stage.focus({ preventScroll: true })
      stage.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' })
      return
    }
    const nav = e.target.closest('[data-page]')
    if (nav) return turn(Number(nav.dataset.page))
    if (e.target.closest('.book-close')) {
      open = false
      reader.hidden = true
      closed.hidden = false
      turnedTo = 0
      pageIdx = 0
      el.querySelector('.book-cover-btn')?.focus({ preventScroll: true })
    }
  })

  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      turn(1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      turn(-1)
    }
  })

  // Turn by clicking the outer half of a page, the way a book works.
  sheetWrap.addEventListener('click', (e) => {
    if (e.target.closest('a, button, input')) return
    const rect = sheetWrap.getBoundingClientRect()
    turn(e.clientX - rect.left > rect.width / 2 ? 1 : -1)
  })

  const ro = new ResizeObserver(layout)
  ro.observe(el)
  layout()
  return { turn, isOpen: () => open }
}
