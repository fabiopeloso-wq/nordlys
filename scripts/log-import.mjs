// Logbuch-Import: holt die Originale eines Reisetags aus dem Drive-Ordner und macht daraus
// Web-Medien + ein Manifest. Idempotent — bereits importierte Dateien (Name + Grösse) werden
// übersprungen, nachgeschobene Bilder werden ergänzt und bekommen die nächste freie Nummer.
//
//   node scripts/log-import.mjs 3                 → Drive-Ordner «Sweden_2026/Day 3»
//   node scripts/log-import.mjs 3 /pfad/zum/ordner
//   node scripts/log-import.mjs 3 --sheet          → Kontaktbogen nach review/log/ (zum Sichten)
//   node scripts/log-import.mjs 3 --og             → og.jpg aus dem Hero in src/data/log/tag-03.json
//   node scripts/log-import.mjs 3 --force          → alles neu (auch bereits importierte Dateien)
//   node scripts/log-import.mjs 3 --no-upload      → Videos nicht ins Release laden (Test)
//
// Zwei Pässe: erst nur Metadaten (Aufnahmezeit) aller neuen Dateien, dann IDs in Zeitreihenfolge
// vergeben, dann konvertieren. So sind die IDs beim Erstimport chronologisch, ohne Umbenennen.
//
// Fotos:  HEIC → JPEG via sips (macOS-Bordmittel; die sharp-Binaries können kein HEIF),
//         dann sharp: 1800 px (Lightbox), 800 px (Galerie), 24 px LQIP als Base64. EXIF: Zeit, GPS, Kamera.
// Videos: ffprobe (Dauer, Masse, Rotation) → ffmpeg H.264, kürzere Kante ≤ 1080 px, ≤ 30 fps, faststart,
//         Metadaten entfernt (GPS!). Encoder: h264_videotoolbox (Apple Silicon, schnell) sonst libx264.
//         MP4 → GitHub-Release «media» (nicht ins Repo), Poster (WebP) ins Repo.
// Ausgabe: public/log/tag-NN/*, src/data/log/tag-NN.media.json, Transkodierungen in media/ (gitignored).

import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const exifReader = require('exif-reader');

// ---------- Konfiguration ----------
const HOME = process.env.HOME;
const DRIVE_ROOTS = [
  `${HOME}/Library/CloudStorage/GoogleDrive-fabio.peloso@space-media.ch/.shortcut-targets-by-id/1NK351Ec4aG4qie64BKnV3rr1PkRLEbZg/Sweden_2026`,
  `${HOME}/Google Drive/Meine Ablage/Sweden_2026`,
];
const RELEASE_TAG = 'media';
const DEFAULT_OFFSET = '+02:00'; // ganze Reise in CEST (CH/DE/DK/SE/NO)
const PHOTO_EXT = /\.(heic|heif|jpe?g|png|webp)$/i;
const VIDEO_EXT = /\.(mov|mp4|m4v)$/i;
const SIZES = { full: 1800, thumb: 800, poster: 1280, lqip: 24 };
const QUALITY = { full: 78, thumb: 72, poster: 74, lqip: 40 };

// ---------- Argumente ----------
const args = process.argv.slice(2);
const dayArg = args.find((a) => /^\d+$/.test(a));
if (!dayArg) {
  console.log('Aufruf: node scripts/log-import.mjs <tag> [ordner] [--sheet] [--og] [--force] [--no-upload]');
  process.exit(1);
}
const DAY = Number(dayArg);
const NN = String(DAY).padStart(2, '0');
const flags = new Set(args.filter((a) => a.startsWith('--')));
const folderArg = args.find((a) => !/^\d+$/.test(a) && !a.startsWith('--'));

const OUT_DIR = `public/log/tag-${NN}`;
const WORK_DIR = `media/tag-${NN}`;
const SRC_CACHE = `${WORK_DIR}/src`;
const MANIFEST = `src/data/log/tag-${NN}.media.json`;
const DAY_JSON = `src/data/log/tag-${NN}.json`;
const REVIEW_DIR = 'review/log';
for (const d of [OUT_DIR, SRC_CACHE, 'src/data/log', REVIEW_DIR]) mkdirSync(d, { recursive: true });

const repo = execFileSync('git', ['remote', 'get-url', 'origin']).toString().trim().replace(/^.*github\.com[:/]/, '').replace(/\.git$/, '');
const releaseUrl = (name) => `https://github.com/${repo}/releases/download/${RELEASE_TAG}/${name}`;

// ---------- Hilfen ----------
const run = (cmd, argv, opts = {}) => execFileSync(cmd, argv, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20, ...opts });
const pad3 = (n) => String(n).padStart(3, '0');
const mb = (b) => `${(b / 1048576).toFixed(1)} MB`;

function findDayFolder() {
  if (folderArg) return resolve(folderArg);
  // «Day 2», «Day 02», «Tag 2» — auch mit Zusatz wie «Day 2 (25.08.26)»; «Day 2» darf nicht «Day 21» treffen
  const rx = new RegExp(`^(Day|Tag)\\s*0?${DAY}(?!\\d)`, 'i');
  for (const root of DRIVE_ROOTS) {
    if (!existsSync(root)) continue;
    const hit = readdirSync(root).filter((n) => !n.startsWith('.')).find((n) => rx.test(n));
    if (hit) return join(root, hit);
  }
  throw new Error(`Kein Ordner für Tag ${DAY} gefunden (gesucht: Day ${DAY}… unter ${DRIVE_ROOTS.join(' | ')})`);
}

function loadManifest() {
  if (!existsSync(MANIFEST)) return { day: DAY, stand: null, items: [] };
  return JSON.parse(readFileSync(MANIFEST, 'utf8'));
}

function saveManifest(m) {
  // Lokale Wandzeit (nicht UTC) — wird im Fuss der Tagesseite als «Stand» gezeigt
  const now = new Date();
  m.stand = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  m.items.sort(byTaken);
  writeFileSync(MANIFEST, JSON.stringify(m, null, 2) + '\n');
}

// Sortierung: bekannte Aufnahmezeit zuerst, dann nach Zeit; ohne Zeit ans Ende (nach Dateiname)
function byTaken(a, b) {
  const ta = a.taken ?? '', tb = b.taken ?? '';
  if (ta && tb) return ta.localeCompare(tb) || a.orig.localeCompare(b.orig);
  if (ta) return -1;
  if (tb) return 1;
  return a.orig.localeCompare(b.orig);
}

/** EXIF-Wanduhrzeit + Offset → ISO mit Zone. exif-reader liefert die Wandzeit als UTC-Date. */
function isoFromExif(d, offset) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19) + (offset || DEFAULT_OFFSET);
}

/** UTC-Zeitstempel (Video-Container) → Wandzeit in DEFAULT_OFFSET. */
function isoFromUtc(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const sign = DEFAULT_OFFSET.startsWith('-') ? -1 : 1;
  const [h, m] = DEFAULT_OFFSET.slice(1).split(':').map(Number);
  const shifted = new Date(d.getTime() + sign * (h * 60 + m) * 60000);
  return shifted.toISOString().slice(0, 19) + DEFAULT_OFFSET;
}

function isoFromMtime(path) {
  // Upload-/Änderungszeit dieses Macs — Näherung, wenn die Datei keine Aufnahmezeit trägt
  return isoFromUtc(new Date(statSync(path).mtimeMs).toISOString());
}

function gpsFromExif(g) {
  if (!g?.GPSLatitude || !g?.GPSLongitude) return null;
  const dms = (a, ref) => {
    if (!Array.isArray(a) || a.length < 2) return NaN;
    const v = (a[0] ?? 0) + (a[1] ?? 0) / 60 + (a[2] ?? 0) / 3600;
    return /[SW]/i.test(ref || '') ? -v : v;
  };
  const lat = dms(g.GPSLatitude, g.GPSLatitudeRef);
  const lng = dms(g.GPSLongitude, g.GPSLongitudeRef);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;
  return [Number(lat.toFixed(5)), Number(lng.toFixed(5))];
}

async function lqip(input) {
  const buf = await sharp(input).rotate().resize(SIZES.lqip, SIZES.lqip, { fit: 'inside' }).webp({ quality: QUALITY.lqip }).toBuffer();
  return `data:image/webp;base64,${buf.toString('base64')}`;
}

/** Erzeugt full + thumb + lqip aus einem (als JPEG/PNG lesbaren) Bild. */
async function deriveImages(input, id, { full = true } = {}) {
  const out = {};
  if (full) {
    const info = await sharp(input).rotate().resize(SIZES.full, SIZES.full, { fit: 'inside', withoutEnlargement: true }).webp({ quality: QUALITY.full }).toFile(`${OUT_DIR}/${id}.webp`);
    out.w = info.width;
    out.h = info.height;
  } else {
    const meta = await sharp(input).rotate().metadata();
    out.w = meta.width;
    out.h = meta.height;
  }
  await sharp(input).rotate().resize(SIZES.thumb, SIZES.thumb, { fit: 'inside', withoutEnlargement: true }).webp({ quality: QUALITY.thumb }).toFile(`${OUT_DIR}/${id}-t.webp`);
  out.lqip = await lqip(input);
  return out;
}

// ---------- Fotos ----------
/** Pass 1: lesbare Quelle (HEIC → JPEG, gecacht nach Originalname) + EXIF. */
async function inspectPhoto(path) {
  const ext = extname(path).toLowerCase();
  let readable = path;
  if (ext === '.heic' || ext === '.heif') {
    readable = `${SRC_CACHE}/${basename(path, extname(path))}.jpg`;
    if (!existsSync(readable)) run('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '92', path, '--out', readable]);
  }
  const meta = await sharp(readable).metadata();
  let x = null;
  try { x = meta.exif ? exifReader(meta.exif) : null; } catch { /* kein/verkorkstes EXIF → egal */ }
  const taken = isoFromExif(x?.Photo?.DateTimeOriginal ?? x?.Image?.DateTime, x?.Photo?.OffsetTimeOriginal);
  const camera = [x?.Image?.Make, x?.Image?.Model].filter(Boolean).join(' ').replace(/^apple /i, '').trim() || null;
  return { readable, taken, camera, gps: gpsFromExif(x?.GPSInfo) };
}

/** Pass 2: Web-Derivate. */
async function importPhoto(p, id) {
  const derived = await deriveImages(p.readable, id);
  return {
    id,
    type: 'photo',
    orig: basename(p.path),
    bytes: statSync(p.path).size,
    src: `log/tag-${NN}/${id}.webp`,
    thumb: `log/tag-${NN}/${id}-t.webp`,
    lqip: derived.lqip,
    w: derived.w,
    h: derived.h,
    taken: p.taken ?? null,
    takenSource: p.taken ? 'exif' : 'none',
    gps: p.gps,
    camera: p.camera,
  };
}

// ---------- Videos ----------
function probe(path) {
  const json = JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path]).toString());
  const v = json.streams.find((s) => s.codec_type === 'video');
  const rot = Number(v?.side_data_list?.find((s) => s.rotation !== undefined)?.rotation ?? v?.tags?.rotate ?? 0);
  const swap = Math.abs(rot) % 180 === 90;
  const [num, den] = (v?.r_frame_rate || '30/1').split('/').map(Number);
  const created = json.format?.tags?.['com.apple.quicktime.creationdate'] || json.format?.tags?.creation_time || v?.tags?.creation_time || null;
  return {
    w: swap ? v.height : v.width,
    h: swap ? v.width : v.height,
    fps: den ? num / den : 30,
    duration: Number(json.format.duration),
    codec: v.codec_name,
    created,
  };
}

let encoderCache = null;
function encoder() {
  if (encoderCache) return encoderCache;
  const list = run('ffmpeg', ['-hide_banner', '-encoders']).toString();
  encoderCache = /h264_videotoolbox/.test(list) ? 'h264_videotoolbox' : 'libx264';
  return encoderCache;
}

function transcode(input, output, info) {
  const scale = "scale='trunc(min(1,1080/min(iw,ih))*iw/2)*2':'trunc(min(1,1080/min(iw,ih))*ih/2)*2'";
  const vf = (info.fps > 30.5 ? 'fps=30,' : '') + scale;
  const outPixels = Math.min(1, 1080 / Math.min(info.w, info.h)) ** 2 * info.w * info.h;
  const bitrate = outPixels >= 1.9e6 ? '6M' : outPixels >= 0.9e6 ? '3.5M' : '2M';
  const enc = encoder();
  const codecArgs = enc === 'h264_videotoolbox'
    ? ['-c:v', 'h264_videotoolbox', '-b:v', bitrate, '-profile:v', 'high']
    : ['-c:v', 'libx264', '-preset', 'medium', '-crf', '23'];
  run('ffmpeg', ['-y', '-v', 'error', '-i', input, '-vf', vf, ...codecArgs, '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-map_metadata', '-1', '-movflags', '+faststart', output]);
}

function uploadToRelease(file) {
  const r = spawnSync('gh', ['release', 'upload', RELEASE_TAG, file, '--clobber', '--repo', repo], { stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.status !== 0) throw new Error(`gh release upload: ${r.stderr}`);
}

/** Pass 1: Container-Zeit. Die Aufnahmezeit steht in der Regel im Apple-Tag, sonst creation_time (UTC). */
function inspectVideo(path) {
  const info = probe(path);
  const c = info.created;
  const taken = c ? (/[+-]\d\d:?\d\d$/.test(c) ? c.replace(/([+-]\d\d)(\d\d)$/, '$1:$2').slice(0, 25) : isoFromUtc(c)) : isoFromMtime(path);
  return { info, taken, takenSource: c ? 'container' : 'mtime' };
}

/** Pass 2: Transkodieren, Poster, Upload. */
async function importVideo(p, id) {
  const out = `${WORK_DIR}/${id}.mp4`;
  if (!existsSync(out) || flags.has('--force')) transcode(p.path, out, p.info);
  const outInfo = probe(out);
  // Poster: Frame bei 1 s (bei Kurzclips 0 s) → PNG via Pipe → sharp
  const at = p.info.duration > 1.5 ? '1' : '0';
  const png = run('ffmpeg', ['-v', 'error', '-ss', at, '-i', out, '-frames:v', '1', '-f', 'image2', '-c:v', 'png', 'pipe:1']);
  await sharp(png).resize(SIZES.poster, SIZES.poster, { fit: 'inside', withoutEnlargement: true }).webp({ quality: QUALITY.poster }).toFile(`${OUT_DIR}/${id}.webp`);
  const derived = await deriveImages(png, id, { full: false });
  const assetName = `tag-${NN}-${id}.mp4`;
  const assetPath = `${WORK_DIR}/${assetName}`;
  run('cp', [out, assetPath]);
  if (!flags.has('--no-upload')) uploadToRelease(assetPath);
  return {
    id,
    type: 'video',
    orig: basename(p.path),
    bytes: statSync(p.path).size,
    src: releaseUrl(assetName),
    size: statSync(out).size,
    poster: `log/tag-${NN}/${id}.webp`,
    thumb: `log/tag-${NN}/${id}-t.webp`,
    lqip: derived.lqip,
    w: outInfo.w,
    h: outInfo.h,
    duration: Number(outInfo.duration.toFixed(1)),
    taken: p.taken,
    takenSource: p.takenSource,
    gps: null,
    camera: null,
  };
}

// ---------- Kontaktbogen (zum Sichten und Beschriften) ----------
async function contactSheet(m) {
  const cols = 5, tile = 300, gap = 8, label = 24;
  const items = [...m.items].sort(byTaken);
  const rows = Math.ceil(items.length / cols);
  const W = cols * tile + (cols + 1) * gap;
  const H = rows * (tile + label) + (rows + 1) * gap;
  const comps = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const x = gap + (i % cols) * (tile + gap);
    const y = gap + Math.floor(i / cols) * (tile + label + gap);
    const buf = await sharp(`public/${it.thumb}`).resize(tile, tile, { fit: 'inside' }).toBuffer();
    const meta = await sharp(buf).metadata();
    comps.push({ input: buf, left: x + Math.round((tile - meta.width) / 2), top: y + Math.round((tile - meta.height) / 2) });
    const txt = `${it.id} ${it.type === 'video' ? '▶ ' + it.duration + 's' : ''} ${it.taken ? it.taken.slice(11, 16) : '--:--'}`;
    comps.push({
      input: Buffer.from(`<svg width="${tile}" height="${label}"><rect width="${tile}" height="${label}" fill="#05070d"/><text x="6" y="17" font-family="monospace" font-size="14" fill="#4de8a6">${txt}</text></svg>`),
      left: x, top: y + tile,
    });
  }
  const file = `${REVIEW_DIR}/tag-${NN}-sheet.jpg`;
  await sharp({ create: { width: W, height: H, channels: 3, background: '#101418' } }).composite(comps).jpeg({ quality: 82 }).toFile(file);
  console.log(`Kontaktbogen → ${file} (${items.length} Medien)`);
}

// ---------- OG-Bild aus dem Hero ----------
async function makeOg(m) {
  if (!existsSync(DAY_JSON)) throw new Error(`${DAY_JSON} fehlt — erst den Tages-Eintrag schreiben (hero: "p-0xx")`);
  const day = JSON.parse(readFileSync(DAY_JSON, 'utf8'));
  const hero = m.items.find((i) => i.id === day.hero);
  if (!hero) throw new Error(`hero «${day.hero}» nicht im Manifest`);
  const src = hero.type === 'photo' ? `public/${hero.src}` : `public/${hero.poster}`;
  await sharp(src).resize(1200, 630, { fit: 'cover', position: 'attention' }).jpeg({ quality: 80 }).toFile(`${OUT_DIR}/og.jpg`);
  console.log(`og.jpg → ${OUT_DIR}/og.jpg (aus ${hero.id})`);
}

// ---------- Hauptlauf ----------
const manifest = loadManifest();

if (flags.has('--sheet')) {
  await contactSheet(manifest);
  process.exit(0);
}
if (flags.has('--og')) {
  await makeOg(manifest);
  process.exit(0);
}

const folder = findDayFolder();
console.log(`Tag ${NN} ← ${folder}`);
const files = readdirSync(folder)
  .filter((f) => !f.startsWith('.') && (PHOTO_EXT.test(f) || VIDEO_EXT.test(f)))
  .map((f) => join(folder, f))
  .sort();

const known = new Set(manifest.items.map((i) => `${i.orig}|${i.bytes}`));
const photoBases = new Set(files.filter((f) => PHOTO_EXT.test(f)).map((f) => basename(f, extname(f)).toLowerCase()));

// ---- Pass 1: Metadaten aller neuen Dateien ----
const pending = [];
for (const path of files) {
  const key = `${basename(path)}|${statSync(path).size}`;
  if (known.has(key) && !flags.has('--force')) continue;
  const isVideo = VIDEO_EXT.test(path);
  try {
    if (isVideo) {
      const p = { path, isVideo, orig: basename(path), ...inspectVideo(path) };
      // Live-Photo-Begleitvideo (gleicher Name wie ein Foto, ≤ 3.5 s) → kein eigener Clip
      if (photoBases.has(basename(path, extname(path)).toLowerCase()) && p.info.duration <= 3.5) {
        console.log(`  überspringe ${p.orig} (Live-Photo-Clip, ${p.info.duration.toFixed(1)} s)`);
        continue;
      }
      pending.push(p);
    } else {
      pending.push({ path, isVideo, orig: basename(path), ...(await inspectPhoto(path)) });
    }
  } catch (e) {
    console.error(`  FEHLER (Metadaten) ${basename(path)}: ${e.message}`);
  }
}

if (!pending.length) {
  console.log('Nichts Neues. Manifest unverändert:', MANIFEST);
  process.exit(0);
}

// ---- IDs in Aufnahme-Reihenfolge ----
pending.sort(byTaken);
let nextPhoto = 1 + Math.max(0, ...manifest.items.filter((i) => i.type === 'photo').map((i) => Number(i.id.slice(2))));
let nextVideo = 1 + Math.max(0, ...manifest.items.filter((i) => i.type === 'video').map((i) => Number(i.id.slice(2))));
for (const p of pending) p.id = p.isVideo ? `v-${pad3(nextVideo++)}` : `p-${pad3(nextPhoto++)}`;

// ---- Pass 2: Konvertieren ----
console.log(`${pending.length} neue Dateien (${pending.filter((p) => p.isVideo).length} Videos) · Encoder: ${encoder()}`);
for (const p of pending) {
  const t0 = Date.now();
  try {
    const item = p.isVideo ? await importVideo(p, p.id) : await importPhoto(p, p.id);
    manifest.items = manifest.items.filter((i) => i.orig !== item.orig);
    manifest.items.push(item);
    console.log(`  ${item.id}  ${item.orig.padEnd(28)} ${String(item.w + '×' + item.h).padEnd(10)} ${item.taken ?? '(keine Zeit)'}  ${p.isVideo ? mb(item.size) + ' · ' + item.duration + ' s' : mb(item.bytes) + ' → webp'}  ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    saveManifest(manifest); // nach jeder Datei sichern — ein Abbruch kostet nur die aktuelle Datei
  } catch (e) {
    console.error(`  FEHLER ${p.orig}: ${e.message}`);
  }
}

const photos = manifest.items.filter((i) => i.type === 'photo').length;
const videos = manifest.items.filter((i) => i.type === 'video').length;
const webBytes = readdirSync(OUT_DIR).reduce((s, f) => s + statSync(`${OUT_DIR}/${f}`).size, 0);
console.log(`\nTag ${NN}: ${photos} Fotos, ${videos} Videos · ${OUT_DIR} = ${mb(webBytes)} · Manifest: ${MANIFEST}`);
console.log('Nächster Schritt: node scripts/log-import.mjs ' + DAY + ' --sheet  → Kontaktbogen sichten, Tages-JSON schreiben');
