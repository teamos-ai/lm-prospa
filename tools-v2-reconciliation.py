# Reconcile the client's worked example against a correct implementation of their own model.
def pv_annuity(pmt, rate, n):
    """PV of n payments of pmt, first payment at the start of year 1, discounted at rate."""
    if n <= 0: return 0.0
    if rate == 0: return pmt * n
    return pmt * (1 - (1+rate)**-n) / rate

def fv(current, monthly, annual_rate, years):
    """Monthly contributions, monthly compounding."""
    m = annual_rate/12; n = int(round(years*12))
    if m == 0: return current + monthly*n
    return current*(1+m)**n + monthly*((1+m)**n - 1)/m

print("=== CLIENT'S WORKED EXAMPLE ===")
print("age 40 -> work optional 50 -> super 60; $80k/yr; $150k now; $3k/mo; 6%; inflation 2.5%")
print()

# Their stated numbers
print("Client states:  Required $720,000 | Projected $665,000 | Gap $55,000 | 92% funded")
print("  665/720 =", round(665000/720000*100,1), "% -- internally consistent with each other")
print()

# --- Work Optional Number, several readings of their spec ---
bridge = 10
infl, ret = 0.025, 0.06
real = (1+ret)/(1+infl) - 1
print("a) Flat sum, no returns, no inflation:      ", round(80000*bridge))
print("b) Real terms (today's $), real return:     ", round(pv_annuity(80000, real, bridge)))
print("c) Income inflated to age 50, then real:    ", round(pv_annuity(80000*(1+infl)**10, real, bridge)))
print("d) Income inflated to 50, nominal discount: ", round(pv_annuity(80000*(1+infl)**10, ret, bridge)))
print("   -> none equals $720,000; closest is (b) at", round(pv_annuity(80000, real, bridge)))
print()

# --- Projected portfolio ---
print("Projected portfolio at 50 from $150k + $3k/mo at 6%:")
print("  monthly compounding:", round(fv(150000, 3000, 0.06, 10)))
print("  annual approximation:", round(150000*1.06**10 + 36000*((1.06**10-1)/0.06)))
print("  -> client says $665,000; neither matches")
print()

print("=== WHAT A CORRECT IMPLEMENTATION GIVES ON THEIR INPUTS ===")
req = pv_annuity(80000*(1+infl)**10, real, bridge)   # need at 50, in age-50 dollars
proj = fv(150000, 3000, 0.06, 10)
print("  Work Optional Number (age-50 dollars): ", round(req))
print("  Projected portfolio:                   ", round(proj))
print("  Gap:                                   ", round(proj-req), "(surplus)" if proj>req else "(shortfall)")
print("  Funded:                                ", round(proj/req*100), "%")
print()

# --- Required monthly to exactly hit the number ---
def required_monthly(current, target, annual_rate, years):
    m = annual_rate/12; n = int(round(years*12))
    if n == 0: return None
    if m == 0: return max(0,(target-current)/n)
    return max(0.0, (target - current*(1+m)**n) * m / ((1+m)**n - 1))
rm = required_monthly(150000, req, 0.06, 10)
print("  Required monthly:", round(rm), "vs $3,000 ->", round(rm-3000), "more per month")
print("  check: fv with required =", round(fv(150000, rm, 0.06, 10)), "vs target", round(req))
print()

# --- Work optional age on the current strategy ---
def work_optional_age(age, super_age, spend, current, monthly, ret, infl, maxage=75):
    realr = (1+ret)/(1+infl)-1
    for a in range(age, maxage+1):
        yrs = a - age
        br = max(super_age - a, 0)
        if br == 0: return a          # at/after super age the bridge is nil
        need = pv_annuity(spend*(1+infl)**yrs, realr, br)
        if fv(current, monthly, ret, yrs) >= need: return a
    return None
print("  Work optional age on current strategy:", work_optional_age(40,60,80000,150000,3000,0.06,0.025))
print()

# --- Reduced income the projection actually supports ---
def supported_income(portfolio, bridge_years, ret, infl, at_age_dollars=True):
    realr = (1+ret)/(1+infl)-1
    f = pv_annuity(1, realr, bridge_years)
    return portfolio / f if f else 0
si = supported_income(proj, bridge, ret, infl)
print("  Income the projection supports (age-50 $):", round(si))
print("  ... in today's dollars:", round(si/(1+infl)**10))
print()

# --- Drawdown to super access, then longevity ---
def drawdown(balance, spend_at_start, years, ret, infl):
    """Draw an inflating income for `years`; return (end balance, age offset it ran out or None)."""
    b, s = balance, spend_at_start
    for k in range(years):
        b = b - s
        if b < 0: return 0.0, k
        b *= (1+ret); s *= (1+infl)
    return b, None
rem, ranout = drawdown(proj, 80000*(1+infl)**10, bridge, ret, infl)
print("  Remaining at super age:", round(rem), "| ran out in year:", ranout)
print()

def longevity(pool, spend_at_start, ret, infl, from_age, cap=110):
    b, s = pool, spend_at_start
    for a in range(from_age, cap):
        b = b - s
        if b < 0: return a
        b *= (1+ret); s *= (1+infl)
    return None
super60 = 1300000
pool = rem + super60
spend60 = 80000*(1+infl)**20
print("  Combined at 60:", round(pool), "| desired income then:", round(spend60))
print("  Portfolio lasts to approximately age:", longevity(pool, spend60, 0.05, 0.025, 60))
