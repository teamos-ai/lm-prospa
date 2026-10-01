/* ============================================================
   PROSPA FINANCIAL — the Work Optional model
   Specified from Prospa's "Calculator workings" notes.

   EVERY FIGURE THIS MODULE RETURNS IS IN TODAY'S DOLLARS.

   That is one decision made once, and it makes the whole thing
   explicable: accumulation, the bridge, superannuation and the
   post-60 drawdown all run at the REAL return, with amounts the
   client stated in today's money held constant in real terms.
   Nothing is ever shown inflated to a future year.

       real = (1 + nominal) ÷ (1 + inflation) − 1

   It is also the presentation basis ASIC Instrument 2022/603
   requires of superannuation calculators — see CALCULATOR-V2-PLAN.md
   §2.2 and §7. Whether that instrument applies to this tool is
   Advice Evolution's determination, not ours.

   This module is pure arithmetic with no DOM and no side effects,
   so it can be exercised directly by tools/model.test.mjs.
   ============================================================ */

/** Real rate from a nominal rate and inflation. */
export const realRate = (nominal, inflation) => (1 + nominal) / (1 + inflation) - 1

/**
 * Present value of `n` yearly payments of `pmt`, the first one a year from now.
 * Falls back to the linear form when the rate is zero, and stays finite when
 * the real rate is negative (inflation above the return) — the number simply grows.
 */
export function pvAnnuity(pmt, rate, n) {
  if (n <= 0 || pmt <= 0) return 0
  if (Math.abs(rate) < 1e-9) return pmt * n
  return (pmt * (1 - Math.pow(1 + rate, -n))) / rate
}

/**
 * Present value when the payments fall at the START of each year — an annuity-due.
 *
 * This is the one the bridge needs. You stop work and you eat that year, so the first
 * year's spending comes out on day one, not twelve months later. Pricing it as an
 * annuity-immediate undercounts by a factor of (1 + rate), which shows up as a plan
 * reporting "funded" while the portfolio still empties before super — the invariant
 * in tools/model.test.mjs exists to catch exactly that.
 */
export const pvAnnuityDue = (pmt, rate, n) => pvAnnuity(pmt, rate, n) * (1 + rate)

/** Future value of a starting balance plus level monthly contributions. */
export function fvMonthly(current, monthly, rate, years) {
  const n = Math.round(years * 12)
  if (n <= 0) return current
  const m = rate / 12
  if (Math.abs(m) < 1e-12) return current + monthly * n
  return current * Math.pow(1 + m, n) + (monthly * (Math.pow(1 + m, n) - 1)) / m
}

/** The level monthly contribution that turns `current` into `target` over `years`. */
export function requiredMonthly(current, target, rate, years) {
  const n = Math.round(years * 12)
  if (n <= 0) return null
  const m = rate / 12
  const grown = Math.abs(m) < 1e-12 ? current : current * Math.pow(1 + m, n)
  if (grown >= target) return 0
  if (Math.abs(m) < 1e-12) return (target - current) / n
  return ((target - grown) * m) / (Math.pow(1 + m, n) - 1)
}

/**
 * Draw an income from a balance for a number of years.
 * Returns the closing balance and, if it empties, the year it did —
 * the bridge model's most important output and the one the notes do not anticipate.
 */
export function drawdown(balance, spend, rate, years) {
  let b = balance
  for (let k = 0; k < years; k++) {
    b -= spend
    if (b < 0) return { end: 0, exhaustedInYear: k + 1 }
    b *= 1 + rate
  }
  return { end: b, exhaustedInYear: null }
}

/** The age a pool supports `spend` until, drawing from `fromAge`. Null means it outlives `cap`. */
export function lastsUntil(pool, spend, rate, fromAge, cap = 110) {
  if (spend <= 0) return null
  let b = pool
  for (let a = fromAge; a < cap; a++) {
    b -= spend
    if (b < 0) return a
    b *= 1 + rate
  }
  return null
}

/**
 * The whole model.
 *
 * Inputs (today's dollars, percentages as numbers — 6 means 6%):
 *   age, workOptionalAge, superAccessAge, lifeExpectancy
 *   lifestyle            desired annual spend once work stops
 *   current, monthly     accessible investments outside super, and monthly contributions
 *   investReturn, inflation
 *   partTime, partTimeUntil      optional income during the bridge, and the age it stops
 *   superBalance, superContrib, superReturn
 *   partner {included, balance, contrib, return}
 *   postReturn           return after super access
 *   postIncome           desired income after super access (defaults to `lifestyle`)
 */
export function workOptionalModel(v) {
  const inflation = v.inflation / 100
  const r = realRate(v.investReturn / 100, inflation)
  const rs = realRate(v.superReturn / 100, inflation)
  const rp = realRate((v.partner?.return ?? v.superReturn) / 100, inflation)
  const rPost = realRate(v.postReturn / 100, inflation)

  const yearsToTarget = Math.max(v.workOptionalAge - v.age, 0)
  const bridgeYears = Math.max(v.superAccessAge - v.workOptionalAge, 0)

  /* ---- 1 · The Work Optional Number -------------------------------------
     Capital needed at the target age to fund the bridge, and nothing beyond it.
     Part-time income reduces the requirement only while it runs, so the bridge
     splits into a reduced-need period and a full-need period. */
  const ptYears = v.partTime > 0 ? Math.max(0, Math.min(bridgeYears, (v.partTimeUntil ?? 0) - v.workOptionalAge)) : 0
  const netEarly = Math.max(0, v.lifestyle - (v.partTime || 0))
  const workOptionalNumber =
    pvAnnuityDue(netEarly, r, ptYears) +
    // the full-need years sit after the part-time years, so discount them back
    pvAnnuityDue(v.lifestyle, r, bridgeYears - ptYears) / Math.pow(1 + r, ptYears)

  /* ---- 2 · Projected portfolio ------------------------------------------ */
  const projected = fvMonthly(v.current, v.monthly, r, yearsToTarget)

  /* ---- 3 · Gap and funded ----------------------------------------------- */
  const gap = projected - workOptionalNumber
  const funded = workOptionalNumber > 0 ? projected / workOptionalNumber : 1

  /* ---- 4 · Required monthly --------------------------------------------- */
  const required = requiredMonthly(v.current, workOptionalNumber, r, yearsToTarget)
  const additionalMonthly = required === null ? null : Math.max(0, required - v.monthly)

  /* ---- 5 · The age the goal becomes achievable on the current strategy ---
     Both sides move: every year later is a year more of accumulation AND a
     year less of bridge to fund. */
  // Note: this reaches `superAccessAge` for everyone, because at that age the bridge is
  // nil and nothing accessible is required. That is not "funded" — it means "not before
  // super unlocks", and the UI must say so rather than implying the plan works.
  let achievableAge = null
  for (let a = v.age; a <= Math.max(v.superAccessAge, v.age); a++) {
    const yrs = a - v.age
    const bridge = Math.max(v.superAccessAge - a, 0)
    const pt = v.partTime > 0 ? Math.max(0, Math.min(bridge, (v.partTimeUntil ?? 0) - a)) : 0
    const need =
      pvAnnuityDue(netEarly, r, pt) + pvAnnuityDue(v.lifestyle, r, bridge - pt) / Math.pow(1 + r, pt)
    if (fvMonthly(v.current, v.monthly, r, yrs) >= need) {
      achievableAge = a
      break
    }
  }

  /* ---- 6 · The income the projection actually supports ------------------- */
  const factor = pvAnnuityDue(1, r, bridgeYears)
  const supportedIncome = factor > 0 ? projected / factor + (v.partTime || 0) * (ptYears / Math.max(bridgeYears, 1)) : 0

  /* ---- 7 · Through the bridge ------------------------------------------- */
  // Year by year so the chart and the exhaustion age come from the same walk.
  const bridgePath = []
  let bal = projected
  let exhaustedAtAge = null
  for (let k = 0; k < bridgeYears; k++) {
    const ageThen = v.workOptionalAge + k
    const spend = Math.max(0, v.lifestyle - (v.partTime > 0 && ageThen < (v.partTimeUntil ?? 0) ? v.partTime : 0))
    bal -= spend
    if (bal < 0) {
      bal = 0
      if (exhaustedAtAge === null) exhaustedAtAge = ageThen
    } else {
      bal *= 1 + r
    }
    bridgePath.push({ age: ageThen + 1, balance: bal })
  }
  const remainingAtAccess = bal

  /* ---- 8 · Superannuation at the access age ----------------------------- */
  const superYears = Math.max(v.superAccessAge - v.age, 0)
  const clientSuper = fvMonthly(v.superBalance || 0, (v.superContrib || 0) / 12, rs, superYears)

  const p = v.partner || {}
  // The partner reaches the access age on their own timeline.
  const partnerYears = p.included ? Math.max(v.superAccessAge - (p.age ?? v.age), 0) : 0
  const partnerSuper = p.included ? fvMonthly(p.balance || 0, (p.contrib || 0) / 12, rp, partnerYears) : 0

  const combinedAtAccess = remainingAtAccess + clientSuper + partnerSuper

  /* ---- 9 · After the access age ----------------------------------------- */
  const postIncome = v.postIncome ?? v.lifestyle
  const lastsTo = lastsUntil(combinedAtAccess, postIncome, rPost, v.superAccessAge)
  const outlivesPlan = lastsTo === null || lastsTo >= v.lifeExpectancy

  /* ---- 10 · The post-access drawdown, walked year by year ---------------
     Same walk as `lastsUntil`, kept so the chart and the longevity age can
     never disagree. Runs to the later of life expectancy and the age it empties. */
  const postPath = []
  {
    let b = combinedAtAccess
    const until = Math.min(110, Math.max(v.lifeExpectancy, lastsTo ?? v.lifeExpectancy))
    for (let a = v.superAccessAge; a < until; a++) {
      b -= postIncome
      if (b < 0) { b = 0; postPath.push({ age: a + 1, balance: 0 }); break }
      b *= 1 + rPost
      postPath.push({ age: a + 1, balance: b })
    }
  }

  /* ---- Accumulation path, for the chart --------------------------------- */
  const accumPath = []
  for (let n = 0; n <= yearsToTarget; n++) {
    accumPath.push({ age: v.age + n, balance: fvMonthly(v.current, v.monthly, r, n) })
  }

  return {
    // frame
    real: r, realSuper: rs, realPost: rPost,
    yearsToTarget, bridgeYears, ptYears,
    // the six core outputs the notes ask for
    workOptionalNumber, projected, gap, funded,
    requiredMonthly: required, additionalMonthly,
    achievableAge, supportedIncome,
    // the bridge
    bridgePath, remainingAtAccess, exhaustedAtAge,
    // super and beyond
    clientSuper, partnerSuper, combinedAtAccess,
    postIncome, lastsTo, outlivesPlan, postPath,
    // for charting
    accumPath,
  }
}

/**
 * The four "next step options" from the notes, each computed rather than asserted,
 * and each phrased as an option rather than a recommendation.
 */
export function nextSteps(v, m) {
  const out = []

  if (m.additionalMonthly > 0)
    out.push({ kind: 'invest', amount: m.additionalMonthly, label: `Invest ${Math.round(m.additionalMonthly)} more per month` })

  if (m.achievableAge !== null && m.achievableAge > v.workOptionalAge)
    out.push({ kind: 'age', age: m.achievableAge, label: `Make work optional at age ${m.achievableAge}` })

  if (m.supportedIncome > 0 && m.supportedIncome < v.lifestyle)
    out.push({ kind: 'income', amount: m.supportedIncome, label: `Reduce the annual lifestyle target to ${Math.round(m.supportedIncome)}` })

  // What part-time income would close the gap on its own, over the years it would run.
  // `|| superAccessAge` not `??`: an unset stop age arrives as 0, which would otherwise
  // collapse the option to a single year.
  if (m.gap < 0 && m.bridgeYears > 0) {
    const years = Math.max(1, Math.min(m.bridgeYears, (v.partTimeUntil || v.superAccessAge) - v.workOptionalAge))
    const f = pvAnnuityDue(1, m.real, years)
    if (f > 0) out.push({ kind: 'partTime', amount: -m.gap / f, years, label: `Earn part-time income until age ${v.workOptionalAge + years}` })
  }

  return out
}
