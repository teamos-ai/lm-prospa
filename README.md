# lm-prospa — Prospa Financial lead magnets

Ten session tools for Prospa Financial's **Executive Financial Wellbeing Workshop**
("From High Income to Financial Independence"), led by the **Executive Wealth Score**.

Built on the [Prospa Financial Design System](https://github.com/teamos-ai/prospa-financial-design-system)
and grounded in the [Prospa Financial database](https://github.com/teamos-ai/prospafinancial-database).

**Audience:** senior leaders and executives in their peak earning years, roughly $200k+.
**Session:** Peter Prvulj and Neil Mistry, 60–90 minutes, interactive presentation with Q&A.

---

## The ten

Each maps to one agenda item, so every tool has a moment in the session where it is handed out and
used rather than filed and forgotten.

| # | Tool | Type | Agenda item |
|---|---|---|---|
| 01 | **The Executive Wealth Score** | Scored assessment | 8 · Your Executive Financial Health Check |
| 02 | Your Financial Freedom Number | Calculator | 5 · Making Work Optional |
| 03 | The Gap Years Map | Calculator | 5 · Making Work Optional |
| 04 | The Next Dollar Decision Map | Decision guide | 3 · Building Wealth Outside Super |
| 05 | The Three Wealth Buckets | Worksheet | 3 · Building Wealth Outside Super |
| 06 | The Bonus & Surplus Playbook | Planner | 1 · The Financial Freedom Gap |
| 07 | The Executive Super Cheatsheet | Cheatsheet | 2 · Make Super Work Harder |
| 08 | Wealth Structures, Compared | Comparison | 4 · Tax-Effective Wealth Structures |
| 09 | The Income Protection Audit | Audit | 6 · Protecting What You Have Built |
| 10 | The Estate & Beneficiary Checklist | Checklist | 7 · Passing on Wealth |

### What came from the client, and what changed

Four pieces of attendee collateral were supplied. All four survive, substantially rebuilt:

| Supplied | Became | What changed |
|---|---|---|
| Executive Financial Health Check (PDF) | **01 Wealth Score** | The same six sections and the same Red/Amber/Green key, now weighted, scored out of 100, with a pattern engine reading the relationships between areas. A static tick-box became a diagnostic. |
| Financial Freedom Number Calculator (XLSX) | **02 Freedom Number** | Every formula ported exactly — the default scenario reproduces the workbook's $4,344,894 target and $1,417,247 projection to the dollar. Added live sliders, a projection chart against the target, and a sensitivity table showing which lever actually closes the gap. |
| Three Wealth Buckets Worksheet (PDF) | **05 Three Buckets** | Same three buckets, same prompts. Added live allocation visual and a read of the shape, which is where the insight was always hiding. |
| 2-Minute Financial Freedom Check-In (PDF) | *informs 01 and the webinar* | Kept as the pre-session instrument it was designed to be. Its proposed "Wealth Score" follow-up is what 01 now implements — properly specified. See `SCORING.md`. |

Six are new, chosen for this audience: the gap years (03) is the genuinely under-served question
for anyone wanting to stop before 60; the next-dollar map (04) answers the question high earners
actually ask; the bonus playbook (06) addresses lumpy executive income; the cheatsheet (07),
structures comparison (08) and estate checklist (10) are the reference documents this audience
keeps and shares.

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
  sheet.js              shared masthead, compliance footer, money formatting, persistence
  prospa-logo.png
  favicon.svg
SCORING.md              the Wealth Score model, in full
CLAIMS.md               every figure on every sheet, with its source and check date
```

`assets/sheet.js` is the single source for the AFSL line and the general-advice warning. Change it
there and all eleven pages change together — that is deliberate, and compliance text should never
be edited into an individual sheet.

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

**Accessible and responsive.** Verified at 375px with no horizontal overflow on any of the eleven
pages; the one wide table scrolls inside its own container. Option buttons use real
`aria-pressed` state, charts carry titles, and `prefers-reduced-motion` is honoured.

---

## Compliance

This is financial services collateral for an AFSL-regulated business. Three things govern it.

**1. General information only, everywhere.** No sheet recommends a product, a strategy or a
structure. No sheet considers anybody's objectives, financial situation or needs, and each says so.
The calculators state their limitations prominently — the Freedom Number sheet lists what it
ignores before it shows what it produces.

**2. Every figure is sourced.** `CLAIMS.md` registers every number across all ten tools with its
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
