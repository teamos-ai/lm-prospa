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

/* One observer for every widget on the page.
   `seen` records which elements have already been revealed; `pending` records
   the ones still waiting. Both matter — see onSeen and the beforeprint hook. */
const seen = new WeakSet()
const pending = new Set()

function reveal(el, instant) {
  pending.delete(el)
  seen.add(el)
  io?.unobserve(el)
  el.__playFn?.(instant)
}

const io =
  typeof IntersectionObserver === 'undefined'
    ? null
    : new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting || seen.has(e.target)) return
            reveal(e.target, false)
          })
        },
        { threshold: 0.35 }
      )

/**
 * Run `play` when the element is first seen — or straight away if it cannot be
 * observed, or if it has been seen already.
 *
 * That last clause is the important one. A widget redrawn with new data calls
 * onSeen again on the same element, but the observer's `seen` set made the
 * callback early-return, so the redraw never ran and the widget sat empty at
 * scaleX(0) or stroke-dasharray="0 C". Every magnet that re-renders on input
 * had to carry its own workaround for it. A second call means the element is
 * already on screen with new numbers on it, so there is nothing to wait for:
 * play it immediately, and without the animation nobody wants on every
 * keystroke of a slider.
 */
function onSeen(el, play) {
  el.__playFn = play
  if (reduced() || !io || seen.has(el)) return reveal(el, true)
  pending.add(el)
  io.observe(el)
  // Already in view on load: the observer fires on the next frame anyway.
}

/* A sheet printed before a widget scrolled into view would print it blank —
   the donut has no CSS print fallback, because its arcs carry their length in
   a data attribute that CSS cannot read. Reveal everything still pending
   before the browser takes its print snapshot. */
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('beforeprint', () => {
    Array.from(pending).forEach((el) => reveal(el, true))
  })
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

/**
 * Two figures set against each other.
 *
 * `a`, `b`, `aLabel` and `bLabel` are data and are escaped. `note` is NOT:
 * it is author-supplied rich text and callers pass markup through it to
 * emphasise the number that matters (magnet 04 does). Nothing user-typed ever
 * reaches it — the sheets take numbers, never free text — so keep it that way:
 * if a caller ever needs to put a reader's own words here, escape at the call.
 */
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

/* ==========================================================
   11 · LIFE PATH — the whole plan in one picture.

   Accumulation rises to the work-optional age, the bridge
   draws it down, superannuation steps in at the access age,
   and the combined pool runs out somewhere. The step at the
   access age is the point of the chart: it is the moment the
   plan hands over.
   ========================================================== */

export function lifePath(el, {
  accum,              // [{age, balance}] — building
  bridge,             // [{age, balance}] — drawing down before super
  post,               // [{age, balance}] — drawing down after super
  workOptionalAge,
  superAccessAge,
  lifeExpectancy,
  superAtAccess,      // the step up at the access age
  exhaustedAtAge,     // null, or the age the bridge empties
  lastsTo,            // null, or the age the combined pool empties
}) {
  const W = 760
  const H = 320
  const pad = { t: 26, r: 18, b: 46, l: 18 }

  const all = [...accum, ...bridge, ...post]
  if (!all.length) return
  const a0 = accum[0].age
  const a1 = all[all.length - 1].age
  const yMax = Math.max(...all.map((p) => p.balance), superAtAccess || 0) * 1.12 || 1

  const x = (age) => pad.l + ((age - a0) / Math.max(a1 - a0, 1)) * (W - pad.l - pad.r)
  const y = (v) => H - pad.b - (Math.max(0, v) / yMax) * (H - pad.t - pad.b)
  const base = H - pad.b

  const path = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.age).toFixed(1)},${y(p.balance).toFixed(1)}`).join(' ')
  const area = (pts) =>
    pts.length
      ? `${path(pts)} L${x(pts[pts.length - 1].age).toFixed(1)},${base} L${x(pts[0].age).toFixed(1)},${base} Z`
      : ''

  // The three segments join end-to-end, and the join at the access age is a visible step.
  const accumPts = accum
  const bridgePts = [{ age: workOptionalAge, balance: accum[accum.length - 1].balance }, ...bridge]
  const postPts = post.length ? [{ age: superAccessAge, balance: post[0].balance }, ...post] : []

  const emptyEarly = exhaustedAtAge !== null
  // TONE.teal here would match 'Building' exactly, so the legend's two swatches
  // became indistinguishable in the case where the plan actually works.
  const bridgeColour = emptyEarly ? TONE.ember : TONE.tealSoft

  // The step: non-super remaining, then the same instant with super added.
  const remaining = bridge.length ? bridge[bridge.length - 1].balance : accum[accum.length - 1].balance
  const stepFrom = y(remaining)
  const stepTo = y(remaining + (superAtAccess || 0))

  const tick = (age, label, tone) => `
    <line x1="${x(age).toFixed(1)}" y1="${pad.t - 6}" x2="${x(age).toFixed(1)}" y2="${base}"
          stroke="${tone}" stroke-width="1.2" stroke-dasharray="3 4" opacity="0.75" />
    <text x="${x(age).toFixed(1)}" y="${H - 26}" text-anchor="middle" class="w-lp-tick">${age}</text>
    <text x="${x(age).toFixed(1)}" y="${H - 12}" text-anchor="middle" class="w-lp-ticklabel">${esc(label)}</text>`

  el.classList.add('w-lifepath')
  el.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" role="img"
         aria-label="Accessible capital from age ${a0}: building to ${workOptionalAge}, drawn down to ${superAccessAge}, then combined with superannuation${lastsTo ? ` until about age ${lastsTo}` : ''}">
      <defs>
        <linearGradient id="lp-build" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${TONE.teal}" stop-opacity="0.2" />
          <stop offset="100%" stop-color="${TONE.teal}" stop-opacity="0.015" />
        </linearGradient>
        <linearGradient id="lp-bridge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${bridgeColour}" stop-opacity="0.2" />
          <stop offset="100%" stop-color="${bridgeColour}" stop-opacity="0.015" />
        </linearGradient>
        <linearGradient id="lp-post" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${TONE.green}" stop-opacity="0.22" />
          <stop offset="100%" stop-color="${TONE.green}" stop-opacity="0.015" />
        </linearGradient>
      </defs>

      <line x1="${pad.l}" y1="${base}" x2="${W - pad.r}" y2="${base}" stroke="${TONE.track}" stroke-width="1" />

      ${tick(workOptionalAge, 'work optional', TONE.tealSoft)}
      ${tick(superAccessAge, 'super unlocks', TONE.green)}
      ${lifeExpectancy > superAccessAge && lifeExpectancy <= a1 ? tick(lifeExpectancy, 'plan to', TONE.track) : ''}

      <path d="${area(accumPts)}" fill="url(#lp-build)" />
      <path d="${area(bridgePts)}" fill="url(#lp-bridge)" />
      ${postPts.length ? `<path d="${area(postPts)}" fill="url(#lp-post)" />` : ''}

      <path class="w-lp-line" d="${path(accumPts)}" fill="none" stroke="${TONE.teal}" stroke-width="2.6"
            stroke-linecap="round" stroke-linejoin="round" />
      <path class="w-lp-line" d="${path(bridgePts)}" fill="none" stroke="${bridgeColour}" stroke-width="2.6"
            stroke-linecap="round" stroke-linejoin="round" />
      ${
        postPts.length
          ? `<line x1="${x(superAccessAge).toFixed(1)}" y1="${stepFrom.toFixed(1)}"
                   x2="${x(superAccessAge).toFixed(1)}" y2="${stepTo.toFixed(1)}"
                   stroke="${TONE.green}" stroke-width="2.6" stroke-linecap="round" />
             <path class="w-lp-line" d="${path(postPts)}" fill="none" stroke="${TONE.green}" stroke-width="2.6"
                   stroke-linecap="round" stroke-linejoin="round" />`
          : ''
      }

      <circle cx="${x(workOptionalAge).toFixed(1)}" cy="${y(accum[accum.length - 1].balance).toFixed(1)}" r="5"
              fill="#fff" stroke="${TONE.teal}" stroke-width="2.6" />
      ${
        superAtAccess > 0
          ? `<circle cx="${x(superAccessAge).toFixed(1)}" cy="${stepTo.toFixed(1)}" r="5"
                     fill="#fff" stroke="${TONE.green}" stroke-width="2.6" />`
          : ''
      }
      ${
        emptyEarly
          ? `<circle cx="${x(exhaustedAtAge).toFixed(1)}" cy="${base}" r="5.5" fill="${TONE.ember}" />
             <text x="${x(exhaustedAtAge).toFixed(1)}" y="${base - 14}" text-anchor="middle" class="w-lp-warn">
               empty at ${exhaustedAtAge}
             </text>`
          : ''
      }

      <text x="${pad.l}" y="${pad.t - 10}" class="w-lp-key">Accessible capital, today's dollars</text>
    </svg>
    <ul class="w-lp-legend">
      <li><i style="background:${TONE.teal}"></i>Building</li>
      <li><i style="background:${bridgeColour}"></i>${emptyEarly ? 'Drawing down — runs out' : 'Drawing down before super'}</li>
      ${superAtAccess > 0 ? `<li><i style="background:${TONE.green}"></i>Super takes over</li>` : ''}
    </ul>`

  const lines = el.querySelectorAll('.w-lp-line')
  onSeen(el, (instant) => {
    if (instant) return
    lines.forEach((p, i) => {
      if (!p.getTotalLength) return
      const L = p.getTotalLength()
      p.style.strokeDasharray = `${L}`
      p.style.strokeDashoffset = `${L}`
      requestAnimationFrame(() => {
        p.style.transition = `stroke-dashoffset 1.1s cubic-bezier(.22,.61,.36,1) ${i * 0.5}s`
        p.style.strokeDashoffset = '0'
      })
    })
  })
}
