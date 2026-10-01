/* ============================================================
   PROSPA FINANCIAL — shared sheet chrome
   Renders the masthead and the compliance footer for every
   magnet from one place, so the AFSL line and the general-advice
   warning are identical on all ten documents and can only be
   changed once.
   ============================================================ */

export const PROSPA = {
  name: 'Prospa Financial',
  phone: '03 8807 8000',
  site: 'prospafinancial.com.au',
  siteUrl: 'https://www.prospafinancial.com.au',
  address: 'Level 1, 36 Mills Street, Albert Park VIC 3206',
  tagline: 'Plan. Grow. Prosper.',
  positioning: 'People. Advice. Progress.',
  // Source: prospa-webinar-funnel.vercel.app registration page + session collateral.
  afsl:
    'Prospa Financial Pty Ltd is a Corporate Authorised Representative of Advice Evolution Pty Ltd, Australian Financial Services Licensee 342880.',
  generalAdvice:
    'This document provides general information only. It does not consider your personal objectives, financial situation or needs, and it is not a recommendation of any financial product, strategy or structure. Consider whether it is appropriate for you and seek personal advice before acting.',
}

/** The twelve magnets, in order. Single source for titles and routes. */
export const MAGNETS = [
  { no: '01', slug: '01-wealth-score', title: 'Your Wealth Score', kind: 'Scored assessment', agenda: 8 },
  { no: '02', slug: '02-freedom-number', title: 'Your Freedom Score', kind: 'Guided calculator', agenda: 5 },
  { no: '03', slug: '03-gap-years', title: 'The Gap Years', kind: 'Calculator', agenda: 5 },
  { no: '04', slug: '04-next-dollar', title: 'Your Next Dollar', kind: 'Route planner', agenda: 3 },
  { no: '05', slug: '05-three-buckets', title: 'Your Three Buckets', kind: 'Worksheet', agenda: 3 },
  { no: '06', slug: '06-bonus-playbook', title: 'The Bonus Playbook', kind: 'Planner', agenda: 1 },
  { no: '07', slug: '07-super-cheatsheet', title: 'The Super Cheatsheet', kind: 'Cheatsheet', agenda: 2 },
  { no: '08', slug: '08-structures', title: 'Where Your Wealth Lives', kind: 'Comparison', agenda: 4 },
  { no: '09', slug: '09-income-protection', title: 'Is Your Income Covered?', kind: 'Audit', agenda: 6 },
  { no: '10', slug: '10-estate-checklist', title: 'The Estate Checklist', kind: 'Checklist', agenda: 7 },
  { no: '11', slug: '11-conversation-swipe-file', title: 'What to Say', kind: 'Swipe file', agenda: 9 },
  { no: '12', slug: '12-freedom-guide', title: 'From High Income to Real Wealth', kind: 'Guide', agenda: 0 },
]

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

/**
 * Mount the shared chrome.
 * @param {{no:string, kind:string, root?:string, wide?:boolean}} opts
 *   no   — sheet number, e.g. '01'
 *   kind — short descriptor shown in the masthead
 *   root — relative path back to the gallery root (default '../')
 *   hero — optional hero band, see mountHero
 */
export function mountSheet({ no, kind, root = '../', wide = false, hero } = {}) {
  const back = document.querySelector('[data-sheet-back]')
  if (back) {
    back.outerHTML = `
      <div class="backbar${wide ? ' wide' : ''} no-print">
        <a class="back" href="${root}index.html">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          All session tools
        </a>
      </div>`
  }

  const head = document.querySelector('[data-sheet-masthead]')
  if (head) {
    head.outerHTML = `
      <header class="masthead">
        <a class="lockup" href="${PROSPA.siteUrl}" target="_blank" rel="noopener noreferrer">
          <img src="${root}assets/prospa-logo.png" alt="" width="42" height="42" />
          <span class="lockup-name">
            <b>PROSPA</b>
            <span>Plan · Grow · Prosper</span>
          </span>
        </a>
        <div class="masthead-meta">
          <span class="sheet-no">${esc(no)}</span>
          <span>${esc(kind)}</span>
        </div>
      </header>`
  }

  if (hero) mountHero({ ...hero, root })

  const foot = document.querySelector('[data-sheet-foot]')
  if (foot) {
    foot.outerHTML = `
      <footer class="sheet-foot">
        <div class="foot-top">
          <div>
            <b>${PROSPA.name}</b> · ${PROSPA.positioning}<br />
            Keep this. Bring your questions to a confidential conversation.
          </div>
          <div class="foot-contact">
            <span>${PROSPA.phone}</span>
            <a href="${PROSPA.siteUrl}" target="_blank" rel="noopener noreferrer">${PROSPA.site}</a>
            <span>${PROSPA.address}</span>
          </div>
        </div>
        <div class="afsl">
          <b style="color:var(--accent)">General information only.</b> ${PROSPA.generalAdvice}
          ${PROSPA.afsl}
        </div>
      </footer>`
  }
}

/**
 * Mount the hero band, if the magnet declares one.
 *
 * The band always sits ABOVE the title, never behind it. That is the whole
 * reason this is safe to put on twelve documents: no text is ever laid over
 * a photograph, so contrast cannot fail — on screen, on paper, or in a
 * high-contrast mode we never see.
 *
 * @param {{src:string, alt:string, variant?:'art'|'photo', pos?:string,
 *          height?:'short'|'tall', cap?:string, root?:string}} o
 */
export function mountHero({ src, alt = '', variant = 'art', pos, height, cap, root = '../' } = {}) {
  const slot = document.querySelector('[data-sheet-hero]')
  if (!slot || !src) return

  const cls = ['lm-hero', `lm-hero--${variant}`, height ? `lm-hero--${height}` : ''].filter(Boolean).join(' ')
  slot.outerHTML = `
    <figure class="${cls}"${pos ? ` style="--lm-hero-pos:${esc(pos)}"` : ''}>
      <img src="${root}assets/img/${esc(src)}" alt="${esc(alt)}" loading="eager" decoding="async" />
      ${cap ? `<figcaption class="lm-hero-cap">${esc(cap)}</figcaption>` : ''}
    </figure>`
}

/** Print the current sheet. Wired to any [data-print] button. */
export function wirePrint() {
  document.querySelectorAll('[data-print]').forEach((b) => b.addEventListener('click', () => window.print()))
}

/** Currency, AUD, no cents. */
export const money = (n) =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(Math.round(Number(n) || 0))

/** Currency that keeps a leading minus for shortfalls. */
export const signedMoney = (n) => (n < 0 ? '−' + money(Math.abs(n)) : money(n))

/**
 * Persist a magnet's working state so an attendee can close the tab
 * and come back. Everything stays in this browser; nothing is sent anywhere.
 */
export function store(key) {
  const k = 'prospa:' + key
  return {
    read() {
      try {
        return JSON.parse(localStorage.getItem(k) || 'null')
      } catch {
        return null
      }
    },
    write(v) {
      try {
        localStorage.setItem(k, JSON.stringify(v))
      } catch {
        /* private mode, blocked storage — the sheet still works */
      }
    },
    clear() {
      try {
        localStorage.removeItem(k)
      } catch {
        /* no-op */
      }
    },
  }
}

/** Save/restore every [data-persist] field on a worksheet. */
export function persistFields(key) {
  const s = store(key)
  const fields = Array.from(document.querySelectorAll('[data-persist]'))
  const saved = s.read() || {}

  // Captured BEFORE anything is restored, so "clear" means "back to how the
  // sheet shipped" rather than "blank". Assigning '' to a <select> selects no
  // option at all, and to a range input snaps it to the middle of its scale —
  // both of which look to a reader like the control broke.
  const isToggle = (el) => el.type === 'checkbox' || el.type === 'radio'
  const defaults = new Map(fields.map((el) => [el, isToggle(el) ? el.checked : el.value]))

  fields.forEach((el) => {
    const id = el.getAttribute('data-persist')
    if (saved[id] !== undefined) {
      if (el.type === 'checkbox') el.checked = !!saved[id]
      // A radio group shares one data-persist id and stores the chosen value.
      // Assigning to .value here would rewrite the radio's own value attribute
      // and quietly break the group.
      else if (el.type === 'radio') el.checked = el.value === saved[id]
      else el.value = saved[id]
    }
    el.addEventListener('input', save)
    el.addEventListener('change', save)
  })

  function save() {
    const out = {}
    fields.forEach((el) => {
      const id = el.getAttribute('data-persist')
      if (el.type === 'checkbox') out[id] = el.checked
      else if (el.type === 'radio') {
        if (el.checked) out[id] = el.value
      } else out[id] = el.value
    })
    s.write(out)
  }

  document.querySelectorAll('[data-clear]').forEach((b) =>
    b.addEventListener('click', () => {
      s.clear()
      fields.forEach((el) => {
        const d = defaults.get(el)
        if (isToggle(el)) el.checked = d
        else el.value = d
      })
      fields[0]?.dispatchEvent(new Event('input', { bubbles: true }))
      fields[0]?.dispatchEvent(new Event('change', { bubbles: true }))
    })
  )

  return s
}
