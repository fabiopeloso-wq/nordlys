// Logbuch-Check: startet den Preview-Server selbst, prüft Übersicht + Tagesseite (Rendering,
// Galerie, Lightbox, Deep-Link, Overflow, Konsole/Netz), Screenshots nach review/log/,
// und fragt die Video-URLs im Release an (Range-Requests, sonst kein Spulen).
// Voraussetzung: npm run build. Aufruf: node scripts/log-check.mjs <tag>
// Gegen die Live-Site: node scripts/log-check.mjs <tag> --base https://fabiopeloso-wq.github.io/nordlys/

import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium, webkit } from 'playwright';

const DAY = Number(process.argv[2]);
if (!DAY) {
  console.log('Aufruf: node scripts/log-check.mjs <tag> [--base URL]');
  process.exit(1);
}
const NN = String(DAY).padStart(2, '0');
const PORT = 4173;
const baseArg = process.argv.indexOf('--base');
const LIVE = baseArg > 0 ? process.argv[baseArg + 1].replace(/\/?$/, '/') : null;
const BASE = LIVE ?? `http://localhost:${PORT}/`;
const OUT = 'review/log';
mkdirSync(OUT, { recursive: true });

const manifest = JSON.parse(readFileSync(`src/data/log/tag-${NN}.media.json`, 'utf8'));
const index = JSON.parse(readFileSync('src/data/log/index.json', 'utf8'));
const dayJson = JSON.parse(readFileSync(`src/data/log/tag-${NN}.json`, 'utf8'));
// Zwei Stufen: omit fliegt raus, picks ist die Auswahl, die zuerst steht; «Alle Bilder zeigen» holt den Rest
const omit = new Set(dayJson.omit ?? []);
const all = manifest.items.filter((i) => !omit.has(i.id));
const pickSet = new Set(dayJson.picks ?? []);
const picks = pickSet.size ? all.filter((i) => pickSet.has(i.id)) : all;
const expected = picks;
const curated = picks.length < all.length;
const extra = all.find((i) => !pickSet.has(i.id) && i.type === 'photo');

/** Zeilen schliessen exakt: jede volle Zeile endet innerhalb von 3 px an der Containerkante */
const rowGapOf = (page) =>
  page.locator('.log-gallery').evaluate((el) => {
    const box = el.getBoundingClientRect();
    const W = box.width;
    const tops = new Map();
    for (const n of el.children) {
      const r = n.getBoundingClientRect();
      const t = Math.round(r.top - box.top);
      tops.set(t, Math.max(tops.get(t) ?? 0, r.right - box.left));
    }
    const rights = [...tops.values()];
    rights.pop(); // letzte Zeile darf kürzer sein
    return Math.max(0, ...rights.map((r) => Math.abs(W - r)));
  });

/** Passt das Lightbox-Bild komplett in den Viewport? (Safari löst Prozent-Höhen anders auf) */
const lightboxFits = (page) =>
  page.locator('.lb__img, .lb__video').first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { ok: r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1 && r.height > 100, h: Math.round(r.height), vh: innerHeight };
  });

const fails = [];
const check = (ok, msg) => (ok ? console.log('  ok  ', msg) : (fails.push(msg), console.log('  FAIL', msg)));

// ---- Preview-Server (entfällt gegen die Live-Site) ----
const server = LIVE ? null : spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const deadline = Date.now() + 20000;
let up = false;
while (Date.now() < deadline && !up) {
  try {
    up = (await fetch(BASE)).ok;
  } catch {
    await new Promise((r) => setTimeout(r, 300));
  }
}
if (!up) {
  server?.kill();
  console.error(LIVE ? `${BASE} nicht erreichbar` : 'Preview-Server nicht erreichbar — vorher npm run build?');
  process.exit(1);
}
console.log(`Basis: ${BASE}`);

const browser = await chromium.launch();

async function newPage(viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('requestfailed', (r) => {
    const url = r.url();
    if (/cartocdn|basemaps/.test(url)) return; // Karten-Tiles brauchen Netz — nicht Teil des Checks
    // Schliesst die Lightbox, fliegt das <video> aus dem DOM und sein Metadaten-Request wird abgebrochen — gewollt
    if (r.failure()?.errorText === 'net::ERR_ABORTED' && /release-assets|releases\/download/.test(url)) return;
    errors.push(`${r.failure()?.errorText} — ${url}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().startsWith(BASE)) errors.push(`${r.status()} — ${r.url()}`);
  });
  return { page, errors };
}

// ---- Übersicht ----
console.log('— Übersicht —');
{
  const { page, errors } = await newPage({ width: 1440, height: 900 });
  await page.goto(`${BASE}logbuch.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  check((await page.locator('.log-entry').count()) === 16, '16 Einträge (online + ausstehend)');
  check((await page.locator('.log-entry--online').count()) === index.days.length, `${index.days.length} Einträge online`);
  const latestHref = await page.locator('.log-live__latest').getAttribute('href');
  check(latestHref?.endsWith(index.days[index.days.length - 1].url), 'Neuester-Eintrag-Link zeigt auf den letzten Tag');
  check(await page.locator('.log-entry--online').first().evaluate((el) => getComputedStyle(el).opacity === '1'), 'erste Online-Karte ist ohne Scrollen sichtbar');
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 700) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/index-d.png`, fullPage: true });
  check(errors.length === 0, `Übersicht ohne Fehler${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await page.close();
}

// ---- Tagesseite ----
console.log(`— Tag ${NN} —`);
const URL_DAY = `${BASE}logbuch/tag-${NN}/`;
for (const [label, viewport] of [['d', { width: 1440, height: 900 }], ['m', { width: 390, height: 844 }]]) {
  const { page, errors } = await newPage(viewport);
  await page.goto(URL_DAY, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  check((await page.title()).includes(`Tag ${NN}`), `${label}: Titel`);
  check(await page.locator('.log-hero__media img').evaluate((img) => img.naturalWidth > 0), `${label}: Hero-Bild geladen`);
  const items = await page.locator('.lg-item').count();
  check(items === expected.length, `${label}: ${items}/${expected.length} Galerie-Kacheln in der Auswahl (${all.length} gesamt, ${omit.size} ausgelassen)`);
  await page.locator('.log-gallery').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  check(await page.locator('.log-gallery').evaluate((el) => el.classList.contains('is-laid-out')), `${label}: Galerie-Layout berechnet`);
  const rowGap = await rowGapOf(page);
  check(rowGap <= 3, `${label}: Galerie-Zeilen schliessen bündig (max. ${rowGap}px Abweichung)`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 1, `${label}: kein horizontaler Overflow (${overflow}px)`);

  // Screenshots: scroll-behavior ist smooth → immer «instant» springen und kurz warten
  const jump = async (y) => {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(500);
  };
  await jump(0);
  await page.screenshot({ path: `${OUT}/tag-${NN}-${label}-hero.png` });
  await jump(await page.locator('#bilder').evaluate((el) => el.getBoundingClientRect().top + window.scrollY - 40));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/tag-${NN}-${label}-galerie.png` });
  if (label === 'd') {
    // Reveals auslösen: einmal durch die ganze Seite scrollen, dann die Gesamtaufnahme
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += 700) await jump(y);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/tag-${NN}-${label}-full.png`, fullPage: true });
    await jump(0);
  }

  // Lightbox — mit einem Hochformat, das ist der kritische Fall fürs Einpassen
  const portrait = expected.find((i) => i.type === 'photo' && i.h > i.w) ?? expected[0];
  await page.locator(`.lg-item[data-id="${portrait.id}"]`).click();
  await page.waitForTimeout(500);
  check(await page.locator('.lb.is-open').isVisible(), `${label}: Lightbox öffnet`);
  check((await page.evaluate(() => location.hash)) === `#${portrait.id}`, `${label}: Hash zeigt auf das Bild`);
  const fit = await lightboxFits(page);
  check(fit.ok, `${label}: Lightbox-Bild passt in den Viewport (${fit.h}px von ${fit.vh}px)`);
  if (expected.length > 1) {
    const count1 = await page.locator('[data-lb-count]').textContent();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(350);
    const count2 = await page.locator('[data-lb-count]').textContent();
    check(count1 !== count2, `${label}: → blättert (${count1} → ${count2})`);
  } else {
    // Nur ein Bild: blättern gibt es nicht — beide Pfeile müssen deaktiviert sein
    check(await page.locator('.lb__arrow--next').isDisabled(), `${label}: einziges Bild — Pfeil «→» deaktiviert`);
  }
  await page.screenshot({ path: `${OUT}/tag-${NN}-${label}-lightbox.png` });
  await page.keyboard.press('Escape');
  check(await page.locator('.lb').waitFor({ state: 'hidden', timeout: 2000 }).then(() => true, () => false), `${label}: Esc schliesst`);
  check((await page.evaluate(() => location.hash)) === '', `${label}: Hash nach Schliessen leer`);

  // Video in der Lightbox
  const video = expected.find((i) => i.type === 'video');
  if (video) {
    await page.locator(`.lg-item[data-id="${video.id}"]`).click();
    await page.waitForTimeout(400);
    check((await page.locator('.lb video').count()) === 1, `${label}: Video-Element mit Poster`);
    check(await page.locator('.lb video').evaluate((v) => v.poster.length > 0 && !v.autoplay), `${label}: Video hat Poster, kein Autoplay`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  // «Alle Bilder zeigen»: aufklappen, Lightbox blättert über alles, zuklappen
  if (curated) {
    const more = page.locator('[data-log-more]');
    await more.scrollIntoViewIfNeeded();
    await more.click();
    await page.waitForTimeout(700);
    const n = await page.locator('.lg-item').count();
    check(n === all.length, `${label}: «Alle Bilder zeigen» → ${n}/${all.length} Kacheln`);
    check(await page.locator('.log-gallery').evaluate((el) => el.classList.contains('is-laid-out')), `${label}: Layout nach dem Aufklappen berechnet`);
    const gapAll = await rowGapOf(page);
    check(gapAll <= 3, `${label}: Zeilen auch aufgeklappt bündig (max. ${gapAll}px)`);
    if (extra) {
      await page.locator(`.lg-item[data-id="${extra.id}"]`).scrollIntoViewIfNeeded();
      await page.locator(`.lg-item[data-id="${extra.id}"]`).click();
      await page.waitForTimeout(500);
      const cnt = await page.locator('[data-lb-count]').textContent();
      check(cnt?.endsWith('/' + String(all.length).padStart(2, '0')), `${label}: Lightbox zählt aufgeklappt über alle (${cnt})`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
    if (label === 'd') {
      await page.locator('#bilder').scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${OUT}/tag-${NN}-${label}-alle.png` });
    }
    await more.scrollIntoViewIfNeeded();
    await more.click();
    await page.waitForTimeout(700);
    check((await page.locator('.lg-item').count()) === expected.length, `${label}: «Nur die Auswahl» → zurück auf ${expected.length}`);
  }

  check(errors.length === 0, `${label}: keine Konsolen-/Netzwerkfehler${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
  await page.close();
}

// Deep-Link
{
  const { page } = await newPage({ width: 1200, height: 800 });
  const target = expected[Math.min(2, expected.length - 1)].id;
  await page.goto(`${URL_DAY}#${target}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  check(await page.locator('.lb.is-open').isVisible(), `Deep-Link #${target} öffnet die Lightbox`);
  check((await page.locator('[data-lb-count]').textContent()) === `${String(expected.findIndex((i) => i.id === target) + 1).padStart(2, '0')}/${String(expected.length).padStart(2, '0')}`, 'Deep-Link zeigt das richtige Bild');
  await page.close();
  if (extra) {
    // Bild ausserhalb der Auswahl: der Link muss die Galerie zuerst aufklappen
    const { page: p2 } = await newPage({ width: 1200, height: 800 });
    await p2.goto(`${URL_DAY}#${extra.id}`, { waitUntil: 'networkidle' });
    await p2.waitForTimeout(700);
    check(await p2.locator('.lb.is-open').isVisible(), `Deep-Link #${extra.id} (nicht in der Auswahl) öffnet die Lightbox`);
    check((await p2.locator('.lg-item').count()) === all.length, 'Deep-Link ausserhalb der Auswahl klappt die Galerie auf');
    await p2.close();
  }
}

// Ausgelassene Medien dürfen nirgends auftauchen
{
  const { page } = await newPage({ width: 1200, height: 800 });
  await page.goto(URL_DAY, { waitUntil: 'networkidle' });
  if (curated) {
    await page.locator('[data-log-more]').click();
    await page.waitForTimeout(500);
  }
  const leaked = await page.evaluate((ids) => ids.filter((id) => document.querySelector(`.lg-item[data-id="${id}"]`)), [...omit]);
  check(leaked.length === 0, `omit greift${leaked.length ? ': ' + leaked.join(', ') + ' sichtbar' : ''}`);
  await page.close();
}

// Hauptseite: Logbuch-Pill
{
  const { page } = await newPage({ width: 1440, height: 900 });
  await page.goto(`${BASE}index.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  check(await page.locator('.topnav-log').isVisible(), 'Logbuch-Pill auf der Hauptseite sichtbar');
  check(await page.locator('.topnav').isVisible(), 'Proviant-Knopf weiterhin sichtbar');
  const href = await page.locator('.topnav-log').getAttribute('href');
  check(href?.endsWith(index.days[index.days.length - 1].url), 'Pill führt auf den neuesten Eintrag');
  await page.locator('.topbar').screenshot({ path: `${OUT}/topbar.png` });
  await page.close();
}

await browser.close();

// ---- WebKit (Safari-Verhalten): Lightbox-Einpassung auf Laptop-Grössen ----
console.log('— WebKit / Safari —');
try {
  const wk = await webkit.launch();
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }]) {
    const page = await wk.newPage({ viewport });
    await page.goto(URL_DAY, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    const portrait = expected.find((i) => i.type === 'photo' && i.h > i.w) ?? expected[0];
    await page.locator(`.lg-item[data-id="${portrait.id}"]`).click();
    await page.waitForTimeout(600);
    const fit = await lightboxFits(page);
    check(fit.ok, `webkit ${viewport.width}×${viewport.height}: Lightbox-Bild passt in den Viewport (${fit.h}px von ${fit.vh}px)`);
    await page.screenshot({ path: `${OUT}/tag-${NN}-webkit-${viewport.width}-lightbox.png` });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(overflow <= 1, `webkit ${viewport.width}: kein horizontaler Overflow (${overflow}px)`);
    await page.close();
  }
  await wk.close();
} catch (e) {
  check(false, `WebKit nicht verfügbar (npx playwright install webkit): ${e.message.split('\n')[0]}`);
}

server?.kill();

// ---- Videos im Release: erreichbar + Range-Requests ----
console.log('— Videos im Release —');
for (const v of all.filter((i) => i.type === 'video')) {
  try {
    const res = await fetch(v.src, { headers: { Range: 'bytes=0-1023' } });
    const ok = res.status === 206 || res.headers.get('accept-ranges') === 'bytes';
    check(ok, `${v.id}: ${res.status} ${ok ? 'Range ok' : 'kein Range-Support'} (${v.src.split('/').pop()})`);
  } catch (e) {
    check(false, `${v.id}: ${e.message}`);
  }
}

// ---- Daten-Konsistenz ----
console.log('— Daten —');
check(manifest.items.some((i) => i.id === dayJson.hero), `hero «${dayJson.hero}» existiert`);
const badCaptions = Object.keys(dayJson.captions ?? {}).filter((id) => !manifest.items.some((i) => i.id === id));
check(badCaptions.length === 0, `Captions verweisen auf existierende IDs${badCaptions.length ? ': ' + badCaptions.join(', ') : ''}`);
const badPicks = (dayJson.picks ?? []).filter((id) => !manifest.items.some((i) => i.id === id) || omit.has(id));
check(badPicks.length === 0, `picks existieren und stehen nicht in omit${badPicks.length ? ': ' + badPicks.join(', ') : ''}`);

console.log(fails.length ? `\n${fails.length} FEHLER:\n- ${fails.join('\n- ')}` : `\nlog-check Tag ${NN}: alles gruen`);
process.exit(fails.length ? 1 : 0);
