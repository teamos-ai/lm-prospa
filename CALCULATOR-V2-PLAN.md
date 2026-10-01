# Work Optional Calculator — v2 build plan

Prospa's notes (*Calculator workings*, voice memo transcript) rebuild magnet 02 from the ground up.
This is the analysis, the specified model, and the build order.

**Status:** awaiting three decisions (§6) before implementation starts.
**Prepared:** 1 October 2026 · Team OS

---

## 1. The one thing that changes everything

The current calculator sizes a portfolio that must last **forever**:

```
capital target = desired income ÷ withdrawal rate        ($120,000 ÷ 4% = $3,000,000)
```

Prospa's notes replace it with a portfolio that must last **from the work-optional age until super
unlocks** — and nothing further:

> *"How much accessible investment wealth is required at the target retirement age to fund the
> desired lifestyle until super becomes available."*

That is a far better product, and it is worth saying why:

| | Current (perpetuity) | New (bridge) |
|---|---|---|
| Headline number on the defaults | $4,344,894 | ~$855,000 |
| What the reader feels | A $2.9m shortfall. Despair. | A $90k shortfall. "I could close that." |
| Next step it suggests | None that feels possible | "$554 more a month" |

The current tool tells a high earner they have failed. The new one tells them they are 89% of the
way there and names the gap. **The client has improved their own product substantially**, and the
withdrawal-rate assumption — the most compliance-sensitive input on the page — disappears entirely.

---

## 2. Three things worth knowing before we build

### 2.1 The worked examples in the notes do not reconcile

Every figure in the notes is an illustrative placeholder, not a test vector. Checked against the
notes' own stated inputs (age 40 → 50, super at 60, $80,000/yr, $150,000 invested, $3,000/month, 6%,
2.5% inflation):

| Figure | Notes say | A correct implementation gives | Note |
|---|---|---|---|
| Work Optional Number | $720,000 | $855,353 in age-50 dollars, or $668,200 in today's dollars | No reading of the spec produces $720,000 |
| Projected portfolio | $665,000 | $764,548 | $150k + $3k/mo at 6% cannot produce $665,000 |
| Gap | $55,000 | $90,805 | |
| Funded | 92% | 89% | |
| Required monthly | +$450 | +$554 | |
| Work optional age | 52 | 51 | |
| Portfolio longevity | Age 94 | Age 71–81 depending on real vs nominal | |

**This is not a problem.** $720,000 and $665,000 are internally consistent with each other (92.4%),
which tells us they were chosen to demonstrate the *shape* of the output, exactly as you would in a
voice memo. And the correct implementation lands close to their instinct on every lever — +$554 a
month against their +$450, age 51 against their 52.

**Recommendation:** build the correct maths; do not reverse-engineer to hit $720,000. Hand Prospa a
one-page reconciliation so nobody later compares the live tool against the memo and reports a bug.

### 2.2 Today's dollars or future dollars — the decision that moves every number

The notes say the lifestyle figure is "in today's dollars" and that the calculator "automatically
increases this amount with inflation". That leaves the output ambiguous, and it is a **22% swing**:

- **Today's dollars** — Work Optional Number **$668,200**. Comparable to a salary today. Closest to
  the notes' own $720,000.
- **Age-50 dollars** — Work Optional Number **$855,353**. Technically what you would need in the
  bank that year, but a number nobody can feel.

There is also a regulatory dimension. **ASIC Instrument 2022/603** (superannuation calculators and
retirement estimates) gives relief from parts of the financial-product-advice regime, and one of its
conditions is that forecasts are **expressed in today's dollars**, converted using prescribed default
inflation rates unless the user enters their own — 3.7% nominal wage inflation in accumulation, 2.5%
price inflation in retirement, from 1 January 2025.

Once this calculator projects superannuation to age 60 and reports retirement longevity — both of
which the notes require — it looks squarely like a superannuation calculator.

**Recommendation: today's dollars throughout**, with future-dollar figures available on hover or in
an advanced view. It is easier to understand, closer to the client's own example, and consistent
with the instrument if the licensee determines it applies. **Whether it applies is Advice Evolution's
call, not ours** — see §7.

### 2.3 The notes do not anticipate their own most powerful output

On the notes' own example inputs, the projected portfolio **runs out at age 58 — two years before
super unlocks.** The notes assume $85,000 remains at 60.

That is the entire point of the bridge model and it deserves to be a first-class result:

> **Your money runs out at 58. Super unlocks at 60. That is a 2-year hole with nothing in it.**

No perpetuity calculation can produce that sentence. It is the strongest thing in the new model and
it should sit on the dashboard, not be buried.

---

## 3. The model, specified

All in today's dollars (pending §6 Q1). `real = (1 + return) ÷ (1 + inflation) − 1`.

```
yearsToTarget  = max(workOptionalAge − currentAge, 0)
bridgeYears    = max(superAccessAge − workOptionalAge, 0)

# 1 · Work Optional Number — capital needed at the target age to fund the bridge
annualNeed     = desiredIncome − partTimeIncome        (while part-time income runs)
workOptionalNo = PV of annualNeed over bridgeYears at `real`
                 = annualNeed × (1 − (1+real)^−bridgeYears) ÷ real      [× bridgeYears if real = 0]

# 2 · Projected portfolio — monthly contributions, monthly compounding
m              = return ÷ 12 ;  n = yearsToTarget × 12
projected      = current × (1+m)^n + monthly × ((1+m)^n − 1) ÷ m        [current + monthly×n if m = 0]

# 3 · Gap and funded %
gap            = projected − workOptionalNo
funded         = projected ÷ workOptionalNo            (the gauge; capped at 100 for display)

# 4 · Required monthly to land exactly on the number
required       = (workOptionalNo − current × (1+m)^n) × m ÷ ((1+m)^n − 1)
additional     = max(0, required − monthly)

# 5 · Work optional age on the current strategy
               = first age a ≥ currentAge where projected(a) ≥ workOptionalNo(a)
                 — both sides move: the target shrinks as the bridge shortens

# 6 · Income the projection actually supports
supported      = projected ÷ [(1 − (1+real)^−bridgeYears) ÷ real]

# 7 · Drawdown through the bridge → remaining at super access, or the age it runs out
                 year by year: balance −= spend ; balance ×= (1+return) ; spend ×= (1+inflation)

# 8 · Super at access age (client + partner, projected separately then combined)
superAt60      = balance × (1+rs)^k + (employer + additional) × ((1+rs)^k − 1) ÷ rs

# 9 · Combined wealth at 60 = remaining non-super + client super + partner super

# 10 · Longevity — draw the post-60 income from the combined pool until exhausted
```

Verified in an independent implementation before any of it is wired to UI, as with v1.

**Edge cases that must be handled rather than hidden:**

- Work-optional age ≥ super access age → bridge is nil; the Work Optional Number is $0 and the tool
  should say so plainly rather than show a meaningless gauge.
- Portfolio exhausts before super access → report the exhaustion age, not a negative balance.
- Zero return → every formula falls back to its linear form.
- Real return ≤ 0 (inflation ≥ return) → the annuity still solves; the number simply gets large.
- Longevity beyond the life-expectancy input → report "beyond *N*" rather than a false precision.

---

## 4. What exists, what changes, what is new

| # | Requirement from the notes | Today | Work |
|---|---|---|---|
| 1 | Work Optional Number = bridge funding | Perpetuity | **Replace core model** |
| 2 | Super access age as an input | Hardcoded 60 | Add, default 60 |
| 3 | Life expectancy for modelling | — | Add, default 90 |
| 4 | Partner: include, age, super, contributions, return | — | **New section** |
| 5 | Monthly investing | Annual | Convert |
| 6 | Return as 4 / 5 / 6 / 7 / custom | Slider | Preset chips + custom |
| 7 | Inflation, default 2.5% | ✓ | Move to Advanced |
| 8 | Years to target · bridge years | Partial | Surface both |
| 9 | Projected portfolio | ✓ | Switch to monthly |
| 10 | On-track % | ✓ (the score) | Becomes "Target funded" |
| 11 | Required monthly + additional | Annual only | Convert |
| 12 | Work optional age | ✓ (freedom age) | Re-derive on bridge model |
| 13 | Reduced income option | — | **New** |
| 14 | Part-time income + stop age | — | **New** |
| 15 | Super section, client + partner | — | **New** |
| 16 | Super at access age | — | **New** |
| 17 | Remaining non-super at access age | — | **New** |
| 18 | Post-60 income + post-60 return | — | **New** |
| 19 | Portfolio longevity | — | **New** |
| 20 | Four "next step options", auto-updating | Generic levers | Rewrite to their four |
| 21 | Super dashboard | — | **New** |
| 22 | Advanced Settings behind a button | — | **New** |
| 23 | Five-step flow | Four steps | Restructure |
| 24 | Withdrawal rate | ✓ exists | **Remove** |
| 25 | Exclusions (tax drag, CGT, franking, property, pension…) | Already absent | Confirm in writing |

Roughly a 3× expansion. Eleven client-facing inputs, seven behind Advanced Settings.

---

## 5. Build order

**Phase 1 — model and harness.** Implement §3 standalone, with a test file covering the notes'
example, the edge cases above, and a reconciliation table. Nothing touches UI until the numbers are
proven. *The maths is the product; the UI is how it feels.*

**Phase 2 — the five-step flow.** Rebuild the walk-through to their STEP 1–5 structure, using the
existing `stepper` widget. Advanced Settings as a disclosure panel inside the relevant step rather
than a separate screen, so nobody has to hunt for inflation.

**Phase 3 — the main dashboard.** Their layout, on the existing widget vocabulary:

- `scoreGauge` → **Target funded %**
- `metricStrip` → Work Optional Number · Projected · Gap · Years to target
- Headline pair → **Work optional age** and **required monthly**
- `projection` → portfolio to the target age, then the drawdown through the bridge — one continuous
  line that rises and then falls, with the super-access age marked. **This chart is the magnet**: it
  shows the hill and the cliff in one picture.
- Exhaustion callout when the money runs out before super

**Phase 4 — next step options.** Their four, auto-updating: invest $X more a month · make work
optional at age Y · reduce the lifestyle target to $Z · earn $P part-time until age Q. Each computed,
each phrased as an option rather than a recommendation.

**Phase 5 — super and post-60.** The second dashboard: client super, partner super, combined at
access age, remaining non-super, longevity against life expectancy.

**Phase 6 — sweep.** Print stylesheet, 375px/1000px verification, reduced motion, `CLAIMS.md` and
`README.md`, sync to the design system, deploy.

---

## 6. Decisions needed before Phase 1

**Q1 · Today's dollars or future dollars?** Moves the headline by 22% ($668,200 vs $855,353).
*Recommend today's dollars* — easier to feel, closest to the client's own example, and consistent
with ASIC 2022/603 if it applies.

**Q2 · One tool, or two?** The notes describe eleven client inputs plus partner and super — an
adviser-grade instrument, not a two-minute lead magnet. Either (a) one tool with Advanced Settings,
as specified, or (b) a short public version that hands off to a full version. *Recommend (a)* with a
hard rule that the first screen asks four questions and everything else is progressive.

**Q3 · Does "Freedom Score" survive?** The notes never mention a score; they say "TARGET FUNDED 92%".
*Recommend keeping the gauge and relabelling it "Target funded"* — same widget, their language, and
the lead magnet keeps its name.

Smaller items for Prospa to confirm: does part-time income reduce the requirement only between the
work-optional age and the stop age; does the annual increase in monthly investing make v1; and is
the life-expectancy default 90.

---

## 7. Compliance gates

Two, and neither is ours to close.

**G1 · Does ASIC Instrument 2022/603 apply?** Once this projects superannuation and reports
retirement longevity it has the character of a superannuation calculator. The instrument carries
conditions — today's-dollars presentation, prescribed default rates, specific disclosures. **Advice
Evolution must determine whether it applies before this goes live.** If it does, Q1 is decided for us
and the default inflation rates are prescribed rather than chosen.

**G2 · The existing approval path in `SCORING.md` §8 widens.** A tool that asks for a partner's
superannuation balance collects materially more personal information than one asking for an age. The
current build keeps everything in the browser and sends nothing anywhere; that position should be
confirmed in writing rather than assumed, and it should stay that way unless A4/A5 are settled.

Unchanged: general information only, no product recommendations, no reliance on the output, and the
exclusions in §25 stated on the page so nobody mistakes this for a full retirement plan.
