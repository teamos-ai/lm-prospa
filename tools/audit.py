#!/usr/bin/env python3
"""Static audit across every sheet.

Twelve documents maintained by twelve different hands drift in twelve different
ways. This catches the drifts that are objectively checkable — a dead image path,
a widget imported that does not exist, a raw hex where a token belongs, a network
call on a page whose whole promise is that nothing leaves the browser.

It does NOT judge design. Run it, then look at the pages.

    python3 tools/audit.py
"""
import re, os, sys, pathlib, json

ROOT = pathlib.Path(__file__).resolve().parent.parent
MAG = sorted((ROOT / 'magnets').glob('*.html'))
PAGES = [ROOT / 'index.html'] + MAG

BRAND_HEX = re.compile(r'#(?:135f69|0f4c54|0a363c|5dce38|4eb52d|c65a1e|a8481a|d0dfe1)', re.I)
NET = re.compile(r'\b(?:fetch\s*\(|XMLHttpRequest|navigator\.sendBeacon|<form[^>]+action=|gtag\(|dataLayer|googletagmanager|analytics)', re.I)
ALLOWED_HOSTS = {'fonts.googleapis.com', 'fonts.gstatic.com', 'www.prospafinancial.com.au',
                 'prospafinancial.com.au', 'www.ato.gov.au', 'ato.gov.au', 'www.legislation.gov.au',
                 'moneysmart.gov.au', 'www.moneysmart.gov.au', 'asic.gov.au', 'www.asic.gov.au'}

def exports(path):
    if not path.exists():
        return set()
    src = path.read_text()
    out = set()
    for m in re.finditer(r'export\s+(?:const|function|let|class)\s+([A-Za-z_$][\w$]*)', src):
        out.add(m.group(1))
    for m in re.finditer(r'export\s*\{([^}]*)\}', src):
        out |= {n.split(' as ')[-1].strip() for n in m.group(1).split(',') if n.strip()}
    return out

MODULES = {n: exports(ROOT / 'assets' / f'{n}.js') for n in
           ('sheet', 'widgets', 'components', 'model')}

problems, notes = [], []
def bad(p, msg): problems.append(f'{p.name}: {msg}')
def note(p, msg): notes.append(f'{p.name}: {msg}')

for p in PAGES:
    s = p.read_text()
    # Strip comments before scanning markup: both HTML comments and JS block
    # comments carry illustrative snippets like `<img …>` that are prose, not tags.
    scan = re.sub(r'<!--.*?-->', '', s, flags=re.S)
    scan = re.sub(r'/\*.*?\*/', '', scan, flags=re.S)

    # --- images resolve ---
    for src in (re.findall(r'<img[^>]+src="([^"]+)"', scan)
                + re.findall(r"src: '([^']*\.webp)'", scan)
                + re.findall(r"art: '([^']+)'", scan)):
        if src.startswith(('http', 'data:')) or '${' in src:
            continue  # template literal, resolved at runtime
        # A bare filename is a key in a data object whose template supplies the
        # folder, so try every folder an image can legitimately live in.
        roots = [p.parent, ROOT / 'assets' / 'img',
                 ROOT / 'assets' / 'img' / 'photo', ROOT / 'assets' / 'img' / 'art']
        if not any((r / src).resolve().exists() for r in roots):
            bad(p, f'image not found: {src}')

    # --- every img has an alt attribute at all ---
    for tag in re.findall(r'<img\b[^>]*>', scan):
        if 'alt=' not in tag:
            bad(p, f'img with no alt attribute: {tag[:90]}')

    # --- imports actually exist ---
    for mod, names in re.findall(r"import\s*\{([^}]+)\}\s*from\s*'[^']*/(\w+)\.js'", s):
        have = MODULES.get(names, set())
        for n in (x.split(' as ')[0].strip() for x in mod.split(',')):
            if n and have and n not in have:
                bad(p, f'imports {n!r} from {names}.js, which does not export it')

    # --- raw brand hex instead of a token ---
    body = re.sub(r'<!--.*?-->', '', s, flags=re.S)
    for h in set(BRAND_HEX.findall(body)):
        bad(p, f'raw brand hex {h} — use the token')

    # --- nothing leaves the browser ---
    for m in NET.findall(s):
        bad(p, f'possible network call or analytics: {m!r}')
    for host in set(re.findall(r'https?://([a-z0-9.\-]+)', s, re.I)):
        if host.lower() not in ALLOWED_HOSTS:
            bad(p, f'unexpected external host: {host}')

    # --- ember at most once per page ---
    n_ember = len(re.findall(r'var\(--ember(?:-strong|-soft)?\)', s))
    if n_ember > 14:
        note(p, f'--ember referenced {n_ember} times; it is meant to be the one warm accent')

    # --- the shell is intact ---
    if p.name != 'index.html':
        for hook in ('data-sheet-masthead', 'data-sheet-foot'):
            if hook not in s:
                bad(p, f'missing {hook}')
        if 'data-sheet-hero' not in s:
            bad(p, 'no hero band (data-sheet-hero)')
        elif 'hero:' not in s:
            bad(p, 'data-sheet-hero present but mountSheet declares no hero')
        # The general-advice warning and the AFSL line are rendered into the
        # footer by mountSheet, so they are never in the page source. What a
        # sheet owes locally is its own limitations block.
        if 'class="disclaimer"' not in s:
            bad(p, 'no local .disclaimer block')
        if 'data-sheet-foot' in s and 'mountSheet(' not in s:
            bad(p, 'footer hook present but mountSheet is never called — no AFSL line will render')

    # --- print rules for anything heavy that was invented locally ---
    if '@media print' not in s and p.name != 'index.html':
        note(p, 'no local @media print block (may be fine — the global sheet covers the basics)')

print(f'{len(PAGES)} pages · {sum(len(v) for v in MODULES.values())} module exports known\n')
if problems:
    print(f'PROBLEMS ({len(problems)})')
    for x in problems: print('  ✗', x)
else:
    print('PROBLEMS (0)  — none')
if notes:
    print(f'\nNOTES ({len(notes)})')
    for x in notes: print('  ·', x)
sys.exit(1 if problems else 0)
