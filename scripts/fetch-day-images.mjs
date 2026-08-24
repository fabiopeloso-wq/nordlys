// Tagesbilder von Wikimedia Commons — zweistufig:
//   node scripts/fetch-day-images.mjs candidates  → Kandidaten-Thumbs + Kontaktbögen nach review/day-images/
//   node scripts/fetch-day-images.mjs final       → gewählte Bilder (PICKS) in 1600px als WebP nach public/img/days/
//   Optional als drittes Argument eine Tagesliste, z. B. `final 5,6` — nur diese Tage holen.
// Einmalig gedacht (wie fetch-route.mjs) — die Site selbst lädt nichts von extern.

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import sharp from 'sharp';

const UA = 'NORDLYS-roadtrip-private/1.0 (privates Reiseprojekt; info@space-media.ch)';
const API = 'https://commons.wikimedia.org/w/api.php';
const OUT = 'review/day-images';
const FINAL = 'public/img/days';

// Suchbegriffe pro Tag — erster Treffer-Pool wird bevorzugt, zweiter füllt auf.
const DAYS = [
  { day: 1, queries: ['Speicherstadt Hamburg dusk', 'Speicherstadt Hamburg'] },
  { day: 2, queries: ['Öresund Bridge', 'Oresund bridge aerial'] },
  { day: 3, queries: ['Högakustenbron', 'Skuleberget'] },
  { day: 4, queries: ['Lapporten Torneträsk', 'Torneträsk'] },
  { day: 5, queries: ['Skogsfjordvatnet', 'Ringvassøya'] },
  { day: 6, queries: ['Tromsø panorama', 'Tromsø Storsteinen'] },
  { day: 7, queries: ['Svolvær harbour', 'Svolvær'] },
  { day: 8, queries: ['Haukland beach', 'Uttakleiv'] },
  { day: 9, queries: ['Kvalvika', 'Ryten Lofoten'] },
  { day: 10, queries: ['Reinebringen', 'Reine Lofoten'] },
  { day: 11, queries: ['Saltstraumen', 'Saltstraumen bridge'] },
  { day: 12, queries: ['Storseisundet Bridge', 'Atlantic Ocean Road Norway'] },
  { day: 13, queries: ['Trollstigen', 'Geirangerfjord'] },
  { day: 14, queries: ['Lom stave church', 'Bøverdalen'] },
  { day: 15, queries: ['Scandlines Puttgarden', 'Scandlines ferry Fehmarnbelt'] },
  { day: 16, queries: ['Greifensee Switzerland', 'Greifensee'] },
];

// Nach visueller Sichtung der Kontaktbögen füllen: { 1: 'File:....jpg', ... }
const PICKS = JSON.parse(readFileSync(new URL('./day-image-picks.json', import.meta.url), { encoding: 'utf8' }).toString() || '{}');

const BAD_TITLE = /map|karta|kart\b|diagram|logo|panorama_360|stitch_error/i;

// Optionaler Tagesfilter (`candidates 5,6` / `final 5,6`) — leer = alle Tage
const ONLY = (process.argv[3] ?? '').split(',').map((x) => Number(x.trim())).filter(Boolean);
const wanted = (day) => !ONLY.length || ONLY.includes(Number(day));

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', origin: '*', ...params })}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function stripHtml(s) {
  return (s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

async function searchCandidates(query, limit = 10) {
  const data = await api({
    action: 'query',
    generator: 'search',
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: String(limit),
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata|mime',
    iiurlwidth: '480',
  });
  const pages = Object.values(data.query?.pages ?? {});
  pages.sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
  return pages
    .map((p) => {
      const ii = p.imageinfo?.[0];
      if (!ii) return null;
      const md = ii.extmetadata ?? {};
      return {
        title: p.title,
        mime: ii.mime,
        width: ii.width,
        height: ii.height,
        thumb: ii.thumburl,
        descUrl: ii.descriptionurl,
        artist: stripHtml(md.Artist?.value),
        license: stripHtml(md.LicenseShortName?.value),
      };
    })
    .filter(Boolean)
    .filter((c) => /jpeg|png/.test(c.mime))
    .filter((c) => c.width >= 1400 && c.width > c.height)
    .filter((c) => !BAD_TITLE.test(c.title));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function download(url, tries = 5) {
  for (let i = 0; i < tries; i++) {
    await sleep(600); // upload.wikimedia.org drosselt schnelle Serien-Downloads
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status === 429) {
      await sleep(4000 * (i + 1));
      continue;
    }
    throw new Error(`${res.status} ${url}`);
  }
  throw new Error(`429 nach ${tries} Versuchen: ${url}`);
}

const labelSvg = (txt) =>
  Buffer.from(
    `<svg width="46" height="30"><rect width="46" height="30" rx="3" fill="#05070d" opacity="0.85"/><text x="23" y="21" font-family="monospace" font-size="16" font-weight="bold" fill="#4de8a6" text-anchor="middle">${txt}</text></svg>`
  );

async function candidates() {
  mkdirSync(OUT, { recursive: true });
  let all = {};
  try {
    all = JSON.parse(readFileSync(`${OUT}/candidates.json`, 'utf8'));
  } catch {}
  for (const { day, queries } of DAYS) {
    if (!wanted(day)) continue;
    if (all[day]?.length) continue; // bereits geholt (Resume nach 429)
    let pool = [];
    for (const q of queries) {
      if (pool.length >= 4) break;
      const found = await searchCandidates(q);
      for (const c of found) {
        if (pool.length >= 4) break;
        if (!pool.some((p) => p.title === c.title)) pool.push(c);
      }
    }
    all[day] = pool;

    // Kontaktbogen: bis zu 4 Thumbs nebeneinander, beschriftet A–D
    const tiles = [];
    for (let i = 0; i < pool.length; i++) {
      const buf = await download(pool[i].thumb);
      tiles.push(await sharp(buf).resize({ height: 280 }).toBuffer());
    }
    if (!tiles.length) {
      console.warn(`Tag ${day}: keine Kandidaten!`);
      continue;
    }
    const metas = await Promise.all(tiles.map((t) => sharp(t).metadata()));
    const totalW = metas.reduce((s, m) => s + m.width, 0) + (tiles.length - 1) * 10;
    const composites = [];
    let x = 0;
    for (let i = 0; i < tiles.length; i++) {
      composites.push({ input: tiles[i], left: x, top: 0 });
      composites.push({ input: labelSvg('ABCD'[i]), left: x + 6, top: 6 });
      x += metas[i].width + 10;
    }
    await sharp({ create: { width: totalW, height: 280, channels: 3, background: '#101010' } })
      .composite(composites)
      .jpeg({ quality: 82 })
      .toFile(`${OUT}/day${String(day).padStart(2, '0')}-sheet.jpg`);
    writeFileSync(`${OUT}/candidates.json`, JSON.stringify(all, null, 2));
    console.log(`Tag ${day}: ${pool.length} Kandidaten → Kontaktbogen`);
  }
  console.log('Kandidaten fertig → review/day-images/');
}

async function final() {
  mkdirSync(FINAL, { recursive: true });
  mkdirSync(OUT, { recursive: true }); // credits.json landet dort — auch ohne vorherigen candidates-Lauf
  const credits = {};
  for (const [day, title] of Object.entries(PICKS)) {
    if (!wanted(day)) continue;
    // Breite aus Seitenverhältnis: Panoramen brauchen mehr Pixel, damit ~900px Höhe bleiben
    const meta = await api({ action: 'query', titles: title, prop: 'imageinfo', iiprop: 'size' });
    const sz = Object.values(meta.query.pages)[0].imageinfo[0];
    const width = Math.min(sz.width - 1, Math.max(1600, Math.round((900 * sz.width) / sz.height)));
    const data = await api({
      action: 'query',
      titles: title,
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      iiurlwidth: String(width),
    });
    const page = Object.values(data.query.pages)[0];
    const ii = page.imageinfo[0];
    const md = ii.extmetadata ?? {};
    const buf = await download(ii.thumburl);
    const name = `day-${String(day).padStart(2, '0')}.webp`;
    await sharp(buf).webp({ quality: 74 }).toFile(`${FINAL}/${name}`);
    credits[day] = {
      src: `img/days/${name}`,
      artist: stripHtml(md.Artist?.value),
      license: stripHtml(md.LicenseShortName?.value),
      source: ii.descriptionurl,
    };
    console.log(`Tag ${day}: ${name} (${stripHtml(md.Artist?.value)} · ${stripHtml(md.LicenseShortName?.value)})`);
  }
  writeFileSync(`${OUT}/credits.json`, JSON.stringify(credits, null, 2));
  console.log('Final fertig → public/img/days/ + review/day-images/credits.json');
}

const mode = process.argv[2];
if (mode === 'candidates') await candidates();
else if (mode === 'final') await final();
else console.log('Aufruf: node scripts/fetch-day-images.mjs candidates|final');
