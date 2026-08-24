// Proviant-Subseite: Screenshots + Smoke-Test (Häkchen, Fortschritt, Persistenz, Reset).
// Voraussetzung: npm run preview läuft (Port 4173). Aufruf: node scripts/proviant-check.mjs

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173/proviant.html';
const OUT = 'review';
mkdirSync(OUT, { recursive: true });

const SECTIONS = ['top', '#regeln', '#menue', '#einkauf', '#listen', '#kueche'];
const browser = await chromium.launch();
const fails = [];
const check = (ok, msg) => (ok ? console.log('  ok  ', msg) : (fails.push(msg), console.log('  FAIL', msg)));

async function shots(label, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  for (const sel of SECTIONS) {
    if (sel !== 'top') {
      await page.locator(sel).scrollIntoViewIfNeeded();
      await page.waitForTimeout(700);
    }
    const name = `${OUT}/prov-${label}-${sel.replace('#', '')}.png`;
    await page.screenshot({ path: name });
    console.log('shot', name);
  }
  // Überlauf-Kontrolle: nichts darf horizontal aus dem Viewport laufen
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 1, `${label}: kein horizontaler Overflow (${overflow}px)`);
  await page.close();
}

console.log('— Screenshots —');
await shots('d', { width: 1440, height: 900 });
await shots('m', { width: 390, height: 844 });

console.log('— Smoke-Test —');
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE, { waitUntil: 'networkidle' });

// Gerendert?
check((await page.locator('.menu-day').count()) === 16, '16 Menü-Tage gerendert');
check((await page.locator('.shop-card').count()) === 10, '10 Einkaufs-Karten gerendert');
check((await page.locator('.shop-list').count()) === 10, '10 Einkaufslisten gerendert');
const boxes = await page.locator('input[data-fd]').count();
check(boxes > 60, `${boxes} Positionen auf den Listen`);
check((await page.locator('[data-fd-total]').textContent()) === `0/${boxes}`, 'Gesamtzähler startet bei 0');

// Anker der Einkaufs-Karten zeigen auf existierende Listen
const brokenAnchors = await page.evaluate(() =>
  [...document.querySelectorAll('.shop-card')].filter((a) => !document.querySelector(a.getAttribute('href'))).length);
check(brokenAnchors === 0, 'alle Einkaufs-Karten verlinken auf eine Liste');

// Häkchen setzen → Zähler + Persistenz
await page.locator('input[data-fd]').first().check();
await page.locator('input[data-fd]').nth(1).check();
check((await page.locator('[data-fd-total]').textContent()) === `2/${boxes}`, 'Zähler nach 2 Häkchen');
await page.reload({ waitUntil: 'networkidle' });
check((await page.locator('[data-fd-total]').textContent()) === `2/${boxes}`, 'Häkchen überleben den Reload (localStorage)');

// Liste komplett → is-done
await page.locator('#liste-e6 input[data-fd]').evaluateAll((els) =>
  els.forEach((el) => { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); }));
check(await page.locator('#liste-e6').evaluate((el) => el.classList.contains('is-done')), 'volle Liste wird als erledigt markiert');

// Zweistufiger Reset
await page.locator('[data-fd-reset]').click();
check((await page.locator('[data-fd-reset]').textContent()).includes('Sicher'), 'Reset fragt nach');
await page.locator('[data-fd-reset]').click();
check((await page.locator('[data-fd-total]').textContent()) === `0/${boxes}`, 'Reset leert alle Häkchen');

// Rückweg zur Hauptseite
await page.locator('.subhero__back').click();
await page.waitForLoadState('networkidle');
check(page.url().endsWith('index.html'), 'Zurück-Link führt auf die Hauptseite');

// Der fixe Proviant-Knopf: im Hero da, nach dem Scrollen immer noch da, ohne die HUD zu treffen
check(await page.locator('.topnav').isVisible(), 'Proviant-Knopf im Hero sichtbar');
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.55));
await page.waitForTimeout(1500);
check(await page.locator('.topnav').isVisible(), 'Proviant-Knopf bleibt beim Scrollen sichtbar');
const [nav, hud] = [await page.locator('.topnav').boundingBox(), await page.locator('.hud').boundingBox()];
const overlap = nav && hud && !(nav.y + nav.height < hud.y || hud.y + hud.height < nav.y
  || nav.x + nav.width < hud.x || hud.x + hud.width < nav.x);
check(!overlap, 'Proviant-Knopf überlappt die HUD nicht');
await page.screenshot({ path: `${OUT}/prov-topnav.png` });

await page.locator('.jump-card').scrollIntoViewIfNeeded();
await page.waitForTimeout(1200);
check(await page.locator('.jump-card').isVisible(), 'Sprungkarte auf der Hauptseite sichtbar');
await page.locator('.jump-card').screenshot({ path: `${OUT}/prov-jump-card.png` });

await page.locator('.topnav').click();
await page.waitForLoadState('networkidle');
check(page.url().endsWith('proviant.html'), 'Proviant-Knopf führt auf die Subseite');

await page.close();
await browser.close();

console.log(fails.length ? `\n${fails.length} FEHLER:\n- ${fails.join('\n- ')}` : '\nproviant-check: alles gruen');
process.exit(fails.length ? 1 : 0);
