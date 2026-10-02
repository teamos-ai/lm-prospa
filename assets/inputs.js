/* ============================================================
   DATA ENTRY — the reusable input layer.

   Every session tool that asks for a number should use this. Before it existed,
   both calculators were driven entirely by `<input type="range">`, which has
   three defects that matter for a lead magnet aimed at people with real money:

     1. You cannot type. A slider is a browsing control, not a data-entry one.
        Nobody can enter $437,000 with a 25,000 step.
     2. It clamps in silence. Set 10,000,000 on a max=3,000,000 slider and the
        DOM keeps 3,000,000 with no signal — the tool then confidently reports a
        number computed from the wrong capital.
     3. An invalid value silently becomes the midpoint. `el.value = 'abc'` on a
        0–3,000,000 range leaves 1,500,000, which looks like a real answer.

   The contract here inverts the relationship: THE TYPED FIELD IS AUTHORITATIVE
   and the slider is a coarse assist. A figure above the slider's range is kept,
   not clamped, and the field says so. Nothing is ever silently changed.

   Exports
     parseAmount(text, kind)      lenient text -> number, or null
     formatAmount(value, kind)    number -> display text
     numberField(spec)            HTML for a typeable field + slider + steppers
     switchField(spec)            HTML for a real boolean, not a 0/1 slider
     mountInputs(root, opts)      wires every field inside `root`

   All of it is framework-free, dependency-free and printable.
   ============================================================ */

/* ---------- parsing ------------------------------------------------ */

const SUFFIX = { k: 1e3, m: 1e6, b: 1e9 }

/**
 * Turn what a person actually types into a number.
 *
 * Accepts: "437000" · "$437,000" · "437 000" · "437k" · "1.2m" · "6%" · " 58 "
 * Returns null for anything it cannot read, so the caller can keep the last
 * good value rather than guess. Never throws, never returns NaN or Infinity.
 */
export function parseAmount(text, kind = 'money') {
  if (typeof text === 'number') return Number.isFinite(text) ? text : null
  if (text == null) return null

  let s = String(text).trim().toLowerCase()
  if (!s) return null

  // strip currency, percent, thousands separators and spaces
  s = s.replace(/[$£€,\s]/g, '').replace(/%$/, '')

  // a trailing magnitude suffix, e.g. 437k or 1.2m
  let mult = 1
  const last = s.slice(-1)
  if (SUFFIX[last]) { mult = SUFFIX[last]; s = s.slice(0, -1) }

  if (!s || s === '-' || s === '.' || s === '-.') return null
  // one optional sign, digits, one optional decimal point — nothing else
  if (!/^-?\d*\.?\d*$/.test(s)) return null

  const n = Number(s) * mult
  if (!Number.isFinite(n)) return null
  return kind === 'age' ? Math.round(n) : n
}

/* ---------- formatting --------------------------------------------- */

const AUD = new Intl.NumberFormat('en-AU', {
  style: 'currency', currency: 'AUD', maximumFractionDigits: 0,
})

export function formatAmount(value, kind = 'money') {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  if (kind === 'age') return String(Math.round(n))
  if (kind === 'pct') return `${Number(n.toFixed(2))}%`
  return AUD.format(Math.round(n))
}

/** What a field shows — grouped, because $10000000 is unreadable. parseAmount
    strips the separators again on the way back in, so it stays editable. */
function restingValue(value, kind) {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  if (kind === 'pct') return String(Number(n.toFixed(2)))
  if (kind === 'age') return String(Math.round(n))
  return Math.round(n).toLocaleString('en-AU')
}

/* ---------- markup -------------------------------------------------- */

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

/**
 * A number the user can type, nudge or drag.
 *
 * spec: { key, label, value, min, max, step, kind, hint, prefix, suffix,
 *         hardMax }  hardMax caps what may be typed (default: 1000x max).
 */
export function numberField(spec) {
  const {
    key, label, value, min = 0, max = 100, step = 1,
    kind = 'money', hint = '', prefix = kind === 'money' ? '$' : '',
    suffix = kind === 'pct' ? '%' : '',
  } = spec
  const id = `nf-${key}`
  return `<div class="nf" data-nf="${esc(key)}"
      data-kind="${kind}" data-min="${min}" data-max="${max}" data-step="${step}"
      ${spec.hardMax != null ? `data-hard-max="${spec.hardMax}"` : ''}>
    <label class="nf-label" for="${id}">${label}</label>
    <div class="nf-row">
      <button type="button" class="nf-step" data-nf-step="-1"
              aria-label="Decrease ${esc(label)}" tabindex="-1">&minus;</button>
      <span class="nf-box">
        ${prefix ? `<span class="nf-affix" aria-hidden="true">${prefix}</span>` : ''}
        <input class="nf-input" id="${id}" type="text" inputmode="decimal"
               enterkeyhint="done" autocomplete="off" spellcheck="false"
               value="${esc(restingValue(value, kind))}"
               aria-describedby="${id}-note${hint ? ` ${id}-hint` : ''}">
        ${suffix ? `<span class="nf-affix nf-affix-end" aria-hidden="true">${suffix}</span>` : ''}
      </span>
      <button type="button" class="nf-step" data-nf-step="1"
              aria-label="Increase ${esc(label)}" tabindex="-1">+</button>
    </div>
    <input class="nf-range" type="range" data-nf-range
           min="${min}" max="${max}" step="${step}" value="${clamp(value, min, max)}"
           aria-label="${esc(label)} — slider"
           aria-valuetext="${esc(formatAmount(value, kind))}">
    <p class="nf-note" id="${id}-note" role="status" aria-live="polite"></p>
    ${hint ? `<p class="nf-hint" id="${id}-hint">${hint}</p>` : ''}
  </div>`
}

/** A real yes/no. Replaces the 0/1 range slider, which no one recognises as a toggle. */
export function switchField({ key, label, value, hint = '', onLabel = 'Yes', offLabel = 'No' }) {
  const id = `sw-${key}`
  return `<div class="nf nf-switch" data-sw="${esc(key)}">
    <label class="nf-label" for="${id}">${label}</label>
    <button type="button" class="sw" id="${id}" role="switch"
            aria-checked="${value ? 'true' : 'false'}"
            ${hint ? `aria-describedby="${id}-hint"` : ''}>
      <span class="sw-track"><span class="sw-thumb"></span></span>
      <span class="sw-text">${value ? onLabel : offLabel}</span>
    </button>
    ${hint ? `<p class="nf-hint" id="${id}-hint">${hint}</p>` : ''}
  </div>`
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Number(v) || 0))

/* ---------- behaviour ----------------------------------------------- */

/**
 * Wire every field inside `root`.
 *
 * opts.get(key)        -> current value
 * opts.set(key, value) -> commit a value (called only when it actually changes)
 * opts.labels          -> { on, off } for switches
 *
 * Returns { sync() } so a caller that changes state elsewhere — a scenario
 * button, a reset — can push the new values back into the fields.
 */
export function mountInputs(root, { get, set, onCommit = () => {} } = {}) {
  const fields = () => Array.from(root.querySelectorAll('[data-nf]'))

  const meta = (el) => ({
    key: el.dataset.nf,
    kind: el.dataset.kind || 'money',
    min: Number(el.dataset.min),
    max: Number(el.dataset.max),
    step: Number(el.dataset.step) || 1,
    // Money can legitimately exceed the slider — someone really may hold $10m.
    // An age or a percentage cannot: the range is the whole domain, so the
    // ceiling is the max itself and 999 is rejected rather than accepted.
    hardMax: el.dataset.hardMax != null ? Number(el.dataset.hardMax)
      : (el.dataset.kind === 'money' ? Number(el.dataset.max) * 1000
        : Number(el.dataset.max)),
  })

  const note = (el, msg) => {
    const n = el.querySelector('.nf-note')
    if (!n) return
    n.textContent = msg || ''
    el.classList.toggle('nf-flagged', !!msg)
  }

  /** Push `value` into the field's three surfaces without re-entering commit. */
  const paint = (el, value, { editing = false } = {}) => {
    const m = meta(el)
    const input = el.querySelector('.nf-input')
    const range = el.querySelector('.nf-range')
    if (input && !editing) input.value = restingValue(value, m.kind)
    if (range) {
      range.value = String(clamp(value, m.min, m.max))
      range.setAttribute('aria-valuetext', formatAmount(value, m.kind))
      // the slider is only a coarse assist; say so when it can no longer track
      range.classList.toggle('nf-range-pinned', value > m.max || value < m.min)
    }
  }

  /**
   * The one place a value is accepted. Clamping is visible, never silent, and a
   * figure above the slider's range is kept rather than thrown away.
   */
  const commit = (el, raw, { editing = false } = {}) => {
    const m = meta(el)
    const prev = Number(get(m.key))
    const parsed = parseAmount(raw, m.kind)

    if (parsed === null) {
      paint(el, prev)
      note(el, `That is not a number we can read — kept ${formatAmount(prev, m.kind)}.`)
      return prev
    }

    let v = parsed
    let msg = ''
    if (v < m.min) {
      v = m.min
      msg = `Below the minimum — using ${formatAmount(m.min, m.kind)}.`
    } else if (v > m.hardMax) {
      v = m.hardMax
      msg = `That is higher than this tool models — using ${formatAmount(m.hardMax, m.kind)}.`
    } else if (v > m.max) {
      // deliberately NOT clamped: the typed figure wins, the slider cannot follow
      msg = `Above the slider's range. Using ${formatAmount(v, m.kind)} — drag still works up to ${formatAmount(m.max, m.kind)}.`
    }

    paint(el, v, { editing })
    // set() can round-trip through the host's own sync(), which clears notes —
    // so the note is written after, or the clamp message never reaches the user.
    if (v !== prev) { set(m.key, v); onCommit(m.key, v) }
    note(el, msg)
    return v
  }

  /* typing — commit on blur and on Enter, never on each keystroke, so a
     half-typed "4" in "437000" is not read as four dollars */
  /* Typing commits on a short debounce so the live preview follows along, but the
     box is not reformatted mid-word — nobody wants "4" turning into "$4" while
     they are still typing "437000". Blur and Enter commit immediately. */
  let typeTimer = null
  root.addEventListener('input', (e) => {
    const range = e.target.closest('.nf-range')
    if (range) {
      const el = range.closest('[data-nf]')
      commit(el, range.value)
      return
    }
    const input = e.target.closest('.nf-input')
    if (!input) return
    const el = input.closest('[data-nf]')
    note(el, '')                                        // clear a stale warning
    clearTimeout(typeTimer)
    typeTimer = setTimeout(() => {
      if (parseAmount(input.value, meta(el).kind) !== null) {
        commit(el, input.value, { editing: true })      // editing: do not retype the box
      }
    }, 280)
  })

  root.addEventListener('change', (e) => {
    const input = e.target.closest('.nf-input')
    if (input) commit(input.closest('[data-nf]'), input.value)
  })

  root.addEventListener('blur', (e) => {
    const input = e.target.closest?.('.nf-input')
    if (input) commit(input.closest('[data-nf]'), input.value)
  }, true)

  root.addEventListener('keydown', (e) => {
    const input = e.target.closest?.('.nf-input')
    if (!input) return
    const el = input.closest('[data-nf]')
    const m = meta(el)
    if (e.key === 'Enter') { e.preventDefault(); commit(el, input.value); input.select() }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const dir = e.key === 'ArrowUp' ? 1 : -1
      const mult = e.shiftKey ? 10 : 1
      commit(el, (Number(get(m.key)) || 0) + dir * m.step * mult)
    }
  })

  root.addEventListener('click', (e) => {
    const step = e.target.closest('[data-nf-step]')
    if (step) {
      const el = step.closest('[data-nf]')
      const m = meta(el)
      commit(el, (Number(get(m.key)) || 0) + Number(step.dataset.nfStep) * m.step)
      el.querySelector('.nf-input')?.focus()
      return
    }
    const sw = e.target.closest('[role=switch]')
    if (sw) {
      const el = sw.closest('[data-sw]')
      const key = el.dataset.sw
      const next = sw.getAttribute('aria-checked') !== 'true'
      sw.setAttribute('aria-checked', String(next))
      const t = sw.querySelector('.sw-text')
      if (t) t.textContent = next ? 'Yes' : 'No'
      set(key, next ? 1 : 0)
      onCommit(key, next ? 1 : 0)
    }
  })

  /* a focused field selects itself, so typing replaces rather than appends */
  /* Select on focus so typing replaces. The value itself is never rewritten
     here: doing so fights the caret and breaks select-all-then-type. */
  root.addEventListener('focusin', (e) => {
    const input = e.target.closest?.('.nf-input')
    if (input) requestAnimationFrame(() => input.select())
  })

  const sync = () => {
    fields().forEach((el) => { paint(el, Number(get(el.dataset.nf))); note(el, '') })
    root.querySelectorAll('[data-sw]').forEach((el) => {
      const sw = el.querySelector('[role=switch]')
      const on = !!Number(get(el.dataset.sw))
      sw.setAttribute('aria-checked', String(on))
      const t = sw.querySelector('.sw-text')
      if (t) t.textContent = on ? 'Yes' : 'No'
    })
  }

  sync()
  return { sync }
}

/* ---------- radiogroup keyboard support ------------------------------ */

/**
 * Arrow-key navigation for a set of single-select buttons.
 *
 * A `role="radiogroup"` is expected to behave like one: arrows move AND select,
 * Home/End jump to the ends, and exactly one member is in the tab order. Without
 * this a keyboard user has to tab through every option of every question — 18
 * questions times five options is 90 stops.
 */
export function mountRadioGroups(root, { onSelect } = {}) {
  const members = (g) => Array.from(g.querySelectorAll('[role=radio]'))

  const focusAt = (g, i) => {
    const m = members(g)
    if (!m.length) return
    const next = m[(i + m.length) % m.length]
    m.forEach((o) => (o.tabIndex = -1))
    next.tabIndex = 0
    next.focus()
    next.click()                       // arrow keys select, per the radio pattern
  }

  root.addEventListener('keydown', (e) => {
    const btn = e.target.closest?.('[role=radio]')
    if (!btn) return
    const g = btn.closest('[role=radiogroup]')
    if (!g) return
    const m = members(g)
    const i = m.indexOf(btn)
    const key = e.key
    if (key === 'ArrowDown' || key === 'ArrowRight') { e.preventDefault(); focusAt(g, i + 1) }
    else if (key === 'ArrowUp' || key === 'ArrowLeft') { e.preventDefault(); focusAt(g, i - 1) }
    else if (key === 'Home') { e.preventDefault(); focusAt(g, 0) }
    else if (key === 'End') { e.preventDefault(); focusAt(g, m.length - 1) }
    else return
    onSelect?.(g)
  })

  /* Each group needs exactly one tab stop, or the group is unreachable. */
  const seed = () => root.querySelectorAll('[role=radiogroup]').forEach((g) => {
    const m = members(g)
    if (!m.length) return
    if (!m.some((o) => o.tabIndex === 0)) {
      const checked = m.find((o) => o.getAttribute('aria-checked') === 'true')
      ;(checked || m[0]).tabIndex = 0
    }
  })
  seed()
  return { seed }
}
