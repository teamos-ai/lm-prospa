/* ============================================================
   Work Optional model — test harness.
       node tools/model.test.mjs
   Proves the arithmetic before any of it reaches the UI, and
   prints the reconciliation against Prospa's worked example.
   ============================================================ */

import { workOptionalModel, nextSteps, pvAnnuity, pvAnnuityDue, fvMonthly, requiredMonthly, realRate } from '../assets/model.js'

let pass = 0
let fail = 0
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`) }
}
const near = (a, b, tol = 1) => Math.abs(a - b) <= tol
const money = (n) => '$' + Math.round(n).toLocaleString('en-US')

/* The inputs from Prospa's notes. */
const NOTES = {
  age: 40, workOptionalAge: 50, superAccessAge: 60, lifeExpectancy: 90,
  lifestyle: 80000, current: 150000, monthly: 3000,
  investReturn: 6, inflation: 2.5,
  partTime: 0, partTimeUntil: 0,
  superBalance: 200000, superContrib: 25000, superReturn: 6,
  partner: { included: false },
  postReturn: 5, postIncome: 80000,
}

console.log('\n── 1 · Primitives ──────────────────────────────────────────')
{
  ok('pvAnnuity at zero rate is linear', pvAnnuity(1000, 0, 10) === 10000)
  ok('pvAnnuity of nothing is nothing', pvAnnuity(0, 0.05, 10) === 0 && pvAnnuity(1000, 0.05, 0) === 0)
  ok('pvAnnuity survives a negative real rate', pvAnnuity(1000, -0.01, 10) > 10000)
  ok('fvMonthly at zero rate is linear', fvMonthly(1000, 100, 0, 1) === 1000 + 1200)
  ok('fvMonthly over no years returns the balance', fvMonthly(5000, 100, 0.06, 0) === 5000)

  // The headline round-trip: the required contribution must actually land on the target.
  const target = 500000
  const req = requiredMonthly(100000, target, 0.05, 15)
  ok('requiredMonthly lands exactly on target', near(fvMonthly(100000, req, 0.05, 15), target, 0.5),
     `got ${money(fvMonthly(100000, req, 0.05, 15))}`)
  ok('requiredMonthly is zero when already funded', requiredMonthly(600000, 500000, 0.05, 15) === 0)
  ok('requiredMonthly is null with no years left', requiredMonthly(100000, 500000, 0.05, 0) === null)
  ok('realRate strips inflation', near(realRate(0.06, 0.025), 0.0341463, 1e-6))
  ok('an annuity-due is worth (1+r) more than an immediate',
     near(pvAnnuityDue(1000, 0.05, 10), pvAnnuity(1000, 0.05, 10) * 1.05, 1e-9))
  // The pricing must match the drawdown walk exactly: spend at the start, then grow.
  {
    const P = pvAnnuityDue(80000, 0.034, 10)
    let b = P
    for (let k = 0; k < 10; k++) { b -= 80000; b *= 1.034 }
    ok('an annuity-due priced balance empties to zero', Math.abs(b) < 1, `left ${Math.round(b)}`)
  }
}

console.log("\n── 2 · Prospa's worked example ─────────────────────────────")
const m = workOptionalModel(NOTES)
{
  ok('10 years to the target age', m.yearsToTarget === 10)
  ok('10 bridge years', m.bridgeYears === 10)
  ok('the number is positive', m.workOptionalNumber > 0)
  ok('funded is projected ÷ required', near(m.funded, m.projected / m.workOptionalNumber, 1e-9))
  ok('gap is projected − required', near(m.gap, m.projected - m.workOptionalNumber, 1e-6))
  ok('required monthly lands on the number',
     near(fvMonthly(NOTES.current, m.requiredMonthly, m.real, m.yearsToTarget), m.workOptionalNumber, 1),
     `got ${money(fvMonthly(NOTES.current, m.requiredMonthly, m.real, m.yearsToTarget))}`)
  ok('the achievable age is at or after the target when short',
     m.gap >= 0 || m.achievableAge === null || m.achievableAge >= NOTES.workOptionalAge)
  ok('the supported income is below the target when short', m.gap >= 0 || m.supportedIncome < NOTES.lifestyle)
  ok('the bridge path has one point per bridge year', m.bridgePath.length === m.bridgeYears)
  ok('the accumulation path spans the accumulation years', m.accumPath.length === m.yearsToTarget + 1)
  ok('the accumulation path ends at the projection', near(m.accumPath.at(-1).balance, m.projected, 1))
}

console.log('\n  Reconciliation against the notes (today\'s dollars):')
const row = (k, notes, ours) => console.log(`    ${k.padEnd(26)} notes ${String(notes).padStart(10)}   ours ${String(ours).padStart(10)}`)
row('Work Optional Number', '$720,000', money(m.workOptionalNumber))
row('Projected portfolio', '$665,000', money(m.projected))
row('Gap', '$55,000', money(Math.abs(m.gap)))
row('Target funded', '92%', Math.round(m.funded * 100) + '%')
row('Additional per month', '$450', money(m.additionalMonthly))
row('Work optional age', '52', m.achievableAge ?? 'beyond 60')
row('Supported income', '$73,000', money(m.supportedIncome))
console.log('    → the notes\' figures are illustrative; ours follow from the stated inputs.')

console.log('\n── 3 · The bridge, and running out ─────────────────────────')
{
  // Deliberately underfunded: the money must run out before super.
  const broke = workOptionalModel({ ...NOTES, current: 50000, monthly: 500 })
  ok('an underfunded plan exhausts before super access', broke.exhaustedAtAge !== null,
     `exhausted at ${broke.exhaustedAtAge}`)
  ok('the exhaustion age sits inside the bridge',
     broke.exhaustedAtAge === null || (broke.exhaustedAtAge >= 50 && broke.exhaustedAtAge < 60))
  ok('nothing remains once it is exhausted', broke.remainingAtAccess === 0)
  ok('the balance never goes negative', broke.bridgePath.every((p) => p.balance >= 0))
  console.log(`    underfunded case: runs out at ${broke.exhaustedAtAge}, ${60 - broke.exhaustedAtAge} years before super`)

  // Comfortably funded: money should survive the bridge.
  const rich = workOptionalModel({ ...NOTES, current: 900000, monthly: 6000 })
  ok('a well-funded plan survives the bridge', rich.exhaustedAtAge === null && rich.remainingAtAccess > 0,
     `remaining ${money(rich.remainingAtAccess)}`)
  ok('a well-funded plan is achievable at or before the target age', rich.achievableAge <= NOTES.workOptionalAge)
}

console.log('\n── 4 · Part-time income ────────────────────────────────────')
{
  const noPt = workOptionalModel(NOTES)
  const withPt = workOptionalModel({ ...NOTES, partTime: 20000, partTimeUntil: 55 })
  ok('part-time income reduces the number required', withPt.workOptionalNumber < noPt.workOptionalNumber,
     `${money(noPt.workOptionalNumber)} → ${money(withPt.workOptionalNumber)}`)
  ok('it only counts for the years it runs', withPt.ptYears === 5)
  const full = workOptionalModel({ ...NOTES, partTime: 20000, partTimeUntil: 60 })
  ok('running it the whole bridge reduces it further', full.workOptionalNumber < withPt.workOptionalNumber)
  ok('part-time beyond the bridge is capped at the bridge',
     workOptionalModel({ ...NOTES, partTime: 20000, partTimeUntil: 80 }).ptYears === 10)
  console.log(`    no part-time ${money(noPt.workOptionalNumber)} → to 55 ${money(withPt.workOptionalNumber)} → to 60 ${money(full.workOptionalNumber)}`)
}

console.log('\n── 5 · Super, partner and longevity ────────────────────────')
{
  ok('client super is projected to the access age', m.clientSuper > NOTES.superBalance)
  ok('no partner means no partner super', m.partnerSuper === 0)

  const withPartner = workOptionalModel({
    ...NOTES,
    partner: { included: true, age: 38, balance: 150000, contrib: 20000, return: 6 },
  })
  ok('a partner adds super', withPartner.partnerSuper > 0, money(withPartner.partnerSuper))
  ok('combined is the sum of its parts',
     near(withPartner.combinedAtAccess, withPartner.remainingAtAccess + withPartner.clientSuper + withPartner.partnerSuper, 1))
  ok('a younger partner accumulates for longer',
     workOptionalModel({ ...NOTES, partner: { included: true, age: 30, balance: 150000, contrib: 20000, return: 6 } }).partnerSuper >
       withPartner.partnerSuper)

  ok('the pool lasts to a sensible age', withPartner.lastsTo === null || withPartner.lastsTo > NOTES.superAccessAge,
     `lasts to ${withPartner.lastsTo}`)
  ok('a larger pool lasts longer',
     (workOptionalModel({ ...NOTES, superBalance: 900000, partner: { included: true, age: 38, balance: 600000, contrib: 30000, return: 6 } }).lastsTo ?? 999) >=
       (withPartner.lastsTo ?? 0))
  ok('a bigger drawdown runs out sooner',
     (workOptionalModel({ ...NOTES, postIncome: 200000 }).lastsTo ?? 999) <= (m.lastsTo ?? 999))
  console.log(`    client super ${money(m.clientSuper)} · with partner, combined ${money(withPartner.combinedAtAccess)} · lasts to ${withPartner.lastsTo ?? '110+'}`)
}

console.log('\n── 6 · Edge cases ──────────────────────────────────────────')
{
  const atAge = workOptionalModel({ ...NOTES, workOptionalAge: 40 })
  ok('a target age of today still produces a number', atAge.workOptionalNumber > 0)
  ok('no years to the target means no required monthly', atAge.requiredMonthly === null)

  const past60 = workOptionalModel({ ...NOTES, workOptionalAge: 62 })
  ok('a target at or after super access has no bridge', past60.bridgeYears === 0)
  ok('…and therefore nothing to fund', past60.workOptionalNumber === 0)
  ok('…and counts as funded', past60.funded === 1)

  const zero = workOptionalModel({ ...NOTES, investReturn: 0, superReturn: 0, postReturn: 0 })
  ok('a zero nominal return is handled', Number.isFinite(zero.projected) && Number.isFinite(zero.workOptionalNumber))
  ok('a zero return gives a negative real rate', zero.real < 0)

  const highInf = workOptionalModel({ ...NOTES, inflation: 8 })
  ok('inflation above the return still solves', Number.isFinite(highInf.workOptionalNumber) && highInf.workOptionalNumber > 0)
  ok('…and makes the requirement larger', highInf.workOptionalNumber > m.workOptionalNumber)

  const broke2 = workOptionalModel({ ...NOTES, current: 0, monthly: 0 })
  ok('nothing invested projects to nothing', broke2.projected === 0)
  ok('…is zero per cent funded', broke2.funded === 0)
  // Not null: at the access age the bridge is nil, so nothing accessible is required.
  // The honest reading is "not before super unlocks", which the UI must say in words.
  ok('…and is achievable only once super unlocks', broke2.achievableAge === NOTES.superAccessAge,
     `got ${broke2.achievableAge}`)

  ok('every returned figure is finite',
     Object.entries(m).every(([, val]) =>
       typeof val !== 'number' || Number.isFinite(val)))
}

console.log('\n── 7 · Next steps ──────────────────────────────────────────')
{
  const steps = nextSteps(NOTES, m)
  ok('an underfunded plan offers options', steps.length > 0)
  ok('every option carries a computed amount or age',
     steps.every((s) => Number.isFinite(s.amount) || Number.isFinite(s.age)))
  steps.forEach((s) => console.log(`    • ${s.label}`))

  const rich = { ...NOTES, current: 900000, monthly: 6000 }
  const richSteps = nextSteps(rich, workOptionalModel(rich))
  ok('a funded plan offers no gap-closing options', richSteps.length === 0, `got ${richSteps.length}`)

  // The part-time option must span the real bridge, not collapse to one year.
  const pt = nextSteps(NOTES, m).find((s) => s.kind === 'partTime')
  ok('the part-time option runs to super access when no stop age is set',
     pt && pt.years === m.bridgeYears, pt ? `got ${pt.years} years` : 'missing')
}

console.log('\n── 8 · The life path, for the chart ────────────────────────')
{
  const withPartner = workOptionalModel({
    ...NOTES,
    partner: { included: true, age: 38, balance: 150000, contrib: 20000, return: 6 },
  })
  ok('the accumulation path starts at today', withPartner.accumPath[0].age === NOTES.age)
  ok('…and starts at the current balance', near(withPartner.accumPath[0].balance, NOTES.current, 1))
  ok('the bridge picks up where accumulation ends',
     withPartner.bridgePath[0].age === NOTES.workOptionalAge + 1)
  ok('the post-access path starts after super unlocks',
     withPartner.postPath[0].age === NOTES.superAccessAge + 1)
  ok('the post-access path never goes negative', withPartner.postPath.every((p) => p.balance >= 0))
  ok('the path and the longevity age agree',
     withPartner.lastsTo === null || withPartner.postPath.at(-1).age >= withPartner.lastsTo)

  // The invariant that makes the headline honest: if the projection covers the number,
  // the portfolio cannot empty before super — so "funded" and "runs out" can never
  // both be true on the same result.
  for (const [label, over] of [['exactly funded', 0], ['comfortably funded', 250000]]) {
    const base = workOptionalModel(NOTES)
    const v = { ...NOTES, current: NOTES.current + (base.workOptionalNumber - base.projected) / 1 + over }
    const r = workOptionalModel(v)
    if (r.funded >= 1) ok(`a ${label} plan never empties before super`, r.exhaustedAtAge === null,
      `funded ${Math.round(r.funded * 100)}% yet empty at ${r.exhaustedAtAge}`)
  }

  // A plan that empties must end the chart at zero, at the age reported.
  const thin = workOptionalModel({ ...NOTES, superBalance: 0, superContrib: 0, postIncome: 150000 })
  ok('an emptying pool ends the path at zero', thin.lastsTo === null || thin.postPath.at(-1).balance === 0)
  ok('…at the age it reports', thin.lastsTo === null || thin.postPath.at(-1).age === thin.lastsTo + 1,
     `lastsTo ${thin.lastsTo}, path ends ${thin.postPath.at(-1).age}`)
  console.log(`    accumulate ${withPartner.accumPath.length} pts · bridge ${withPartner.bridgePath.length} · after access ${withPartner.postPath.length}`)
}

console.log(`\n${'─'.repeat(60)}\n  ${pass} passed, ${fail} failed\n`)
process.exit(fail ? 1 : 0)
