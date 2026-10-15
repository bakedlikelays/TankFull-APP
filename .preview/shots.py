"""Screenshot every screen in the preview build. Usage: python3 shots.py [name-filter]"""
import sys, os
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5199/'
OUT = os.path.join(os.path.dirname(__file__), 'shots')
os.makedirs(OUT, exist_ok=True)
PHONE = dict(width=390, height=844)
DESK = dict(width=1360, height=900)

def click(text):
    return lambda p: p.get_by_role('button', name=text).first.click()

SHOTS = [
    ('login', 'out', PHONE, []),
    ('onboarding', 'new', PHONE, []),
    ('route', 'driver', PHONE, []),
    ('stop', 'driver', PHONE, [click('Continue stop 2')]),
    ('fill', 'driver', PHONE, [click('Log a fill')]),
    ('board', 'owner', DESK, []),
    ('board-phone', 'owner', PHONE, []),
    ('customers', 'owner', DESK, [click('Customers'), click('Linda Hart')]),
    ('leads', 'owner', DESK, [click('Leads')]),
    ('company', 'owner', PHONE, [click('Company')]),
    ('portal', 'customer', PHONE, []),
]

flt = sys.argv[1] if len(sys.argv) > 1 else ''
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for name, who, vp, steps in SHOTS:
        if flt and flt not in name:
            continue
        pg = b.new_page(viewport=vp, device_scale_factor=1)
        pg.emulate_media(reduced_motion='reduce')
        pg.goto(BASE + '?as=' + who)
        pg.wait_for_timeout(700)
        try:
            for s in steps:
                s(pg); pg.wait_for_timeout(400)
        except Exception as e:
            print(name, 'step failed:', e)
        pg.screenshot(path=f'{OUT}/{name}.png', full_page=True)
        print('shot', name)
        pg.close()
    b.close()
