// Interaktions-Probe: Karte, Packliste (localStorage), Budget-Rechner, Easter Egg.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

// 1 · Karte: Marker für Tag 5 klicken → Panel zeigt Etappe
await page.locator('#route').scrollIntoViewIfNeeded();
await page.waitForTimeout(2500);
await page.locator('.map-marker[aria-label*="Tag 5"]').first().click({ force: true });
await page.waitForTimeout(600);
const panelTitle = await page.locator('.route__panel-title').textContent();
console.log('1 Panel nach Marker-Klick:', JSON.stringify(panelTitle));
await page.screenshot({ path: 'review/i-panel.png' });

// 2 · Route-Toggle: nur Rückweg
await page.locator('button[data-leg="back"]').click();
await page.waitForTimeout(700);
await page.screenshot({ path: 'review/i-toggle-back.png' });

// 3 · Budget: Verbrauch auf 7.0 → Total muss sinken
await page.locator('#budget').scrollIntoViewIfNeeded();
await page.waitForTimeout(1200);
const before = await page.locator('[data-out="pp"]').textContent();
await page.fill('[data-bf="consumption"]', '7');
await page.waitForTimeout(900);
const after = await page.locator('[data-out="pp"]').textContent();
console.log('2 Budget pp vorher/nachher:', before, '→', after);

// 4 · Packliste: 2 Häkchen setzen, neu laden, prüfen
await page.locator('#packen').scrollIntoViewIfNeeded();
await page.waitForTimeout(1000);
await page.locator('input[data-pk="schlafen-zelte"]').check({ force: true });
await page.locator('input[data-pk="kueche-kocher"]').check({ force: true });
await page.waitForTimeout(400);
const count1 = await page.locator('[data-pk-total]').textContent();
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1800);
const persisted = await page.evaluate(() => localStorage.getItem('nordlys:packing.v1'));
const checked = await page.locator('input[data-pk="schlafen-zelte"]').isChecked();
console.log('3 Packliste:', count1, '| persisted:', persisted, '| nach Reload checked:', checked);

// 5 · Easter Egg: 5× Polarstern
await page.locator('#footer').scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
for (let i = 0; i < 5; i++) await page.locator('.footer__star').click();
await page.waitForTimeout(600);
const toast = await page.locator('.footer__toast').textContent();
console.log('4 Easter Egg Toast:', JSON.stringify(toast));
await page.screenshot({ path: 'review/i-footer-egg.png' });

// 6 · Faden sichtbar? (Pixelprobe am linken Rand bei #crew)
await page.locator('#crew').scrollIntoViewIfNeeded();
await page.waitForTimeout(1200);
await page.screenshot({ path: 'review/i-crew-thread.png' });

console.log('JS-Fehler:', errors.length ? errors : 'keine');
await browser.close();
