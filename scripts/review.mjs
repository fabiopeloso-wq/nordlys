// Selbst-Review: Screenshots aller Sektionen bei 1440 px und 390 px via Playwright.
// Voraussetzung: npm run preview läuft (Port 4173). Aufruf: node scripts/review.mjs

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173/';
const OUT = 'review';
mkdirSync(OUT, { recursive: true });

const SECTIONS = ['#hero', '#crew', '#route', '#tage', '#regeln', '#budget', '#aurora', '#packen', '#footer'];

const browser = await chromium.launch();

async function run(label, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  for (const sel of SECTIONS) {
    const el = sel === '#hero' ? null : page.locator(sel);
    if (el) {
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1400);
    }
    const name = `${OUT}/${label}-${sel.slice(1)}.png`;
    await page.screenshot({ path: name });
    console.log('shot', name);
  }
  // Pinned Tage-Sektion: zusätzlich mitten ins Band scrollen (nur Desktop)
  if (viewport.width > 1024) {
    const y = await page.evaluate(() => {
      const el = document.querySelector('#tage');
      return el.getBoundingClientRect().top + window.scrollY;
    });
    await page.evaluate((t) => window.scrollTo(0, t + window.innerHeight * 1.4), y);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/${label}-tage-mid.png` });
    console.log('shot tage-mid');
  }
  await page.close();
}

await run('d', { width: 1440, height: 900 });
await run('m', { width: 390, height: 844 });
await browser.close();
console.log('review fertig');
