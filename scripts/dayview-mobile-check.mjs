// Mobile-Gründlichkeitscheck fürs Tagesfenster: 390 px und 360 px.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173/';
const OUT = 'review';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

for (const width of [390, 360]) {
  const page = await browser.newPage({ viewport: { width, height: 844 }, hasTouch: true, isMobile: true });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Tageskarten mit Briefing-Button
  await page.locator('.day-card[data-day="2"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/dvm-${width}-cards.png` });

  // Per Tap öffnen (echter Touch statt JS-Klick)
  await page.locator('.day-card[data-day="2"] .day-card__open').tap();
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${OUT}/dvm-${width}-open.png` });

  // Inhalt scrollen
  await page.evaluate(() => { document.querySelector('.dayview__panel').scrollTop = 600; });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/dvm-${width}-mid.png` });

  // Weiter zu Tag 3 über den Fuss-Button
  await page.evaluate(() => { document.querySelector('.dayview__panel').scrollTop = 99999; });
  await page.waitForTimeout(400);
  await page.locator('[data-dv-next]').tap();
  await page.waitForTimeout(1100);
  await page.screenshot({ path: `${OUT}/dvm-${width}-next.png` });

  // Schliessen über den Sticky-Button
  await page.locator('.dayview__close').tap();
  await page.waitForTimeout(700);
  const hidden = await page.evaluate(() => document.querySelector('.dayview').hidden);
  const lock = await page.evaluate(() => document.documentElement.classList.contains('dv-lock'));
  console.log(`${width}px: geschlossen=${hidden}, lock entfernt=${!lock}`);
  await page.screenshot({ path: `${OUT}/dvm-${width}-closed.png` });
  await page.close();
}

await browser.close();
console.log('mobile-check fertig');
