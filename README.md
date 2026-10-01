# lm-prospa — Prospa Financial lead magnets

Twelve session tools for Prospa Financial's **Executive Financial Wellbeing Workshop**
("From High Income to Financial Independence"), led by **Your Wealth Score**.

Built on the [Prospa Financial Design System](https://github.com/teamos-ai/prospa-financial-design-system)
and grounded in the [Prospa Financial database](https://github.com/teamos-ai/prospafinancial-database).

**Audience:** senior leaders and executives in their peak earning years, roughly $200k+.
**Session:** Peter Prvulj and Neil Mistry, 60–90 minutes, interactive presentation with Q&A.

---

## The twelve

Each maps to one agenda item, so every tool has a moment in the session where it is handed out and
used rather than filed and forgotten.

| # | Tool | Type | Agenda item |
|---|---|---|---|
| 01 | **Your Wealth Score** | Scored assessment | 8 · Your Executive Financial Health Check |
| 02 | **Your Freedom Score** | Guided calculator | 5 · Making Work Optional |
| 03 | The Gap Years | Calculator | 5 · Making Work Optional |
| 04 | Your Next Dollar | Route planner | 3 · Building Wealth Outside Super |
| 05 | Your Three Buckets | Worksheet | 3 · Building Wealth Outside Super |
| 06 | The Bonus Playbook | Planner | 1 · The Financial Freedom Gap |
| 07 | The Super Cheatsheet | Cheatsheet | 2 · Make Super Work Harder |
| 08 | Where Your Wealth Lives | Comparison | 4 · Tax-Effective Wealth Structures |
| 09 | Is Your Income Covered? | Audit | 6 · Protecting What You Have Built |
| 10 | The Estate Checklist | Checklist | 7 · Passing on Wealth |
| 11 | What to Say | Swipe file | 9 · Live Q&A, and after |
| 12 | From High Income to Real Wealth | Guide (ebook) | The session in short |

> Names were simplified on 1 October 2026 at the client's request — shorter headings, plainer
> subheadings. `MAGNETS` in [`assets/sheet.js`](assets/sheet.js) is the single source; the
> gallery, the design system cards and every sheet read from it or match it.

### What came from the client, and what changed

Four pieces of attendee collateral were supplied. All four survive, substantially rebuilt:

| Supplied | Became | What changed |
|---|---|---|
| Executive Financial Health Check (PDF) | **01 Wealth Score** | The same six sections and the same Red/Amber/Green key, now weighted, scored out of 100, with a pattern engine reading the relationships between areas. A static tick-box became a diagnostic. |
| Financial Freedom Number Calculator (XLSX) | **02 Freedom Score** | Ported exactly, then **replaced** when Prospa's *Calculator workings* notes arrived and changed the model itself — from a portfolio that must last forever to one that must carry you from the day you stop to the day super unlocks. Now a five-step walk-through ending on two dashboards, with the life-path chart as its centrepiece. See below. |
| Three Wealth Buckets Worksheet (PDF) | **05 Three Buckets** | Same three buckets, same prompts. Added live allocation visual and a read of the shape, which is where the insight was always hiding. |
| 2-Minute Financial Freedom Check-In (PDF) | *informs 01 and the webinar* | Kept as the pre-session instrument it was designed to be. Its proposed "Wealth Score" follow-up is what 01 now implements — properly specified. See `SCORING.md`. |

Eight are new, chosen for this audience: the gap years (03) is the genuinely under-served question
for anyone wanting to stop before 60; the next-dollar map (04) answers the question high earners
actually ask; the bonus playbook (06) addresses lumpy executive income; the cheatsheet (07),
structures comparison (08) and estate checklist (10) are the reference documents this audience
keeps and shares; the swipe file (11) is what finally makes the rest happen, because almost nothing
moves until a conversation does; and the guide (12) is the session itself, as something to read.

---

## Your Freedom Score — what the spreadsheet became

The tool is **Your Freedom Score**. The figure it computes is your **Work Optional
Number** — the capital you need at your target age. Both names are the client's, and the
distinction is deliberate: the score is what you came for, the number is what it is made of.

> Rebuilt a second time from Prospa's own notes (*Calculator workings*), which replaced the model
> rather than tuning it. The analysis, the decisions and the gates are in
> [`CALCULATOR-V2-PLAN.md`](CALCULATOR-V2-PLAN.md); the model lives in
> [`assets/model.js`](assets/model.js) and is proven by [`tools/model.test.mjs`](tools/model.test.mjs)
> — **67 assertions, run with `node tools/model.test.mjs`.**
>
> The number is no longer a portfolio that must last forever. It is the capital needed to carry you
> from the day you stop work to the day superannuation unlocks — which took the headline from $4.3m
> to about $691k, and the reader's position from despair to a gap they can close. **Every figure is
> in today's dollars**, at the real return, which is both easier to feel and the basis ASIC
> Instrument 2022/603 requires of superannuation calculators.
>
> One invariant in the test harness earned its keep: *a funded plan can never empty before super*.
> It failed, and the cause was real — the Work Optional Number was priced as an annuity-immediate
> while the drawdown spends at the start of each year. Fixing it to an annuity-due moved **every
> figure materially closer to Prospa's own worked example** (gap $51,688 against their $55,000,
> 93% funded against their 92%, supported income $74,016 against their $73,000), which suggests
> they were modelling start-of-year drawdown all along.

### What was removed, and why it is not kept here

The first build ported the supplied workbook exactly: `capital = desired income ÷ withdrawal
rate`, a perpetuity. That model, its funding split and its "freedom age" formula are **gone** —
not deprecated, removed — because keeping a second set of formulas in a README is how a team ends
up maintaining the wrong one. The history is in git, and `CLAIMS.md` §8a records what changed and
on what date.

The two things worth carrying forward from it:

- **The withdrawal rate is gone with it.** It was the most compliance-sensitive input on the page —
  a planning assumption that reads as a recommendation however carefully it is labelled — and the
  bridge model does not need it.
- **The headline went from $4.3m to about $691k.** Same reader, same inputs, same honesty. The old
  tool told a high earner they had failed by $2.9m; the new one tells them they are 93% of the way
  there and names the gap. That is the whole argument for the rebuild.

---

## The four interaction patterns

All four live in [`assets/components.js`](assets/components.js) — plain JavaScript and CSS 3D
transforms, no framework, no library, so the sheets stay buildless and still print.

**`shortcuts(key)` — the cheatsheet tracker.** Each shortcut on a cheatsheet carries chips for what
it saves (tax, money, time, admin, risk, knowledge) and a plain statement of its trade-off. The
reader marks the ones that apply, and a running tally shows how many they have claimed and across
which kinds of saving. The claimed items carry through to print, so the page leaves with a personal
agenda on it. Used on **07**.

**`strikeList(key, onChange)` — checklists that cross out.** Ticking an item draws a green line
through it, greys it and keeps the explanatory sub-line readable. Counts stay in step through the
callback. Used on **09** and **10**.

**`mountFan(el, files)` — the swipe-file fan.** Up to seven cards in an arc; hovering lifts one and
eases its neighbours apart; activating the centre card turns it over to a spec sheet. Arrow keys and
dots move the fan, Escape turns a card back, and only the visible face is reachable by keyboard.
Used on **11**.

**`mountBook(el, spec)` — the ebook.** A closed 3D book with a page edge and a binding crease that
turns on hover, opening into a reader built from real sheets rotated about the spine — two pages to
a spread, or one page at a time below 720px, because a sheet model on a phone would skip every
second page. Used on **12**.

> Both effects are behavioural ports of the Health OS design system's `SwipeFiles.tsx` and
> `Ebook.tsx`, rebuilt without React, framer-motion or react-pageflip so that nothing here needs a
> build step.

---

## One widget vocabulary for every number

[`assets/widgets.js`](assets/widgets.js) is a plain-JavaScript port of the number and indicator
widgets from both design systems — the Prospa calculator bento (donut, bars, sparkline, hero tile)
and the Health OS widget library (ScoreGauge, TickedGauge, MetricStrip, BreakdownBar, GoalProgress,
ProgressRows, Comparison, Stepper).

| Widget | What it is for | Used on |
|---|---|---|
| `scoreGauge` | The headline score, as a 180° arc | 02 |
| `metricStrip` | Four headline figures in one row, with tone for good / warn / key | 02, 03, 05, 06 |
| `breakdownBar` | One stacked bar plus a legend carrying each share | 02, 03, 05 |
| `goalProgress` | Current against target, with an axis | 02, 03 |
| `progressRows` | Several measures on one scale — the sensitivity levers | 02 |
| `donut` | A ring with a centre label and legend | 06 |
| `projection` | A line against a target, with the shortfall shaded | 02 |
| `stepper` | The walk-through's spine | 02 |
| `tickedGauge`, `comparison` | Secondary indicators, available to any sheet | — |

Every widget takes real data, animates its measurement in once via a single shared
`IntersectionObserver`, and settles straight to its final state under reduced motion. Each one also
has a print rule, so a sheet exports with its bars and arcs at full value rather than mid-animation.

---

## Running it

Static files. No build step, no dependencies, no framework.

```bash
python3 -m http.server 4310
```

Then open <http://localhost:4310>. Any static server works; the only requirement is that it serves
over HTTP, because the sheets load `assets/sheet.js` as an ES module.

### Layout

```
index.html              the gallery — the click-through hub
magnets/                one self-contained HTML file per tool
assets/
  prospa.css            the design language, ported from the design system's tokens
  sheet.js              shared masthead and hero band, compliance footer, money, persistence
  widgets.js            the number and chart vocabulary — gauges, bars, donuts, life path
  components.js         shortcut tracker, strike lists, the swipe-file fan, the ebook
  model.js              the Freedom Score arithmetic, pure and DOM-free
  img/art/              generated brand artwork — hero bands and the guide's chapter plates
  img/photo/            licensed lifestyle photography, from the design system library
  prospa-logo.png
  favicon.svg
tools/model.test.mjs    67 assertions over model.js — `node tools/model.test.mjs`
SCORING.md              the Wealth Score model, in full
CLAIMS.md               every figure on every sheet, with its source and check date
CALCULATOR-V2-PLAN.md   the Freedom Score rebuild: analysis, decisions, open gates
```

`assets/sheet.js` is the single source for the AFSL line and the general-advice warning. Change it
there and all thirteen pages change together — that is deliberate, and compliance text should never
be edited into an individual sheet.

---

## Imagery

Every sheet opens on a hero band, and several carry a faded photograph beside a block of content.
The whole system is three classes in `prospa.css` — `.lm-hero`, `.lm-aside`, `.lm-photoband` —
plus `mountHero()` in `sheet.js`, so a sheet declares its artwork in one line rather than
hand-writing a band:

```js
mountSheet({
  no: '04',
  kind: 'Route planner',
  hero: { src: 'art/04-routemap.webp', alt: '', variant: 'art', pos: '50% 50%' },
})
```

Two rules shape all of it, and both are structural rather than stylistic:

**The hero band never carries text.** It always sits above the title. That is why this is safe to
put on twelve regulated documents: the title's contrast cannot fail, on screen, on paper, or in a
high-contrast mode we never see. The one component that does set type on imagery — `.lm-photoband`
— earns it by measurement rather than by assertion: 0.3 opacity under a near-opaque teal scrim,
7.4:1 on the worst composited pixel, and no photograph at all in print.

**The hero prints; everything else decorative does not.** `@media print` keeps one bounded band so
a saved PDF still opens on a designed page, and hides the `.lm-plate` and `.lm-aside` imagery so it
never becomes a brochure that drinks a cartridge of ink. A `.lm-photoband` degrades to a plain
rule-left pull-quote — the sentence was always the point, the photograph was only the mood.

Weight: **3.0MB for 51 images**. The generated art arrives as 5–10MB 2K PNGs and is resized to
1700px (860px for the guide's chapter plates) and re-encoded to WebP, which is a 96% reduction and
visually lossless at the sizes these ever display. See `CLAIMS.md` §8c for provenance, and the
rule that imagery here is atmosphere and never evidence.

---

## How it was built

**One design language.** `assets/prospa.css` is a direct port of the design system's
`tokens.css` — teal `#135f69`, green `#5dce38`, Poppins, the 10/15/20/30/100px radius scale, the
teal-tinted shadows, the eyebrow with its green dash. Ember `#c65a1e` appears at most once per
page, as the system intends. Light theme only.

**Documents, not web pages.** Each tool is a white "sheet" on a tinted desk, with a masthead
carrying its number and type, and a compliance footer. Every sheet has a print stylesheet, so
*Print or save as PDF* produces a clean A4 document with controls hidden and the footer converted
to a bordered block — the client can email these as PDFs without anything being redesigned.

**Nothing is collected.** Every calculator and worksheet runs in the browser. Entries persist in
`localStorage` so an attendee can close the tab and come back; nothing is sent anywhere, there is
no analytics, and there is no third-party script on any page. The gallery says *"0 data collected"*
because that is literally true, and it is a trust asset with this audience.

**Accessible and responsive.** Verified at 375px and 1000px with no horizontal overflow and no
runtime errors on any of the thirteen pages; the one wide table scrolls inside its own container.
Option buttons and claim toggles use real `aria-pressed` state, the fan exposes only the visible
card face to keyboard and screen readers, the reader announces its page politely, charts carry
titles, and `prefers-reduced-motion` is honoured throughout. The fan prints as a plain list of card
backs and the book prints its pages in order, so both still export to PDF.

---

## Compliance

This is financial services collateral for an AFSL-regulated business. Three things govern it.

**1. General information only, everywhere.** No sheet recommends a product, a strategy or a
structure. No sheet considers anybody's objectives, financial situation or needs, and each says so.
The calculators state their limitations prominently — the Freedom Number sheet lists what it
ignores before it shows what it produces.

**2. Every figure is sourced.** `CLAIMS.md` registers every number across all twelve tools with its
source and check date, and records what was deliberately *not* claimed. The published
"500+ customers" and "50+ years" claims are absent on purpose: the database's own source register
flags them as needing compliance review before reuse. No testimonial, award, outcome or named
product appears anywhere.

**3. The Wealth Score has a specification.** The database explicitly gated this:

> *"Do not create or send a score until the scoring rules, disclaimer and approval path are
> defined."*

`SCORING.md` defines the scoring rules and the disclaimer in full. **The approval path is a
business decision and remains open** — six items, listed in `SCORING.md` §8, that Prospa and the
licensee own.

> **Current position.** The instrument is built for the most conservative answer: the score stays
> on the attendee's device. It may be used as an on-screen self-assessment someone runs and keeps.
> **It must not be emailed, stored, reported on, or used as a basis for contacting anyone until
> §8 is closed.** Do not add an email field, an analytics tag or a form post without settling it.

### Before this goes live

1. Re-check the superannuation figures against the ATO's own tables — they index annually, and
   Division 296 is new law with its first measurement date still ahead (`CLAIMS.md` §1, §3).
2. Confirm the AFSL line in `assets/sheet.js` reads exactly as Advice Evolution requires.
3. Close the approval path in `SCORING.md` §8.
4. Decide whether the funnel links to the gallery before the session, after it, or both.

---

## Where it is used

- **Design system** — the *Three Items Lead Magnet* section of the
  [Prospa Financial Design System](https://github.com/teamos-ai/prospa-financial-design-system)
  carries a copy at `public/lead-magnets/`, so the reference site demonstrates the tools without
  depending on this deployment.
- **Funnel** — <https://prospa-webinar-funnel.vercel.app> promises registrants that
  "session tools [are] emailed to you afterwards". This is what that is.

---

*Built by [Team OS](https://www.oscale.ai) for Prospa Financial · October 2026*
