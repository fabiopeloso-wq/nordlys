# NORDLYS

Interaktive Roadtrip-Experience: **Uster → Lofoten · 16 Tage · 4 Mann · 1 Stelvio.**
Eine statische Site mit animierter Aurora, interaktiver Routenkarte, 16-Tage-Plan,
Wildcamp-Regeln, Budget-Rechner, Aurora-Guide, Packliste — und dem Proviantplan auf einer
eigenen Subseite. Alle Inhalte basieren auf Recherche mit Quellen (Stand 06/2026) —
siehe `research/findings.md` und `research/nordlys-food-plan.md`.

## Lokal starten

```bash
npm install
npm run dev          # Dev-Server, http://localhost:5173
```

## Bauen & deployen (Hostpoint-Subdomain)

```bash
npm run build        # erzeugt dist/
```

Den **Inhalt von `dist/`** per FTP/SFTP in das Verzeichnis der Subdomain laden
(z. B. `nordlys.deine-domain.ch`). Mehr braucht es nicht: kein Server-Code, keine Keys,
relative Pfade (`base: './'`) — läuft in jedem Unterordner.

Einzige Laufzeit-Netzwerkzugriffe: die Karten-Tiles (© OpenStreetMap, © CARTO).
Alles andere (Fonts, Daten, Animationen) ist im Build enthalten.

## Inhalte anpassen

| Was | Wo |
|---|---|
| **Startdatum, Crew, Auto** | `src/trip.config.js` |
| Etappen & Tagesprogramm | `src/data/itinerary.json` |
| Routen-Stopps & Stats | `src/data/route.json` |
| Spots/POIs | `src/data/spots.json` |
| Wildcamp-Regeln | `src/data/rules.json` |
| Budget-Annahmen (mit Quellen) | `src/data/budget.json` |
| Aurora-Wissen | `src/data/aurora.json` |
| Packliste | `src/data/packing.json` |
| Menüplan & Einkaufslisten | `src/data/food.json` |

Nach jeder Änderung: `npm run build` und `dist/` neu hochladen.
UI und Daten sind strikt getrennt — die JSON-Files sind die Single Source of Truth.

### Eigene Fotos

`public/photos/` ist als Slot vorbereitet (siehe README dort). Das Layout
funktioniert bewusst komplett ohne Fotos.

### Tagesbilder neu beziehen

Die Briefing-Bilder liegen statisch in `public/img/days/` (WebP, von Wikimedia Commons).
Bei Routenänderung: Suchbegriffe in `scripts/fetch-day-images.mjs` anpassen, dann

```bash
node scripts/fetch-day-images.mjs candidates   # Kontaktbögen nach review/day-images/
# sichten, Auswahl in scripts/day-image-picks.json eintragen
node scripts/fetch-day-images.mjs final        # WebP + Credits erzeugen
```

und die Credits (`image`-Block pro Tag) in `src/data/itinerary.json` nachführen.

### Routen-Geometrie neu erzeugen

Die Strassengeometrie der Karte liegt statisch in `src/data/geometry.json`.
Wenn sich die Route ändert: Wegpunkte in `scripts/fetch-route.mjs` anpassen und

```bash
node scripts/fetch-route.mjs
```

## Features

- **Aurora-Canvas** im Hero: noise-getriebene Bänder (Grün→Türkis→Violett), additive Blends,
  Low-Res-Offscreen-Blur, DPR-Cap 1.5, pausiert offscreen, statisch bei `prefers-reduced-motion`.
- **Der Faden**: gestrichelte Routenlinie, die sich beim Scrollen über die ganze Page zeichnet,
  plus Breitengrad-HUD (47.35° N → 69.97° N) — Scrollen = nach Norden fahren.
- **Karte** (MapLibre GL + CARTO dark, keyless): Hin-/Rückweg-Toggle, animiertes Einzeichnen,
  klickbare Tages-Marker mit Etappen-Panel. Lazy geladen.
- **Tagesfenster («Briefing»)**: jede Tageskarte öffnet ein Overlay mit Stimmungsbild
  (Wikimedia Commons, lokal gebundelt, Credits verlinkt), Tages-Timeline, Highlight mit
  Fakten und Plan B. ←/→ blättert durch die Tage, Esc schliesst.
- **Budget-Rechner**: alle Annahmen editierbar, Quellen als Tooltip, SVG-Balken, CHF pro Person.
- **Packliste**: Häkchen bleiben im Browser gespeichert (`localStorage`, Namespace `nordlys:`),
  Fortschritt pro Kategorie, Print-Stylesheet (`Ctrl+P` druckt nur die Packliste).
- **Proviant** (`proviant.html`): eigene Subseite mit Menü Tag für Tag, der Einkaufs-Kaskade
  (10 Stopps) und den Einkaufslisten zum Abhaken — gleiche Persistenz wie die Packliste,
  eigener Print-Stylesheet (druckt Menü + Listen). Bewusst ohne Karte, GSAP und Lenis:
  ~25 kB JS, damit die Liste auch im Laden mit schlechtem Empfang sofort steht.
- **Easter Egg**: 5× auf den Polarstern im Footer klicken.

## Mehrere Seiten

Der Build ist Multi-Page (`vite.config.ts` → `rollupOptions.input`): `index.html` (die Reise),
`proviant.html` (Menüplan & Einkaufsliste), `logbuch.html` (Logbuch-Übersicht) sowie die generierten
Tagesseiten `logbuch/tag-NN/index.html` (siehe «Logbuch»). Beim Deployen wandert wie bisher der ganze
Inhalt von `dist/` auf die Subdomain — beide HTML-Dateien liegen dort nebeneinander.

## Logbuch (unterwegs)

Pro Reisetag ein Eintrag: `logbuch.html` (Übersicht) + `logbuch/tag-NN/` (Tagesseite mit Hero,
Stat-Leiste, Etappenkarte, Timeline, Text, Galerie mit Lightbox, Zahlen des Tages). Konzept, Datenschema
und Entscheide: `research/logbuch-plan.md`.

**Der Abend-Workflow** (Fotos/Videos liegen im Drive-Ordner `Sweden_2026/Day N (dd.mm.yy)`, lokal synchronisiert — das Script findet den Ordner über die Tagesnummer):

```bash
npm run log:import -- 3            # Day 3 aus dem Drive: HEIC→WebP, EXIF, Videos → Release «media», Manifest
npm run log:import -- 3 --sheet    # Kontaktbogen nach review/log/ (zum Sichten und Beschriften)
# src/data/log/tag-03.json schreiben (Titel, Lead, Story, Captions, Zahlen, hero, picks = Auswahl, omit = Ausschuss)
npm run log:import -- 3 --og       # og.jpg aus dem Hero (WhatsApp-Vorschau)
npm run build                      # erzeugt auch logbuch/tag-03/index.html + src/data/log/index.json
npm run log:check -- 3             # Playwright: Übersicht, Tagesseite, Lightbox, Videos im Release
git add -A && git commit && git push
```

Regeln: Originale kommen nie ins Repo (`media/` ist gitignored), Fotos als WebP nach `public/log/tag-NN/`,
Videos als H.264-MP4 ins GitHub-Release `media` (nur das Poster im Repo). Logbuch-Seiten tragen `noindex`.
Kuratieren in zwei Stufen: `picks: [...]` ist die Auswahl des Tages, die die Galerie zuerst zeigt; alle übrigen Bilder
kommen mit «Alle Bilder zeigen» chronologisch dazu. `omit: [...]` fliegt ganz raus — nur echte Doppel (gleiches Motiv,
Sekunden später) und Missglücktes. Das Manifest behält alles, beide Listen sind jederzeit reversibel. Captions braucht
nur die Auswahl; der Rest zeigt Uhrzeit, GPS und Kamera aus dem Manifest.
Voraussetzungen lokal: `ffmpeg`, `gh` (eingeloggt), macOS `sips` für HEIC.

## Selbst-Review (optional)

```bash
npm run preview                 # serviert dist/ auf Port 4173
node scripts/review.mjs         # Screenshots aller Sektionen (1440 px + 390 px) nach review/
node scripts/interact.mjs       # Interaktions-Smoke-Test (Karte, Budget, Packliste, Easter Egg)
node scripts/proviant-check.mjs # Proviant-Seite: Screenshots + Smoke-Test der Einkaufsliste
```

## Stack

Vite 7 · TypeScript (vanilla, kein Framework) · GSAP + ScrollTrigger · Lenis ·
MapLibre GL · Fonts self-hosted via Fontsource (Big Shoulders, Hanken Grotesk, Space Mono).
