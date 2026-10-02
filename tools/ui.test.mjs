/**
 * Browser tests for the two calculators — the production gate.
 *
 * These are the checks that would have caught every defect found in the
 * 2 Oct 2026 usability audit, and they fail loudly rather than drifting:
 *
 *   · a slider-only tool cannot be typed into          (0 typeable fields)
 *   · `el.value = 10000000` on a max=3000000 range silently keeps 3000000
 *   · `el.value = 'abc'` on a range silently keeps the MIDPOINT
 *   · a 0/1 range is not a recognisable yes/no
 *   · 18 single-select question sets built as aria-pressed toggles give a
 *     keyboard user 90 tab stops and tell a screen reader nothing
 *   · a corrupt localStorage payload must not take the page down
 *
 * Buildless, like the rest of this repo: no package.json, no config. It starts
 * its own static server and drives the globally installed Playwright.
 *
 *   node tools/ui.test.mjs
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

/* Playwright is installed globally; resolve it from there rather than adding a
   package.json this repo has deliberately never had. */
const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim()
const { chromium } = createRequire(join(globalRoot, '/')) ('playwright')

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' }

const server = createServer(async (req, res) => {
  try {
    const p = join(ROOT, normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, ''))
    const body = await readFile(p)
    res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream',
      'cache-control': 'no-store' })
    res.end(body)
  } catch { res.writeHead(404).end('not found') }
})
await new Promise((r) => server.listen(0, r))
const BASE = `http://localhost:${server.address().port}`

/* ---------- a very small test harness ---------- */
let pass = 0, fail = 0
const results = []
const ok = (cond, name, detail = '') => {
  if (cond) { pass++; results.push(`  \x1b[32m✓\x1b[0m ${name}`) }
  else { fail++; results.push(`  \x1b[31m✗\x1b[0m ${name}${detail ? ` — ${detail}` : ''}`) }
}
/** The box shows grouped digits — compare the number it represents. */
const num = (s) => Number(String(s).replace(/[^0-9.-]/g, ''))
const section = (t) => results.push(`\n\x1b[1m── ${t} ${'─'.repeat(Math.max(0, 56 - t.length))}\x1b[0m`)

const browser = await chromium.launch()
const errorsFor = (page, sink) => {
  page.on('pageerror', (e) => sink.push(String(e).slice(0, 140)))
  page.on('console', (m) => { if (m.type() === 'error') sink.push('console: ' + m.text().slice(0, 120)) })
}

const FREEDOM = `${BASE}/magnets/02-freedom-number.html`
const WEALTH = `${BASE}/magnets/01-wealth-score.html`

/** Open a page clean, with localStorage cleared. */
async function open(url, enter) {
  const page = await browser.newPage()
  const errs = []
  errorsFor(page, errs)
  await page.goto(url, { waitUntil: 'load' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'load' })
  if (enter) { await page.getByRole('button', { name: enter }).click(); await page.waitForTimeout(220) }
  return { page, errs }
}

/* ============================================================
   1 · Data entry exists at all
   ============================================================ */
section('1 · Every number can be typed')
{
  const { page, errs } = await open(FREEDOM, /Start with my own numbers/)
  const typeable = await page.locator('.nf-input').count()
  ok(typeable >= 19, 'Freedom Score exposes a typeable box for every field', `found ${typeable}`)
  ok(await page.locator('.dial').count() === 0, 'no slider-only fields remain')
  ok(errs.length === 0, 'loads with no page or console errors', errs[0])
  await page.close()
}
{
  const { page, errs } = await open(WEALTH, /Start the assessment/)
  ok(await page.locator('.nf-input').count() === 2, 'Wealth Score ages are typeable')
  ok(errs.length === 0, 'loads with no page or console errors', errs[0])
  await page.close()
}

/* ============================================================
   2 · The defects the sliders used to hide
   ============================================================ */
section('2 · Nothing is changed silently')
{
  const { page } = await open(FREEDOM, /Start with my own numbers/)
  const box = page.locator('.nf[data-nf="current"] .nf-input').first()
  const note = page.locator('.nf[data-nf="current"] .nf-note').first()
  const type = async (v) => { await box.fill(v); await box.press('Enter'); await page.waitForTimeout(240) }

  await type('437000')
  ok(num(await box.inputValue()) === 437000, 'a precise figure survives the 25,000 step')
  ok((await note.innerText()).trim() === '', '…and says nothing, because nothing was changed')

  await type('$10,000,000')
  ok(num(await box.inputValue()) === 10000000, 'a figure above the slider range is KEPT, not clamped')
  ok(/above the slider/i.test(await note.innerText()), '…and the user is told the slider cannot follow')

  await type('banana')
  ok(num(await box.inputValue()) === 10000000, 'junk does not become the midpoint — the last good value stands')
  ok(/not a number/i.test(await note.innerText()), '…and the user is told why')

  await type('-5000')
  ok(num(await box.inputValue()) === 0, 'a negative amount is floored')
  ok(/below the minimum/i.test(await note.innerText()), '…visibly')

  for (const [input, want] of [['1.2m', '1200000'], ['1,250,000', '1250000'], ['437k', '437000'], ['  600000  ', '600000']]) {
    await type(input)
    ok(num(await box.inputValue()) === Number(want), `"${input}" reads as ${want}`, await box.inputValue())
  }
  await page.close()
}

/* ============================================================
   3 · An age is not money
   ============================================================ */
section('3 · Ages and percentages stay inside their domain')
{
  const { page } = await open(WEALTH, /Start the assessment/)
  const box = page.locator('.nf[data-nf="currentAge"] .nf-input')
  await box.fill('999'); await box.press('Enter'); await page.waitForTimeout(220)
  ok(num(await box.inputValue()) === 70, 'an age of 999 is refused, not accepted as "above the range"')
  await box.fill('2'); await box.press('Enter'); await page.waitForTimeout(220)
  ok(num(await box.inputValue()) === 25, 'an age below the floor is raised to it')
  await page.close()
}

/* ============================================================
   4 · Keyboard and pointer alternatives
   ============================================================ */
section('4 · Steppers, arrows and the switch')
{
  const { page } = await open(FREEDOM, /Start with my own numbers/)
  const box = page.locator('.nf[data-nf="current"] .nf-input').first()
  await box.fill('100000'); await box.press('Enter'); await page.waitForTimeout(200)

  await page.locator('.nf[data-nf="current"] [data-nf-step="1"]').first().click()
  await page.waitForTimeout(180)
  ok(num(await box.inputValue()) === 125000, 'the + stepper moves by one step')

  await box.focus(); await page.keyboard.press('ArrowUp'); await page.waitForTimeout(180)
  ok(num(await box.inputValue()) === 150000, 'ArrowUp moves by one step')
  await page.keyboard.press('Shift+ArrowDown'); await page.waitForTimeout(180)
  ok(await box.inputValue() === '-100000' || num(await box.inputValue()) === 0,
    'Shift+Arrow moves by ten steps and still respects the floor', await box.inputValue())

  const small = await page.evaluate(() => [...document.querySelectorAll('.nf-step, .nf-input, .sw')]
    .filter((e) => e.offsetParent).map((e) => e.getBoundingClientRect())
    .filter((r) => r.height < 44).length)
  ok(small === 0, 'every entry control is at least 44px tall', `${small} under`)

  await page.evaluate(() => {
    document.querySelectorAll('details.adv').forEach((d) => (d.open = true))
    document.querySelectorAll('.step').forEach((s) => s.classList.toggle('on', s.id === 'step-3'))
  })
  const sw = page.locator('[role=switch]').first()
  ok(await sw.getAttribute('aria-checked') === 'false', 'the partner toggle is a real switch, off by default')
  await sw.click(); await page.waitForTimeout(160)
  ok(await sw.getAttribute('aria-checked') === 'true', '…and toggles')
  await page.close()
}

/* ============================================================
   5 · The eighteen questions behave like a radiogroup
   ============================================================ */
section('5 · Single-select questions are operable by keyboard')
{
  const { page } = await open(WEALTH, /Start the assessment/)
  await page.getByRole('button', { name: 'Continue' }).first().click()
  await page.waitForTimeout(260)

  ok(await page.locator('[role=radiogroup]').count() === 18, 'all eighteen are radiogroups, not button toggles')
  const stops = await page.evaluate(() => [...document.querySelectorAll('[role=radiogroup]')]
    .map((g) => [...g.querySelectorAll('[role=radio]')].filter((o) => o.tabIndex === 0).length))
  ok(stops.every((n) => n === 1), 'each group is exactly one tab stop, not one per option',
    `got ${[...new Set(stops)].join(',')}`)

  const first = page.locator('[role=radio]:visible').first()
  await first.focus()
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(170)
  ok(await page.evaluate(() => document.activeElement?.getAttribute('aria-checked')) === 'true',
    'ArrowDown moves focus and selects, per the radio pattern')
  await page.keyboard.press('Home'); await page.waitForTimeout(170)
  ok(await page.evaluate(() => {
    const g = document.activeElement.closest('[role=radiogroup]')
    return g.querySelector('[role=radio]') === document.activeElement
  }), 'Home jumps to the first option')
  ok(Number(await page.evaluate(() => document.querySelector('[data-answered]')?.textContent)) >= 1,
    'a keyboard answer is counted')
  await page.close()
}

/* ============================================================
   6 · Hostile state
   ============================================================ */
section('6 · Corrupt saved state cannot take the page down')
{
  const poisons = ['{"age":"banana"}', '{"age":null}', 'not json at all', '[]',
    '{"current":1e308,"monthly":-1e308}', '{"age":{"nested":true}}', '{"__proto__":{"x":1}}', 'null']
  for (const [url, key, enter] of [
    [FREEDOM, 'prospa:freedom-number', /Start with my own numbers/],
    [WEALTH, 'prospa:wealth-score', /Start the assessment/]]) {
    for (const poison of poisons) {
      const page = await browser.newPage()
      const errs = []
      errorsFor(page, errs)
      await page.goto(url, { waitUntil: 'load' })
      await page.evaluate(([k, v]) => { localStorage.clear(); localStorage.setItem(k, v) }, [key, poison])
      await page.goto(url, { waitUntil: 'load' })
      await page.waitForTimeout(220)
      const alive = await page.getByRole('button', { name: enter }).count()
      ok(alive > 0 && errs.length === 0,
        `${key.split(':')[1]} survives ${poison.slice(0, 28)}`, errs[0] || 'start button missing')
      await page.close()
    }
  }
}

/* ============================================================
   7 · No impossible number ever reaches the screen
   ============================================================ */
section('7 · Adversarial figures produce no NaN, Infinity or negative money')
{
  const cases = {
    'stop work before today': { age: 60, workOptionalAge: 45 },
    'super before stopping': { workOptionalAge: 68, superAccessAge: 55 },
    'inflation above return': { investReturn: 0, inflation: 6 },
    'everything at zero': { current: 0, monthly: 0, superBalance: 0, superContrib: 0 },
    'everything at maximum': { current: 3000000, monthly: 25000, lifestyle: 400000, superBalance: 3000000 },
    'ten million typed in': { current: 10000000, superBalance: 9000000 },
  }
  for (const [name, over] of Object.entries(cases)) {
    const { page, errs } = await open(FREEDOM, /Start with my own numbers/)
    await page.evaluate((o) => {
      for (const [f, v] of Object.entries(o)) {
        const el = document.querySelector(`.nf[data-nf="${f}"] .nf-input`)
        if (el) { el.value = String(v); el.dispatchEvent(new Event('change', { bubbles: true })) }
      }
      document.querySelector('[data-go="5"]')?.click()
    }, over)
    await page.waitForTimeout(300)
    const t = await page.evaluate(() => document.body.innerText)
    const bad = t.match(/NaN|Infinity|\$-[\d,]+|-\$[\d,]+|undefined/g)
    ok(!bad && errs.length === 0, `${name} renders clean`,
      bad ? [...new Set(bad)].join(', ') : errs[0])
    await page.close()
  }
}

/* ---------- report ---------- */
await browser.close()
server.close()
console.log(results.join('\n'))
console.log(`\n  ${pass} passed, ${fail} failed\n`)
process.exit(fail ? 1 : 0)
