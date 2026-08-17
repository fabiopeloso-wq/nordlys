// Kurzer Live-Test gegen die deployte Seite (GitHub Pages).
// Aufruf: node scripts/live-check.mjs [basis-url]

import { chromium } from 'playwright';

const BASE = process.argv[2] || 'https://fabiopeloso-wq.github.io/nordlys/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('requestfailed', (r) => errors.push(`${r.failure()?.errorText} — ${r.url()}`));

await page.goto(new URL('proviant.html', BASE).href, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const days = await page.locator('.menu-day').count();
const lists = await page.locator('.shop-list').count();
const boxes = await page.locator('input[data-fd]').count();
const styled = await page.locator('.subhero__title').evaluate((el) => getComputedStyle(el).fontSize);

console.log(`Menü-Tage:      ${days}`);
console.log(`Einkaufslisten: ${lists}`);
console.log(`Positionen:     ${boxes}`);
console.log(`CSS geladen:    ${styled} (Titel)`);
console.log(errors.length ? `FEHLER:\n- ${errors.join('\n- ')}` : 'Keine Konsolen-/Netzwerkfehler');

await page.screenshot({ path: 'review/live-proviant.png', fullPage: false });
await browser.close();

const ok = days === 16 && lists === 9 && boxes === 86 && errors.length === 0;
console.log(ok ? '\nlive-check: alles gruen' : '\nlive-check: FEHLGESCHLAGEN');
process.exit(ok ? 0 : 1);
