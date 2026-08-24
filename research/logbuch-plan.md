# NORDLYS — Logbuch: Plan

**Stand: 25.08.2026, nachts** · Ziel: pro Reisetag ein Eintrag mit Strecke, Text, Foto- und Videogalerie —
für die Crew und für die Familie zu Hause. Jeden Abend ein Update, gleiche Qualität wie der Rest der Site.

> **Status:** Phase 1 gebaut und mit Tag 01 befüllt (Import-Pipeline, Tagesseite, Übersicht, Generator, Check,
> Topnav-Pill). Der Drive-Ordner heisst `Sweden_2026/Day N` und ist über die Verknüpfung in «Meine Ablage» lokal
> lesbar. Video-Hosting via Release `media` ist verifiziert (Range-Requests → 206). Offen aus Phase 2/3: Lightbox-FLIP,
> Fortschrittskarte auf der Übersicht, Logbuch-Knopf auf den Tageskarten, Hero-Link, GPX, Aurora-Modus.

---

## 0 · Was ich von dir brauche (bevor Phase 1 startet)

| # | Frage | Mein Vorschlag, falls du nichts sagst |
|---|---|---|
| 1 | **Zugriff auf den Tages-Ordner.** Ordner: `drive.google.com/drive/folders/1DDYAAWuk6tVwL2wTxoWHFVfLHwcfNqKC` — sichtbar im Konto `fabio.peloso@space-media.ch`, aber als «Für mich freigegeben»: Drive for Desktop synchronisiert solche Ordner **nicht** automatisch, darum fehlt er lokal. Das API-Konto (`info@space-media.ch`) sieht ihn gar nicht. | Im Browser (Konto fabio.peloso) den Ordner rechtsklicken → **Organisieren → Verknüpfung hinzufügen → Meine Ablage**. Danach erscheint er auf diesem Mac unter `~/Google Drive/Meine Ablage/<Ordnername>/` und das Import-Script liest die Originale direkt — ohne API-Download-Umweg, der bei Videos unpraktisch wäre. Optional zusätzlich mit `info@space-media.ch` teilen (Leserecht), dann kann ich den Inhalt auch per API auflisten. |
| 2 | **Videos ausserhalb von Git?** | Ja — als Assets eines GitHub-Releases (siehe §4.3). Alternativen: YouTube «nicht gelistet» (Tracking, Werbung-Risiko) oder Cloudflare R2 (neues Konto). |
| 3 | **Öffentlich, aber unauffindbar?** Die Site ist public (GitHub Pages). | Logbuch-Seiten bekommen `noindex` — wer den Link hat, sieht alles; Google listet nichts. |

Nichts davon blockiert den Bau: Ich baue mit einem lokalen Inbox-Ordner und hänge die Quelle um, sobald sie klar ist.

---

## 1 · Entscheide

| Frage | Entscheid | Warum |
|---|---|---|
| Seitenstruktur | `logbuch.html` (Übersicht) + **eine Seite pro Tag** `logbuch/tag-03/` | Jeder Tag hat eine eigene URL mit eigenem Vorschaubild — WhatsApp-Teilen an die Familie zeigt das Foto des Tages, nicht das generische OG-Bild. |
| Rendering | Inhalt client-seitig aus JSON (wie der Rest der Site); nur `<head>` (Titel, OG-Bild) wird beim Build pro Tag erzeugt | Konsistent mit der Architektur, kein Framework, Crawler sehen trotzdem das richtige Bild. |
| Fotos | WebP **1800 px** (Lightbox) + **480 px** Thumb + 20-px-LQIP inline, im Repo unter `public/log/tag-XX/` | ~200 KB pro Bild → 16 Tage × 30 Fotos ≈ 150 MB, weit unter dem 1-GB-Limit von Pages. Originale kommen **nie** ins Repo. |
| Videos | ffmpeg → H.264 1080p MP4, Poster-WebP im Repo, **MP4 als GitHub-Release-Asset** | Git-History wächst sonst mit jedem Clip; Release-Assets sind gratis, CDN-gebacken, zählen nicht zur Repo-Grösse. Kein neues Konto. |
| Daten | `src/data/log/tag-03.json` (von mir geschrieben) + `tag-03.media.json` (vom Import-Script erzeugt) | Ein File pro Tag = kleine Diffs, kein Risiko, ältere Tage zu verändern. |
| Stack pro Tagesseite | GSAP (Reveals, Lightbox), **kein Lenis**, Karte lazy (bestehendes `dayroute.ts`) | Galerien auf Touch brauchen natives Scrollen; Lenis bringt hier nichts. |
| Stimmung pro Ort | `data-mood` auf `<body>` → Token-Overrides (§3.3) | «Passend zum Ort» ohne pro Tag neues CSS: die Seite wandert farblich mit dem Breitengrad. |

---

## 2 · Das Abend-Ritual

**Du (5 Minuten):**
1. Fotos/Videos in den Tages-Ordner laden (Originale, unsortiert — sortieren macht das Script nach Aufnahmezeit).
2. Mir ein paar Zeilen schicken. Vorlage, nichts ist Pflicht:
   ```
   Tag 03 — Umeå
   Geschlafen: Zelt, Waldlichtung 20 km nördlich (Allemansrätten)
   Strecke: wie geplant / Abweichung: …
   Highlights: …
   Anekdote / Zitat: …
   Zahlen: 2 Tankstopps · Bier 3.90 · 9 °C nachts
   Wetter: …
   Morgen: …
   ```
   Auch «Tag 3, alles wie geplant, Fotos sind drin» reicht — dann schreibe ich aus dem Tagesplan und den Bildern.

**Ich (10–15 Minuten, meist Warten auf ffmpeg):**
1. `npm run log:import -- 3 "<Ordner>"` → konvertiert neue Dateien, liest EXIF (Zeit, GPS), lädt Videos ins Release, schreibt `tag-03.media.json`. Idempotent: nachgeschobene Bilder werden ergänzt, nichts wird doppelt gemacht.
2. `src/data/log/tag-03.json` schreiben: Titel, Lead, Story, Bildunterschriften, Zahlen, Hero-Bild wählen.
3. `npm run log:pages` → `logbuch/tag-03/index.html` mit Titel + OG-Bild; `npm run build`.
4. `npm run log:check -- 3` → Screenshots Desktop/Mobile, alle Bilder 200, keine Konsolenfehler.
5. Commit, Push → Pages-Deploy (~2 min) → `scripts/live-check.mjs` gegen die Tages-URL.
6. Du bekommst den Link: `https://fabiopeloso-wq.github.io/nordlys/logbuch/tag-03/`

---

## 3 · Design-Konzept «Logbuch»

Die Hauptseite ist der **Plan**, das Logbuch ist die **Realität** — gleiche Sprache (Arctic Night, Mono-Vernakular, der Faden), aber
jetzt mit echten Bildern statt Commons-Stimmungsbildern. Grundregel: **Die Fotos sind der Star, das Design ist der Rahmen.**
Keine Glow-Cards, keine Instagram-Kacheln; Hairlines, Mono-Metadaten, viel Negativraum.

### 3.1 Tagesseite `logbuch/tag-03/`

```
┌──────────────────────────────────────────┐
│ HERO   Foto des Tages, full-bleed        │  Ghost-Ziffer «03» oben rechts (wie im Briefing),
│        unten links: LOGBUCH · TAG 03/16  │  Titel in Big Shoulders, darunter Ort + Koordinaten in Mono,
│        Titel · Ort · 63.8258° N          │  Wetter-Chip. Verlauf ins Panel, Grain darüber.
├──────────────────────────────────────────┤
│ 512 km │ 6 h 10 │ 2402 km ∑ │ Zelt │ 18°│  Stat-Leiste (Muster `food-stats`): heute, total, Nacht, Wetter
├───────────────────┬──────────────────────┤
│ DIE ETAPPE        │ SO LIEF DER TAG      │  Karte (Mini-Map aus dayroute.ts, geplante oder echte Spur)
│ [Karte]           │ 07:10 Abbau          │  neben der Timeline im Faden-Vokabular (gestrichelt + Ticks)
│                   │ 09:30 Höga Kusten    │
├───────────────────┴──────────────────────┤
│ DER TAG                                  │  Story: 3–6 Absätze, Lesemass 62ch, Zitate der Crew
│ «…» — Michi, Küchenchef                  │  als Pull-Quotes mit Mono-Attribution
├──────────────────────────────────────────┤
│ BILDER · 27 FOTOS · 3 VIDEOS             │  Galerie: justified rows (aus Seitenverhältnissen berechnet),
│ ▇▇▇▇ ▇▇ ▇▇▇   ▇▇ ▇▇▇▇▇ ▇▇                │  LQIP-Blur-up, Videos mit Poster + Dauer-Badge + Play-Glyph.
│ ▇▇ ▇▇▇▇ ▇▇▇▇  ▇▇▇ ▇▇ ▇▇▇▇                │  Lightbox: FLIP vom Thumb, ←/→/Esc wie im Briefing, Swipe,
│                                          │  Caption + Aufnahmezeit/GPS in Mono («14:32 · 63.4321° N»).
├───────────────────┬──────────────────────┤
│ ZAHLEN DES TAGES  │ MORGEN               │  Fakten-Tabelle (Muster `dayview__facts`) · Teaser aus dem
│ Tankstopps 2      │ Über den Polarkreis  │  Itinerary für den nächsten Tag (Ember)
├───────────────────┴──────────────────────┤
│ ← Tag 02   ·   Logbuch   ·   Tag 04 →    │  Fuss-Navigation, «So war es geplant» → Briefing 03
└──────────────────────────────────────────┘
 ┆ Faden links mit Ticks: Etappe · Bilder · Notizen   HUD: Breitengrad des Tages
```

- **Bildbehandlung:** Hero bekommt die leichte Gradierung des Briefings (`saturate(.92)`, Verlauf, Grain). Galerie und Lightbox
  zeigen die Fotos **ungefiltert** — echte Farben, echte Leute. Das Korn (`.grain`, z 90) liegt weiterhin über allem.
- **Galerie-Layout:** Justified Rows (Flickr-Prinzip) statt CSS-Grid mit Crops: kein Bild wird beschnitten, Hochformate
  und Panoramen bleiben, was sie sind. Berechnung aus `w/h` im Manifest, Zielhöhe 260 px Desktop / 180 px Mobile.
- **Videos:** nie Autoplay. Thumb = Poster mit Dauer-Badge; in der Lightbox `<video controls playsinline preload="metadata">`.
  Hochformat-Clips vom Handy werden hochformatig gezeigt, nicht in 16:9 gezwängt.
- **Mobile zuerst:** Die Familie liest das am Handy. Thumbs 480 px, das 1800-px-Bild lädt erst in der Lightbox.

### 3.2 Übersicht `logbuch.html`

- Kopf im `subhero`-Muster: **«Logbuch»**, darunter live: `Tag 03 von 16 · 63.83° N · 2402 km gefahren · 2 Nächte im Zelt`,
  Button «Neuester Eintrag →».
- **Fortschrittskarte** (MapLibre, lazy): gefahrene Etappen leuchtend, kommende gestrichelt — die grosse Karte der Hauptseite
  als Ist-Zustand.
- **Einträge chronologisch** (Scrollen = nach Norden, wie überall): veröffentlichte Tage als Karten mit Hero-Thumb, Titel,
  km, einem Satz; kommende Tage als gedimmte Zeilen `Tag 05 · Fr 28.08. · Ankunft am Ende der Welt · ausstehend`.
  So sieht die Familie auch, was noch kommt.

### 3.3 Stimmung pro Ort (`data-mood`)

Ein Wort pro Tag im JSON, der Rest ist CSS. Die Palette bleibt Arctic Night — es verschiebt sich nur, welcher Akzent führt
und wie warm/kalt der Seitengrund kippt.

| Mood | Tage (Itinerary Stand 24.08., via Tromsø) | Akzent | Grund |
|---|---|---|---|
| `autobahn` | 1, 2, 14, 15 | Ice-dim, Cyan | Nüchtern, Kilometer, Transit |
| `taiga` | 3, 4 | Grün → Cyan | Höga Kusten, Ostsee, Polarkreis — erstes Nordgefühl |
| `arctic` | 5, 6 | Grün-Verlauf | 70° Nord, Tromsø, der Hof am Skogsfjordvatnet — der Aurora-Verlauf darf hier führen |
| `lofoten` | 7–10 | Grün + Ember | Zelt, Feuer, Strände: die warme Ember-Welt aus Budget/Packliste |
| `fjord` | 11–13 | Violett → Cyan | Fähre Moskenes–Bodø, Helgeland, Atlantikstrasse, Trollstigen |
| `heim` | 16 | Ember | Ankunft, Greifensee |

Die Zuordnung folgt der Leg-Färbung in `dayroute.ts` (≤ 7 grün, ≤ 10 cyan, danach violett) — Karte und Seite sprechen dieselbe Farbe.

Wenn an einem Abend die Aurora zu sehen war: `"aurora": true` im JSON → der Hero bekommt den Aurora-Canvas der Hauptseite
als Hintergrund hinter dem Foto (dezent), und der Eintrag bekommt ein Mono-Badge `AURORA · KP 3`.

### 3.4 Anbindung an die Hauptseite

- Topnav oben rechts: neben «Proviant» ein zweiter Pill **«Logbuch · Tag 03»** (Tageszahl aus dem neuesten Eintrag).
- Hero nach der Abfahrt: das Label «Unterwegs — Tag 3 von 16» (gibt es schon) wird zum Link auf den neuesten Eintrag.
- Sektion «16 Tage»: Tageskarten mit vorhandenem Logbuch-Eintrag bekommen unten einen zweiten Knopf «Logbuch 03 →»
  neben «Briefing 03». Plan und Realität, nebeneinander.
- Jump-Card am Ende der Packliste (Muster «Proviant»): «09 · Das Logbuch».

### 3.5 Selbstkritik (vor dem ersten Code)

1. **Galerie-Klischee.** Ein Foto-Grid sieht schnell nach Instagram aus. Gegenmittel: Justified Rows ohne Crops, Mono-Metadaten
   (Uhrzeit, Koordinaten) an jedem Bild, Hairlines statt Schatten — die Galerie liest sich als Datenblatt, nicht als Feed.
2. **Effekt-Überladung.** Hero-Zoom, FLIP, Reveals, Mood-Farben, Aurora-Canvas — zu viel. Chanel-Regel: pro Seite maximal
   ein grosser Moment (die Lightbox-FLIP). Reveals nur leicht (Opacity + 16 px), Hero-Zoom nur beim ersten Laden.
3. **Gradierung tötet Fotos.** Das Briefing entsättigt Commons-Bilder, damit sie sich einfügen. Bei echten Fotos der Crew
   wäre das falsch — deshalb nur im Hero, und milder.
4. **Gewicht.** 30 Fotos à 1800 px auf einer Seite = 6 MB, am Campingplatz-Empfang tödlich. Deshalb Thumbs 480 px, LQIP,
   `loading="lazy"`, das grosse Bild erst in der Lightbox, Videos erst auf Klick.
5. **Der Faden auf einer Seite ohne Reise.** Der Faden erzählt Süd→Nord über die ganze Hauptseite; auf einer Tagesseite gibt
   es nur einen Tag. Lösung: Faden bleibt, aber die HUD zeigt den Breitengrad **dieses** Tages (statisch), die Ticks sind
   Sektionen. Auf der Übersicht dagegen läuft der Faden wieder über alle Tage — dort passt das Original-Konzept 1:1.

---

## 4 · Technik

### 4.1 Neue und geänderte Dateien

| Datei | Zweck |
|---|---|
| `logbuch.html` | Übersicht (Entry wie `proviant.html`) |
| `logbuch/tag-XX/index.html` | **generiert** aus `src/log/page.template.html` — nur `<head>` unterscheidet sich (Titel, Description, `og:image`, `noindex`) |
| `src/logbuch.ts` · `src/log-day.ts` | Einstiegspunkte Übersicht / Tagesseite |
| `src/log/render.ts` · `src/log/gallery.ts` · `src/log/lightbox.ts` · `src/log/mood.ts` | Rendering, Justified-Layout, Lightbox, Token-Overrides |
| `src/styles/log.css` | Alle Logbuch-Styles (Tokens/Typo aus `base.css`, Muster aus `food.css`/`dayview.css`) |
| `src/data/log/tag-XX.json` | Inhalt des Tages (von mir geschrieben) — Schema §4.2 |
| `src/data/log/tag-XX.media.json` | Medien-Manifest (vom Import-Script erzeugt, committed) |
| `public/log/tag-XX/` | WebP-Fotos, Thumbs, Video-Poster, `og.jpg` |
| `media/` | **gitignored** Inbox/Originale (falls lokal kopiert wird) |
| `scripts/log-import.mjs` | Import-Pipeline (§4.3) |
| `scripts/gen-log-pages.mjs` | Erzeugt `logbuch/tag-XX/index.html` für alle `status: "online"`-Tage |
| `scripts/log-check.mjs` | Playwright: Screenshots 1440/390, Bild-Requests, Lightbox-Smoke-Test |
| `vite.config.ts` | Inputs: `logbuch.html` + Glob über `logbuch/*/index.html` |
| `package.json` | Scripts `log:import`, `log:pages`, `log:check`; `build` ruft `gen-log-pages` vorher auf; devDependency `exif-reader` |
| `index.html` · `render.ts` · `base.css` | Topnav-Pill, Hero-Link, Logbuch-Knopf auf Tageskarten, Jump-Card |
| `README.md` · `DESIGN.md` | Abschnitt «Logbuch» + Abend-Workflow |

### 4.2 Datenschema `src/data/log/tag-03.json`

```json
{
  "day": 3, "date": "2026-08-26", "status": "online",
  "title": "Die Ostsee rechts, der Wald links",
  "lead": "512 Kilometer E4, ein Fährhafen ohne Fähre und die erste Nacht unter Allemansrätten.",
  "place": { "name": "Umeå", "region": "Västerbotten · Schweden", "lat": 63.8258, "lng": 20.263 },
  "mood": "taiga", "aurora": false,
  "hero": "p-014",
  "stats": { "km": 512, "kmTotal": 2402, "drive": "6 h 10", "weather": "Sonne, 18 °C",
             "night": { "type": "zelt", "text": "Waldlichtung 20 km nördlich von Umeå" } },
  "timeline": [ { "t": "07:10", "title": "Abbau in Skarpnäck", "text": "…" } ],
  "story": [ "Absatz …", { "quote": "…", "who": "Michi, Küchenchef" }, "Absatz …" ],
  "captions": { "p-003": "Höga Kusten, kurz vor der Brücke", "v-001": "Der Moment, als …" },
  "numbers": [ { "k": "Tankstopps", "v": "2 · 1.64 CHF/l" }, { "k": "Bier", "v": "3.90 CHF (Systembolaget)" } ],
  "tomorrow": "Über den Polarkreis — 750 km bis Kiruna, das Schild steht bei Jokkmokk.",
  "track": "planned"
}
```

`stay.type` benutzt die vorhandenen `STAY_ICONS`/`STAY_LABELS` (zelt, auto, camping, hotel, bungalow, home).
`track`: `"planned"` = Etappengeometrie aus `day-geometry.json`; `"gpx"` = echte Spur aus `media/tag-03/*.gpx`, vereinfacht.

Manifest `tag-03.media.json` (generiert, nach Aufnahmezeit sortiert):

```json
{ "day": 3, "items": [
  { "id": "p-001", "type": "photo", "src": "log/tag-03/p-001.webp", "thumb": "log/tag-03/p-001-t.webp",
    "lqip": "data:image/webp;base64,…", "w": 1800, "h": 1200,
    "taken": "2026-08-26T09:14:00+02:00", "gps": [63.1021, 18.2094], "orig": "IMG_4231.HEIC" },
  { "id": "v-001", "type": "video", "src": "https://github.com/fabiopeloso-wq/nordlys/releases/download/media/tag-03-v-001.mp4",
    "poster": "log/tag-03/v-001.webp", "w": 1080, "h": 1920, "duration": 14.2, "taken": "…", "orig": "IMG_4240.MOV" }
] }
```

### 4.3 Import-Pipeline `scripts/log-import.mjs <tag> <ordner>`

1. **Inventar:** alle Bilder/Videos im Ordner, Schlüssel = Dateiname + Grösse → bereits importierte werden übersprungen.
2. **HEIC → JPEG** via `sips` (macOS-Bordmittel; die `sharp`-Binaries können kein HEIF). Orientation via `sharp().rotate()`.
3. **Fotos:** `sharp` → 1800 px WebP q78, 480 px Thumb, 20 px LQIP als Base64. EXIF (`exif-reader`): Aufnahmezeit, GPS.
4. **Videos:** `ffprobe` (Dauer, Masse, Rotation) → `ffmpeg -vf scale=-2:'min(1080,ih)' -c:v libx264 -crf 23 -preset slow -c:a aac -b:a 128k -movflags +faststart`
   → Poster bei 1 s als WebP. Typisch 15 s Handy-Clip ≈ 4–6 MB.
5. **Upload:** `gh release upload media tag-03-v-001.mp4 --clobber` (Release `media` einmalig anlegen). URL ins Manifest.
   **Beim ersten Clip prüfen:** Range-Requests (Spulen) über die Release-URL in Safari und Chrome. Falls das hakt: Fallback Cloudflare R2.
6. **Manifest** schreiben/mergen, nach `taken` sortieren. `og.jpg` (1200×630) aus dem Hero, sobald `hero` im Tages-JSON steht.

Grenzen im Blick: Pages-Site ≤ 1 GB, Repo-Empfehlung ≤ 1 GB, Datei ≤ 100 MB, ≤ 10 Deploys/Stunde. Mit obigen Grössen sind
wir nach 16 Tagen bei ~200 MB im Repo. Videos: unbegrenzt im Release.

### 4.4 Deploy

Unverändert: Push auf `main` → Workflow → Pages. Der Build-Schritt erzeugt die Tagesseiten selbst (`gen-log-pages` läuft vor
`vite build`), die generierten `logbuch/tag-XX/index.html` werden trotzdem committed, damit `npm run dev` sie sieht.
Der 503-Fall vom letzten Deploy: Workflow einfach neu starten (`gh workflow run deploy.yml`).

---

## 5 · Phasen

| Phase | Wann | Inhalt | Ergebnis |
|---|---|---|---|
| **1 · Fundament** | heute Abend / morgen früh (~3 h) | Schema, Import-Script, Tagesseite (Hero, Stats, Karte+Timeline, Story, Galerie mit einfacher Lightbox, Fuss-Nav), Übersicht (Liste), Page-Generator, Check-Script, Topnav-Pill, README | **Tag 01 online**, das Ritual läuft |
| **2 · Politur** | Tag 2–4, zwischen den Updates | Lightbox-FLIP + Swipe, Justified-Rows-Feinschliff, Mood-System, OG-Bilder, Fortschrittskarte auf der Übersicht, Logbuch-Knopf auf den Tageskarten, Hero-Link | Die Seite ist «fertig» — Rest ist Inhalt |
| **3 · Kür** | Lofoten (Tage 6–9, kurze Etappen) | GPX-Spuren (falls jemand trackt), Aurora-Modus, «Plan vs. Realität» (geplante vs. gefahrene km, Nacht wie geplant?), Zusammenfassung «Alle Bilder» | Nice-to-have, nichts davon blockiert |

Reihenfolge innerhalb Phase 1: Import-Script zuerst (damit Tag-01-Bilder sofort durchlaufen), dann Tagesseite, dann Übersicht.

---

## 6 · Risiken & offene Punkte

- **Ordner-Zugriff:** Läuft dieser Mac nicht mit auf der Reise, muss der Ordner in einem Konto liegen, das ich erreiche
  (Drive-Sync auf diesem Mac oder Freigabe an `info@space-media.ch` für den API-Zugriff). → Frage 0.1.
- **Video-Hosting via Release:** technisch üblich, aber vor dem ersten Abend zu verifizieren (Spulen, Safari). Plan B steht.
- **Handy-Formate:** HEIC/HEVC von iPhones, Live-Photos (`.MOV` + `.HEIC` mit gleichem Namen → das Script behandelt das
  Paar als Foto, nicht als Video). Android liefert JPEG/MP4, unkritisch.
- **Personen & Öffentlichkeit:** Die Seite ist ohne Login erreichbar. `noindex` hält Suchmaschinen fern, mehr nicht.
  Wenn das nicht reicht: Pages kann keinen Passwortschutz — dann wäre Cloudflare Pages + Access (gratis) der Weg. Später entscheidbar.
- **Zeitzone:** EXIF-Zeiten sind Lokalzeit ohne Zone; die Reise bleibt in CEST (CH/DE/DK/SE/NO alle UTC+2) — kein Problem.
