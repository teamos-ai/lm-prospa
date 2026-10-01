/* ============================================================
   PROSPA FINANCIAL — number & indicator widgets
   A plain-JavaScript port of the widget vocabulary in the
   design systems: the Prospa calculator bento (donut, bars,
   sparkline, hero tile) and the Health OS widget library
   (ScoreGauge, TickedGauge, MetricStrip, BreakdownBar,
   GoalProgress, ProgressRows, Comparison, Stepper).

   Every widget takes real data, animates its measurement into
   view once, and settles straight to its final state under
   reduced motion. No framework, no library — the sheets stay
   buildless and still print.
   ============================================================ */

export const TONE = {
  teal: '#135f69',
  tealDeep: '#0a363c',
  tealSoft: '#5fa6a4',
  green: '#5dce38',
  greenDeep: '#4eb52d',
  ember: '#c65a1e',
  amber: '#d79a27',
  slate: '#33373d',
  track: '#e7efef',
}

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* One observer for every widget on the page. */
const seen = new WeakSet()
const io =
  typeof IntersectionObserver === 'undefined'
    ? null
    : new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting || seen.has(e.target)) return
            seen.add(e.target)
            e.target.__play?.()
            io.unobserve(e.target)
          })
        },
        { threshold: 0.35 }
      )

/** Run `play` when the element is first seen — or straight away if it cannot be observed. */
function onSeen(el, play) {
  if (reduced() || !io) return play(true)
  el.__play = () => play(false)
  io.observe(el)
  // Already in view on load: the observer fires on the next frame anyway.
}

/** Count a figure up to its value. Returns immediately under reduced motion. */
export function countUp(el, value, { format = (v) => Math.round(v).toLocaleString('en-AU'), ms = 1100 } = {}) {
  if (reduced()) {
    el.textContent = format(value)
    return
  }
  const t0 = performance.now()
  const tick = (t) => {
    const k = Math.min((t - t0) / ms, 1)
    el.textContent = format(value * (1 - Math.pow(1 - k, 3)))
    if (k < 1) requestAnimationFrame(tick)
    else el.textContent = format(value)
  }
  requestAnimationFrame(tick)
}

export const money = (n) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(
    Math.round(Number(n) || 0)
  )

/** $1.4m / $940k / $8,200 — for axis ticks and tight tiles. */
export const moneyShort = (n) => {
  const v = Math.abs(Number(n) || 0)
  const sign = n < 0 ? '−' : ''
  if (v >= 1e6) return `${sign}$${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace(/\.0$/, '')}m`
  if (v >= 1e3) return `${sign}$${Math.round(v / 1e3)}k`
  return `${sign}$${Math.round(v)}`
}

/* ==========================================================
   1 · SCORE GAUGE — a 180° arc with the figure beneath it.
   The headline indicator.
   ========================================================== */

export function scoreGauge(el, { value, max = 100, unit = '', caption = '', tone = TONE.green, track = TONE.track }) {
  const pct = Math.max(0, Math.min(1, value / max))
  const R = 84
  const len = Math.PI * R // the arc's length
  // The caption sits outside the gauge box: the figure inside it is absolutely
  // positioned, so anything left in normal flow would land on top of it.
  el.classList.add('w-gaugebox')
  el.innerHTML = `
    <div class="w-gauge">
    <svg viewBox="0 0 200 118" role="img" aria-label="${esc(value)} of ${esc(max)}${unit ? ' ' + esc(unit) : ''}">
      <defs>
        <linearGradient id="wg-${el.id || 'g'}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="${TONE.teal}" />
          <stop offset="0.55" stop-color="${TONE.tealSoft}" />
          <stop offset="1" stop-color="${tone}" />
        </linearGradient>
      </defs>
      <path d="M16 100 A${R} ${R} 0 0 1 184 100" fill="none" stroke="${track}" stroke-width="14" stroke-linecap="round" />
      <path class="w-gauge-arc" d="M16 100 A${R} ${R} 0 0 1 184 100" fill="none"
            stroke="url(#wg-${el.id || 'g'})" stroke-width="14" stroke-linecap="round"
            stroke-dasharray="${len.toFixed(1)}" stroke-dashoffset="${len.toFixed(1)}" />
    </svg>
    <div class="w-gauge-face">
      <b class="w-gauge-n">0</b>
      ${unit ? `<span class="w-gauge-u">${esc(unit)}</span>` : ''}
    </div>
    </div>
    ${caption ? `<p class="w-gauge-cap">${esc(caption)}</p>` : ''}`

  const arc = el.querySelector('.w-gauge-arc')
  const n = el.querySelector('.w-gauge-n')
  onSeen(el, (instant) => {
    arc.style.transition = instant ? 'none' : 'stroke-dashoffset 1.4s cubic-bezier(.22,.61,.36,1)'
    requestAnimationFrame(() => {
      arc.setAttribute('stroke-dashoffset', (len * (1 - pct)).toFixed(1))
    })
    countUp(n, value, { format: (v) => String(Math.round(v)) })
  })
}

/* ==========================================================
   2 · TICKED GAUGE — the same arc as discrete ticks. Reads as
   a dial rather than a bar, for a secondary indicator.
   ========================================================== */

export function tickedGauge(el, { value, max = 100, unit = '', ticks = 28 }) {
  const lit = Math.round((Math.max(0, Math.min(value, max)) / max) * ticks)
  const marks = Array.from({ length: ticks }, (_, i) => {
    const a = Math.PI - (i / (ticks - 1)) * Math.PI
    const x1 = 100 + Math.cos(a) * 84
    const y1 = 100 - Math.sin(a) * 84
    const x2 = 100 + Math.cos(a) * 72
    const y2 = 100 - Math.sin(a) * 72
    const k = i / (ticks - 1)
    const colour = k < 0.4 ? TONE.teal : k < 0.75 ? TONE.tealSoft : TONE.green
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"
             stroke-width="4" stroke-linecap="round" stroke="${TONE.track}"
             data-on="${i < lit}" data-c="${colour}" data-i="${i}" />`
  }).join('')

  el.classList.add('w-gauge', 'w-gauge-ticked')
  el.innerHTML = `
    <svg viewBox="0 0 200 118" role="img" aria-label="${esc(value)} of ${esc(max)}">${marks}</svg>
    <div class="w-gauge-face">
      <b class="w-gauge-n">0</b>
      ${unit ? `<span class="w-gauge-u">${esc(unit)}</span>` : ''}
    </div>`

  const n = el.querySelector('.w-gauge-n')
  onSeen(el, (instant) => {
    el.querySelectorAll('line[data-on="true"]').forEach((l, i) => {
      const paint = () => l.setAttribute('stroke', l.dataset.c)
      instant ? paint() : setTimeout(paint, i * 45)
    })
    countUp(n, value, { format: (v) => String(Math.round(v)) })
  })
}

/* ==========================================================
   3 · METRIC STRIP — the headline figures in one row.
   ========================================================== */

export function metricStrip(el, items) {
  el.classList.add('w-metrics')
  el.innerHTML = items
    .map(
      (m) => `
      <div class="w-metric${m.tone ? ' w-metric-' + m.tone : ''}">
        <span class="w-metric-k">${esc(m.label)}</span>
        <span class="w-metric-v" data-raw="${m.raw ?? ''}">${esc(m.value)}</span>
        ${m.note ? `<span class="w-metric-n">${esc(m.note)}</span>` : ''}
      </div>`
    )
    .join('')
}

/* ==========================================================
   4 · BREAKDOWN BAR — one stacked bar plus a legend carrying
   each segment's share. For "where this number came from".
   ========================================================== */

export function breakdownBar(el, segments, { showValue = true } = {}) {
  const total = segments.reduce((a, s) => a + Math.max(0, s.value), 0) || 1
  el.classList.add('w-breakdown')
  el.innerHTML = `
    <div class="w-breakdown-bar">
      ${segments
        .map(
          (s) =>
            `<span style="width:${((Math.max(0, s.value) / total) * 100).toFixed(2)}%;background:${s.color}"
                   title="${esc(s.label)}"></span>`
        )
        .join('')}
    </div>
    <ul class="w-breakdown-key">
      ${segments
        .map(
          (s) => `
        <li>
          <i style="background:${s.color}"></i>
          <span>${esc(s.label)}</span>
          ${showValue ? `<em>${esc(s.display ?? money(s.value))}</em>` : ''}
          <b>${Math.round((Math.max(0, s.value) / total) * 100)}%</b>
        </li>`
        )
        .join('')}
    </ul>`

  const spans = el.querySelectorAll('.w-breakdown-bar span')
  onSeen(el, (instant) => {
    spans.forEach((s, i) => {
      if (instant) {
        s.style.transform = 'scaleX(1)'
        return
      }
      s.style.transition = `transform .6s cubic-bezier(.22,.61,.36,1) ${i * 0.14}s`
      requestAnimationFrame(() => (s.style.transform = 'scaleX(1)'))
    })
  })
}

/* ==========================================================
   5 · GOAL PROGRESS — current against target, with an axis.
   ========================================================== */

export function goalProgress(el, { label, current, target, onTrack, fmt = money }) {
  const pct = target > 0 ? Math.max(0, Math.min(1, current / target)) : 0
  el.classList.add('w-goal')
  el.innerHTML = `
    <div class="w-goal-top">
      <span class="w-goal-k">${esc(label)}</span>
      ${
        onTrack
          ? `<span class="w-goal-flag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>On track</span>`
          : ''
      }
    </div>
    <p class="w-goal-v"><b>${esc(fmt(current))}</b><span> / ${esc(fmt(target))}</span></p>
    <div class="w-goal-track"><i></i></div>
    <div class="w-goal-axis"><span>${esc(fmt(0))}</span><span>Halfway</span><span>Target</span></div>`

  const fill = el.querySelector('.w-goal-track i')
  onSeen(el, (instant) => {
    if (!instant) fill.style.transition = 'transform .9s cubic-bezier(.22,.61,.36,1)'
    requestAnimationFrame(() => (fill.style.transform = `scaleX(${pct.toFixed(3)})`))
  })
}

/* ==========================================================
   6 · PROGRESS ROWS — several measures against one scale.
   ========================================================== */

export function progressRows(el, rows) {
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1)
  el.classList.add('w-rows')
  el.innerHTML = rows
    .map(
      (r) => `
      <div class="w-row">
        <div class="w-row-top">
          <span>${esc(r.label)}</span>
          <b style="${r.color ? `color:${r.color}` : ''}">${esc(r.display ?? r.value)}</b>
        </div>
        <div class="w-row-track">
          <i data-s="${(Math.abs(r.value) / max).toFixed(3)}" style="background:${r.color || TONE.teal}"></i>
        </div>
        ${r.note ? `<span class="w-row-note">${esc(r.note)}</span>` : ''}
      </div>`
    )
    .join('')

  const fills = el.querySelectorAll('.w-row-track i')
  onSeen(el, (instant) => {
    fills.forEach((f, i) => {
      if (!instant) f.style.transition = `transform .7s cubic-bezier(.22,.61,.36,1) ${i * 0.08}s`
      requestAnimationFrame(() => (f.style.transform = `scaleX(${f.dataset.s})`))
    })
  })
}

/* ==========================================================
   7 · COMPARISON — two figures either side of a rule.
   ========================================================== */

export function comparison(el, { a, b, aLabel, bLabel, note }) {
  el.classList.add('w-compare')
  el.innerHTML = `
    <div class="w-compare-row">
      <div class="w-compare-side">
        <span class="w-compare-k">${esc(aLabel)}</span>
        <b class="w-compare-v">${esc(a)}</b>
      </div>
      <div class="w-compare-rule"><span>vs</span></div>
      <div class="w-compare-side w-compare-right">
        <span class="w-compare-k">${esc(bLabel)}</span>
        <b class="w-compare-v w-compare-muted">${esc(b)}</b>
      </div>
    </div>
    ${note ? `<p class="w-compare-note">${note}</p>` : ''}`
}

/* ==========================================================
   8 · DONUT — a ring with a centre label and a legend.
   ========================================================== */

export function donut(el, segments, { label = '', value = '', size = 148, thickness = 20 } = {}) {
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0) || 1
  let offset = 0
  const rings = segments
    .map((s) => {
      const len = (Math.max(0, s.value) / total) * c
      const node = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${s.color}"
        stroke-width="${thickness}" stroke-dasharray="0 ${c.toFixed(1)}"
        data-len="${len.toFixed(1)}" data-gap="${(c - len).toFixed(1)}"
        stroke-dashoffset="${(-offset).toFixed(1)}" />`
      offset += len
      return node
    })
    .join('')

  el.classList.add('w-donut-wrap')
  el.innerHTML = `
    <div class="w-donut" style="width:${size}px;height:${size}px">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
        <g transform="rotate(-90 ${size / 2} ${size / 2})">
          <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${TONE.track}" stroke-width="${thickness}" />
          ${rings}
        </g>
      </svg>
      <div class="w-donut-face">
        ${label ? `<span>${esc(label)}</span>` : ''}
        ${value ? `<b>${esc(value)}</b>` : ''}
      </div>
    </div>
    <ul class="w-donut-key">
      ${segments
        .map(
          (s) =>
            `<li><i style="background:${s.color}"></i><span>${esc(s.label)}</span><b>${esc(
              s.display ?? money(s.value)
            )}</b></li>`
        )
        .join('')}
    </ul>`

  const arcs = el.querySelectorAll('circle[data-len]')
  onSeen(el, (instant) => {
    arcs.forEach((a, i) => {
      const paint = () => a.setAttribute('stroke-dasharray', `${a.dataset.len} ${a.dataset.gap}`)
      if (instant) return paint()
      a.style.transition = `stroke-dasharray .8s cubic-bezier(.22,.61,.36,1) ${i * 0.16}s`
      requestAnimationFrame(paint)
    })
  })
}

/* ==========================================================
   9 · STEPPER — the walk-through's spine.
   ========================================================== */

export function stepper(el, steps, current) {
  el.classList.add('w-stepper')
  el.innerHTML = steps
    .map((s, i) => {
      const state = i < current ? 'done' : i === current ? 'now' : 'next'
      const mark =
        state === 'done'
          ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`
          : String(i + 1)
      return `
        <li class="w-step w-step-${state}" ${state === 'now' ? 'aria-current="step"' : ''}>
          <span class="w-step-mark">${mark}</span>
          <span class="w-step-label">${esc(s)}</span>
        </li>`
    })
    .join('')
}

/* ==========================================================
   10 · PROJECTION CHART — a line against a target, with the
   shortfall shaded. The one chart that carries the argument.
   ========================================================== */

export function projection(el, { series, target, xFrom, xTo, targetLabel = 'Target', meetsAt = null }) {
  const W = 680
  const H = 260
  const pad = { t: 22, r: 16, b: 30, l: 16 }
  const n = series.length - 1 || 1
  const yMax = Math.max(target, ...series) * 1.1 || 1
  const x = (i) => pad.l + (i / n) * (W - pad.l - pad.r)
  const y = (v) => H - pad.b - (v / yMax) * (H - pad.t - pad.b)

  const line = series.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${x(n).toFixed(1)},${(H - pad.b).toFixed(1)} L${x(0).toFixed(1)},${(H - pad.b).toFixed(1)} Z`
  const tY = y(target).toFixed(1)
  const endY = y(series[n]).toFixed(1)

  el.classList.add('w-chart')
  el.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" role="img"
         aria-label="Projected accessible capital from age ${xFrom} to ${xTo}, against a target of ${money(target)}">
      <defs>
        <linearGradient id="wc-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${TONE.teal}" stop-opacity="0.18" />
          <stop offset="100%" stop-color="${TONE.teal}" stop-opacity="0.015" />
        </linearGradient>
      </defs>

      <!-- the distance still to cover -->
      ${
        series[n] < target
          ? `<rect x="${(x(n) - 54).toFixed(1)}" y="${tY}" width="54" height="${(y(series[n]) - y(target)).toFixed(
              1
            )}" fill="${TONE.ember}" opacity="0.07" />`
          : ''
      }

      <line x1="${pad.l}" y1="${H - pad.b}" x2="${W - pad.r}" y2="${H - pad.b}" stroke="${TONE.track}" stroke-width="1" />
      <line x1="${pad.l}" y1="${tY}" x2="${W - pad.r}" y2="${tY}" stroke="${TONE.ember}" stroke-width="1.6" stroke-dasharray="5 5" />

      <path d="${area}" fill="url(#wc-fill)" />
      <path class="w-chart-line" d="${line}" fill="none" stroke="${TONE.teal}" stroke-width="2.6"
            stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="${x(n).toFixed(1)}" cy="${endY}" r="5.5" fill="#fff" stroke="${TONE.teal}" stroke-width="2.8" />

      ${
        meetsAt !== null && meetsAt <= n
          ? `<line x1="${x(meetsAt).toFixed(1)}" y1="${pad.t}" x2="${x(meetsAt).toFixed(1)}" y2="${H - pad.b}"
               stroke="${TONE.green}" stroke-width="1.4" stroke-dasharray="3 4" />`
          : ''
      }

      <text x="${pad.l}" y="${H - 9}" class="w-chart-ax">Age ${xFrom}</text>
      <text x="${W - pad.r}" y="${H - 9}" text-anchor="end" class="w-chart-ax">Age ${xTo}</text>
      <text x="${W - pad.r}" y="${Math.max(Number(tY) - 9, 14).toFixed(1)}" text-anchor="end" class="w-chart-target">
        ${esc(targetLabel)} ${moneyShort(target)}
      </text>
      <text x="${(x(n) - 10).toFixed(1)}" y="${Math.max(Number(endY) - 13, 28).toFixed(1)}" text-anchor="end" class="w-chart-end">
        ${moneyShort(series[n])}
      </text>
    </svg>`

  const path = el.querySelector('.w-chart-line')
  onSeen(el, (instant) => {
    if (instant || !path.getTotalLength) return
    const L = path.getTotalLength()
    path.style.strokeDasharray = `${L}`
    path.style.strokeDashoffset = `${L}`
    requestAnimationFrame(() => {
      path.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(.22,.61,.36,1)'
      path.style.strokeDashoffset = '0'
    })
  })
}
