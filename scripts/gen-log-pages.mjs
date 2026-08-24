// Erzeugt die Logbuch-Tagesseiten (logbuch/tag-NN/index.html) aus dem Template und den
// Tages-JSONs — nur der <head> unterscheidet sich (Titel, Description, OG-Bild), der Inhalt
// wird wie überall clientseitig gerendert. Schreibt zusätzlich src/data/log/index.json
// (Liste der veröffentlichten Tage für Übersicht, Navigation und den Topnav-Pill).
// Läuft vor jedem Build (npm run build / dev); die Ausgabe wird trotzdem committed.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const SITE_URL = (process.env.NORDLYS_SITE_URL || 'https://fabiopeloso-wq.github.io/nordlys/').replace(/\/?$/, '/');
const DATA = 'src/data/log';
const TEMPLATE = 'src/log/page.template.html';

mkdirSync(DATA, { recursive: true });
const tpl = readFileSync(TEMPLATE, 'utf8');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const pad = (n) => String(n).padStart(2, '0');

const dayFiles = readdirSync(DATA).filter((f) => /^tag-\d\d\.json$/.test(f)).sort();
const entries = [];
const warnings = [];

for (const file of dayFiles) {
  const day = JSON.parse(readFileSync(`${DATA}/${file}`, 'utf8'));
  const NN = pad(day.day);
  if (day.status !== 'online') {
    console.log(`Tag ${NN}: Status «${day.status}» — keine Seite`);
    continue;
  }
  const mediaFile = `${DATA}/tag-${NN}.media.json`;
  if (!existsSync(mediaFile)) {
    warnings.push(`Tag ${NN}: ${mediaFile} fehlt — erst importieren`);
    continue;
  }
  const media = JSON.parse(readFileSync(mediaFile, 'utf8'));
  const hero = media.items.find((i) => i.id === day.hero);
  if (!hero) {
    warnings.push(`Tag ${NN}: hero «${day.hero}» nicht im Manifest`);
    continue;
  }
  for (const id of Object.keys(day.captions ?? {})) {
    if (!media.items.some((i) => i.id === id)) warnings.push(`Tag ${NN}: Caption für unbekannte ID «${id}»`);
  }
  // Kuratierung: omit-Liste prüfen, Zählung nur über die gezeigten Medien
  const omit = new Set(day.omit ?? []);
  for (const id of omit) {
    if (!media.items.some((i) => i.id === id)) warnings.push(`Tag ${NN}: omit verweist auf unbekannte ID «${id}»`);
  }
  if (omit.has(day.hero)) warnings.push(`Tag ${NN}: hero «${day.hero}» steht in omit — wird im Hero gezeigt, fehlt aber in der Galerie`);
  const shown = media.items.filter((i) => !omit.has(i.id));
  const ogPath = `public/log/tag-${NN}/og.jpg`;
  if (!existsSync(ogPath)) warnings.push(`Tag ${NN}: ${ogPath} fehlt — node scripts/log-import.mjs ${day.day} --og`);

  const url = `logbuch/tag-${NN}/`;
  const html = tpl
    .replaceAll('{{NN}}', NN)
    .replaceAll('{{DAY}}', String(day.day))
    .replaceAll('{{TITLE}}', esc(day.title))
    .replaceAll('{{LEAD}}', esc(day.lead))
    .replaceAll('{{MOOD}}', esc(day.mood))
    .replaceAll('{{URL}}', SITE_URL + url)
    .replaceAll('{{OG_IMAGE}}', `${SITE_URL}log/tag-${NN}/og.jpg`);
  mkdirSync(`logbuch/tag-${NN}`, { recursive: true });
  const out = `logbuch/tag-${NN}/index.html`;
  const prev = existsSync(out) ? readFileSync(out, 'utf8') : null;
  if (prev !== html) writeFileSync(out, html);

  entries.push({
    day: day.day,
    date: day.date,
    title: day.title,
    lead: day.lead,
    place: day.place.name,
    lat: day.place.lat,
    lng: day.place.lng,
    mood: day.mood,
    km: day.stats.km,
    kmTotal: day.stats.kmTotal,
    night: day.stats.night.type,
    photos: shown.filter((i) => i.type === 'photo').length,
    videos: shown.filter((i) => i.type === 'video').length,
    hero: { thumb: hero.thumb, lqip: hero.lqip, w: hero.w, h: hero.h },
    url,
  });
  console.log(`Tag ${NN}: ${out} (${entries.at(-1).photos} Fotos, ${entries.at(-1).videos} Videos${omit.size ? `, ${omit.size} ausgelassen` : ''})`);
}

entries.sort((a, b) => a.day - b.day);
const index = { stand: new Date().toISOString().slice(0, 10), days: entries };
const indexFile = `${DATA}/index.json`;
const prevIndex = existsSync(indexFile) ? JSON.parse(readFileSync(indexFile, 'utf8')) : null;
// Nur schreiben, wenn sich die Tage geändert haben — sonst wechselt «stand» bei jedem Build
if (JSON.stringify(prevIndex?.days) !== JSON.stringify(entries)) writeFileSync(indexFile, JSON.stringify(index, null, 2) + '\n');

// Verwaiste Seiten melden (Tag nicht mehr online)
if (existsSync('logbuch')) {
  for (const d of readdirSync('logbuch')) {
    if (/^tag-\d\d$/.test(d) && !entries.some((e) => `tag-${pad(e.day)}` === d)) warnings.push(`logbuch/${d}/ existiert, aber der Tag ist nicht online — von Hand löschen?`);
  }
}

if (warnings.length) console.log('\nHinweise:\n- ' + warnings.join('\n- '));
console.log(`\n${entries.length} Tagesseite(n) · ${indexFile}`);
