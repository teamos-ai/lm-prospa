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

/** The ten magnets, in order. Single source for titles and routes. */
export const MAGNETS = [
  { no: '01', slug: '01-wealth-score', title: 'The Executive Wealth Score', kind: 'Scored assessment', agenda: 8 },
  { no: '02', slug: '02-freedom-number', title: 'Your Financial Freedom Number', kind: 'Calculator', agenda: 5 },
  { no: '03', slug: '03-gap-years', title: 'The Gap Years Map', kind: 'Calculator', agenda: 5 },
  { no: '04', slug: '04-next-dollar', title: 'The Next Dollar Decision Map', kind: 'Decision guide', agenda: 3 },
  { no: '05', slug: '05-three-buckets', title: 'The Three Wealth Buckets', kind: 'Worksheet', agenda: 3 },
  { no: '06', slug: '06-bonus-playbook', title: 'The Bonus & Surplus Playbook', kind: 'Planner', agenda: 1 },
  { no: '07', slug: '07-super-cheatsheet', title: 'The Executive Super Cheatsheet', kind: 'Cheatsheet', agenda: 2 },
  { no: '08', slug: '08-structures', title: 'Wealth Structures, Compared', kind: 'Comparison', agenda: 4 },
  { no: '09', slug: '09-income-protection', title: 'The Income Protection Audit', kind: 'Audit', agenda: 6 },
  { no: '10', slug: '10-estate-checklist', title: 'The Estate & Beneficiary Checklist', kind: 'Checklist', agenda: 7 },
]

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

/**
 * Mount the shared chrome.
 * @param {{no:string, kind:string, root?:string, wide?:boolean}} opts
 *   no   — sheet number, e.g. '01'
 *   kind — short descriptor shown in the masthead
 *   root — relative path back to the gallery root (default '../')
 */
export function mountSheet({ no, kind, root = '../', wide = false } = {}) {
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
          <b style="color:#cfe0e2">General information only.</b> ${PROSPA.generalAdvice}
          ${PROSPA.afsl}
        </div>
      </footer>`
  }
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

  fields.forEach((el) => {
    const id = el.getAttribute('data-persist')
    if (saved[id] !== undefined) {
      if (el.type === 'checkbox') el.checked = !!saved[id]
      else el.value = saved[id]
    }
    el.addEventListener('input', save)
    el.addEventListener('change', save)
  })

  function save() {
    const out = {}
    fields.forEach((el) => {
      out[el.getAttribute('data-persist')] = el.type === 'checkbox' ? el.checked : el.value
    })
    s.write(out)
  }

  document.querySelectorAll('[data-clear]').forEach((b) =>
    b.addEventListener('click', () => {
      s.clear()
      fields.forEach((el) => {
        if (el.type === 'checkbox') el.checked = false
        else el.value = ''
      })
      fields[0]?.dispatchEvent(new Event('input', { bubbles: true }))
    })
  )

  return s
}
