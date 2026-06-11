// Gezielter Mobile-Nachcheck der gefixten Sektionen bei 390 und 360 px.
import { chromium } from 'playwright';

const browser = await chromium.launch();
for (const w of [390, 360]) {
  const page = await browser.newPage({ viewport: { width: w, height: 844 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Horizontaler Overflow? (häufigste Mobile-Sünde)
  const overflow = await page.evaluate(() => {
    const bad = [];
    document.querySelectorAll('main *, footer *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > window.innerWidth + 2 || r.left < -2)) {
        if (!el.closest('.days__track') && !el.closest('.maplibregl-map') && !el.closest('.scroll-x') && !el.closest('.thread')) {
          bad.push(`${el.tagName}.${[...el.classList].join('.')} → left ${Math.round(r.left)}, right ${Math.round(r.right)}`);
        }
      }
    });
    return bad.slice(0, 12);
  });
  console.log(`${w}px Overflow:`, overflow.length ? overflow : 'keiner');

  for (const sel of ['#aurora', '#regeln', '#crew', '#budget']) {
    await page.locator(sel).scrollIntoViewIfNeeded();
    await page.waitForTimeout(1100);
    await page.screenshot({ path: `review/fix-${w}-${sel.slice(1)}.png` });
  }
  // Aurora-Guide tiefer: Mond-Panel + Dunkelheits-Tabelle
  await page.evaluate(() => {
    const el = document.querySelector('.moon__events');
    el?.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `review/fix-${w}-moon.png` });
  console.log(`${w}px JS-Fehler:`, errors.length ? errors : 'keine');
  await page.close();
}
await browser.close();
console.log('mobile-check fertig');
