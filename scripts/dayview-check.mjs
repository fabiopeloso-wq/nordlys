// Review des Tagesfensters: öffnen, blättern, Mobile. Voraussetzung: npm run preview.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173/';
const OUT = 'review';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

// Desktop
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

// Tage-Sektion mit Briefing-Button im Band
await page.locator('#tage').scrollIntoViewIfNeeded();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/dv-cards.png` });

// Tag 8 öffnen (mit Plan B)
await page.evaluate(() => document.querySelector('.day-card[data-day="8"]').dispatchEvent(new MouseEvent('click', { bubbles: true })));
await page.waitForTimeout(1600);
await page.screenshot({ path: `${OUT}/dv-day08.png` });

// Pfeil rechts → Tag 9
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/dv-day09.png` });

// Unteres Ende des Panels (Facts, Plan B, Stay, Footer)
await page.evaluate(() => { document.querySelector('.dayview__panel').scrollTop = 9999; });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/dv-day09-foot.png` });

// Esc schliesst
await page.keyboard.press('Escape');
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/dv-closed.png` });
await page.close();

// Mobile
const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
await m.goto(BASE, { waitUntil: 'networkidle' });
await m.waitForTimeout(2000);
await m.evaluate(() => document.querySelector('.day-card[data-day="13"]').dispatchEvent(new MouseEvent('click', { bubbles: true })));
await m.waitForTimeout(1600);
await m.screenshot({ path: `${OUT}/dv-mobile-13.png` });
await m.evaluate(() => { document.querySelector('.dayview__panel').scrollTop = 700; });
await m.waitForTimeout(500);
await m.screenshot({ path: `${OUT}/dv-mobile-13-mid.png` });
await m.evaluate(() => { document.querySelector('.dayview__panel').scrollTop = 99999; });
await m.waitForTimeout(500);
await m.screenshot({ path: `${OUT}/dv-mobile-13-foot.png` });
await m.close();

await browser.close();
console.log('dayview-check fertig');
