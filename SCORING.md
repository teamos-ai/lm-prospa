# The Executive Wealth Score — scoring specification

This file is the scoring model the Prospa Financial database asked for before any score is
produced or sent.

> `08-channels-and-playbooks/attendee-tools/financial-freedom-check-in.md` records:
> *"A proposed post-session 'Wealth Score' email is an implementation idea, not a scoring model
> supplied in this source. **Do not create or send a score until the scoring rules, disclaimer and
> approval path are defined.**"*

Sections 1–6 below define the **scoring rules**. Section 7 is the **disclaimer**, which is
rendered on the instrument itself. Section 8 is the **approval path**, which is the only one of
the three that Prospa Financial must settle — it is a business decision, not a build decision,
and it remains **open** until an authorised representative signs it off.

**Until section 8 is closed, the score may be used as an on-screen self-assessment that an
attendee runs and keeps. It must not be emailed, stored, reported on, or used as a basis for
contacting anyone.**

---

## 1. What the score measures — and what it does not

The score measures **how deliberately a person's financial arrangements are working**, as
reported by that person.

It is explicitly **not**:

- a measure of wealth, net worth, or financial position;
- an assessment of financial health or of how well someone is doing;
- a review of anybody's finances;
- a risk profile;
- a product or strategy recommendation;
- personal advice of any kind.

Every question asks about the respondent's own certainty regarding their own arrangements. Nobody
is asked for a dollar figure, an account, an institution or a balance. The instrument cannot
distinguish a person with $200,000 from a person with $20 million — by design.

This framing is what keeps the instrument educational rather than advisory, and it is the reason
the copy repeatedly says *"there is no good or bad score"*.

## 2. Structure

Six areas, eighteen questions, three questions per area. The six areas are taken directly from
Prospa Financial's own **Executive Financial Health Check** (sections 1–6 of that document), so the
instrument maps one-to-one onto collateral the client already approved.

| # | Area | Health Check section | Weight |
|---|---|---|---:|
| 1 | Cash Flow & Surplus | 1. Cash Flow & Wealth Creation | 18 |
| 2 | Superannuation | 2. Superannuation | 15 |
| 3 | Investments & Structure | 3. Investments & Tax Structure | 20 |
| 4 | Financial Independence | 4. Financial Independence | 20 |
| 5 | Protection & Resilience | 5. Protection & Resilience | 15 |
| 6 | Estate & Legacy | 6. Estate & Intergenerational Wealth | 12 |
| | | **Total** | **100** |

Two further questions — current age and the age at which the respondent would like work to become
optional — are asked for context. **They are not scored.** They drive the horizon panel and the
`preservation-age-trap` pattern only.

## 3. Answer values

Each question offers exactly three answers, carrying the values below. The three-point scale is
deliberately the same Red / Amber / Green key used by the Executive Financial Health Check.

| Answer character | Health Check equivalent | Value |
|---|---|---:|
| "I know this is covered" | Green | 1 |
| "I think so, but I am not certain" | Amber | 0.5 |
| "This needs attention" | Red | 0 |

Answers are worded specifically for each question rather than shown as abstract colours, which
raises completion and reduces the chance a respondent self-flatters by picking a label.

## 4. Calculation

```
areaFraction(a)  = mean(value of the 3 answers in area a)        → 0 … 1
areaPoints(a)    = areaFraction(a) × weight(a)
score            = round( Σ areaPoints(a) )                       → 0 … 100
```

All eighteen questions must be answered; the interface will not advance past an area until its
three questions are complete, so an unanswered question cannot silently score zero.

**Worked example.** Cash Flow 0.5, Super 1.0, Structure 0.333, Independence 0.167, Protection
0.333, Estate 0.167 →
`(0.5×18) + (1.0×15) + (0.333×20) + (0.167×20) + (0.333×15) + (0.167×12)`
`= 9 + 15 + 6.67 + 3.33 + 5 + 2 = 41.0` → **41**, band *Accumulating by Default*.

### Why the weights are what they are

The weights are **Prospa Financial's educational judgement about what tends to matter most during
peak earning years**. They are not a regulatory, industry or statistical standard, and the
instrument says so on the result page.

- **Investments & Structure (20)** and **Financial Independence (20)** carry the most because
  they are where high earners most often leak value, and where the webinar's thesis sits.
- **Cash Flow & Surplus (18)** is the raw material — without surplus, the other areas are theory.
- **Superannuation (15)** matters greatly but is partly automatic for an employee, so a person
  can score well on it without having made a single deliberate decision.
- **Protection & Resilience (15)** is high-consequence but low-variance: most answers cluster.
- **Estate & Legacy (12)** is the least urgent during accumulation, though it is weighted enough
  that neglecting it is visible.

If Prospa changes a weight, change it here first — the weights are stated on the instrument's
intro screen and must match.

## 5. Bands

| Score | Band | Intent |
|---:|---|---|
| 0–39 | Income Rich, Structure Poor | Names the pattern without blaming the person |
| 40–59 | Accumulating by Default | Assets exist; design does not |
| 60–74 | Building Deliberately | Most decisions considered; one or two gaps |
| 75–89 | Coordinated Strategy | Joined up; the work shifts to refinement |
| 90–100 | Independent by Design | Little is accidental; stress-testing is next |

Band copy is deliberately non-judgemental at the low end and non-congratulatory at the high end.
A low score must never read as a failure, and a high score must never read as "you do not need
advice" — both would be a misuse of an instrument that measures self-reported certainty.

## 6. Pattern rules

Patterns read the **relationship between areas**, which is where the diagnostic value sits. They
fire on area fractions (`f`), in the priority order listed; at most **two** are shown. If none
fire, a neutral "balanced profile" message is shown instead.

| Priority | Pattern | Fires when | Emphasis |
|---:|---|---|---|
| 1 | The preservation age trap | `f.super ≥ 0.66` and `f.freedom ≤ 0.5` and `targetAge < 60` | flagged |
| 2 | Surplus without a destination | `f.cashflow ≤ 0.5` and `f.structure ≤ 0.5` | flagged |
| 3 | A well-built, lightly defended balance sheet | `f.protection ≤ 0.5` and (`f.cashflow ≥ 0.66` or `f.structure ≥ 0.66`) | flagged |
| 4 | No destination has been set | `f.freedom ≤ 0.34` | plain |
| 5 | A collection, not a portfolio | `f.structure ≤ 0.5` and `f.super ≥ 0.66` and `f.cashflow ≥ 0.66` | plain |
| 6 | Coordinated everywhere except the end | `f.estate ≤ 0.34` and `overall ≥ 0.6` | plain |
| 7 | Every area is working | all six `f ≥ 0.66` | plain |

Patterns describe a shape in the answers and the general question it raises. **No pattern names a
product, a structure or an action**, and none of them tells the respondent what to do.

### Derived outputs

- **Two widest gaps** — the two lowest-scoring individual questions, ties broken by area weight,
  then by question order. Each is shown with a short explanation of *why that question matters*,
  written as education rather than as a prompt to act.
- **The one question** — the lowest-scoring question inside the lowest-scoring area, so the
  sentence names one area and a question that genuinely belongs to it.
- **Horizon panel** — years to the target age, and `max(60 − targetAge, 0)` years before
  preservation age. Preservation age is fixed at 60 because, from 1 July 2024, it is 60 for
  everyone who had not already reached it.

## 7. Disclaimer (required, and already on the instrument)

The intro screen carries:

> This is an educational self-assessment. It records your own view of your arrangements — not a
> review of your finances, not a measure of financial health, and not personal advice. It does not
> consider your objectives, financial situation or needs, and no answer leads to a product
> recommendation. There is no good or bad score. The score exists to show you which questions
> deserve a closer look.

The result screen carries:

> It reflects what you reported about your own arrangements on `<date>`. It is general information
> only, is not a review of your financial position, and is not personal advice. The weightings are
> Prospa Financial's educational judgement about what tends to matter during peak earning years —
> they are not a regulatory, industry or statistical standard.

Every page also carries the standard footer, from one source in `assets/sheet.js`:

> **General information only.** This document provides general information only. It does not
> consider your personal objectives, financial situation or needs, and it is not a recommendation
> of any financial product, strategy or structure. Consider whether it is appropriate for you and
> seek personal advice before acting. Prospa Financial Pty Ltd is a Corporate Authorised
> Representative of Advice Evolution Pty Ltd, Australian Financial Services Licensee 342880.

## 8. Approval path — **OPEN, owned by Prospa Financial**

This is the item the database gates on, and it cannot be closed from outside the business.

| # | Decision | Owner | Status |
|---|---|---|---|
| A1 | Sign-off that the six weights reflect the firm's educational view | Neil Mistry / Peter Prvulj | open |
| A2 | Sign-off on band names and band copy | Neil Mistry | open |
| A3 | Sign-off that the disclaimers in §7 satisfy Advice Evolution's requirements | Licensee / responsible manager | open |
| A4 | Whether a score may be captured at all, or stays on the attendee's device | Prospa + licensee | open |
| A5 | If captured: lawful basis, privacy notice wording, retention, and whether a score may be referenced in follow-up contact | Prospa + licensee | open |
| A6 | Who may discuss a score with an attendee, and in what setting | Neil Mistry | open |

### Current build position

The instrument is built for **A4 = "stays on the attendee's device"**, which is the most
conservative answer and requires no change if the licensee agrees:

- scoring runs entirely in the browser;
- answers persist only in that browser's `localStorage`, under `prospa:wealth-score`;
- **no network request carries any answer, score or identifier anywhere** — there is no analytics,
  no form post, no third-party script on the page;
- the respondent can clear everything with *Start again*.

If A4 is later decided the other way, capture must be built deliberately, with A5 settled first.
Do not add an email field, an analytics tag or a form post to this instrument without it.

---

*Prepared for Prospa Financial by Team OS, 1 October 2026. Review alongside the licensee before
the instrument is used in a live session.*
