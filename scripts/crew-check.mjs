// Einmal-Probe der Crew-Akten: öffnen, wechseln, Escape, Mobile.
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:5173/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

// 1 · Karten im Ausgangszustand
await page.locator('#crew').scrollIntoViewIfNeeded();
await page.waitForTimeout(1200);
await page.screenshot({ path: 'review/crew-cards.png' });

// 2 · Akte Fabio öffnen
await page.locator('[data-crew="fabio"]').click();
await page.waitForTimeout(1400);
const title = await page.locator('.crew__dossier-title').textContent();
const expanded = await page.locator('[data-crew="fabio"] .crew__open').getAttribute('aria-expanded');
console.log('1 Akte Fabio:', JSON.stringify(title), '| aria-expanded:', expanded);
await page.screenshot({ path: 'review/crew-dossier-fabio.png' });

// 3 · Wechsel zu Giannino (Spalte 3 → Panel + Notch müssen wandern)
await page.locator('[data-crew="giannino"]').click();
await page.waitForTimeout(1600);
const title2 = await page.locator('.crew__dossier-title').textContent();
const notchX = await page.locator('.crew__dossier').evaluate((el) => el.style.getPropertyValue('--notch-x'));
console.log('2 Wechsel zu:', JSON.stringify(title2), '| notch-x:', notchX);
await page.screenshot({ path: 'review/crew-dossier-giannino.png' });

// 4 · Escape schliesst
await page.keyboard.press('Escape');
await page.waitForTimeout(800);
const hidden = await page.locator('.crew__dossier').evaluate((el) => el.hidden);
console.log('3 Nach Escape hidden:', hidden);

// 5 · Mobile: Akte Michi (Panel muss direkt unter der Karte liegen)
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(800);
await page.locator('#crew').scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await page.locator('[data-crew="michi"]').click();
await page.waitForTimeout(1400);
await page.locator('.crew__dossier').scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
await page.screenshot({ path: 'review/crew-dossier-mobile.png', fullPage: false });

console.log('JS-Fehler:', errors.length ? errors : 'keine');
await browser.close();
