# NORDLYS

Interaktive Roadtrip-Experience: **Uster → Lofoten · 16 Tage · 4 Mann · 1 Stelvio.**
Eine statische Single-Page mit animierter Aurora, interaktiver Routenkarte, 16-Tage-Plan,
Wildcamp-Regeln, Budget-Rechner, Aurora-Guide und Packliste. Alle Inhalte basieren auf
Recherche mit Quellen (Stand 06/2026) — siehe `research/findings.md`.

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

Nach jeder Änderung: `npm run build` und `dist/` neu hochladen.
UI und Daten sind strikt getrennt — die JSON-Files sind die Single Source of Truth.

### Eigene Fotos

`public/photos/` ist als Slot vorbereitet (siehe README dort). Das Layout
funktioniert bewusst komplett ohne Fotos.

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
  plus Breitengrad-HUD (47.35° N → 68.15° N) — Scrollen = nach Norden fahren.
- **Karte** (MapLibre GL + CARTO dark, keyless): Hin-/Rückweg-Toggle, animiertes Einzeichnen,
  klickbare Tages-Marker mit Etappen-Panel. Lazy geladen.
- **Budget-Rechner**: alle Annahmen editierbar, Quellen als Tooltip, SVG-Balken, CHF pro Person.
- **Packliste**: Häkchen bleiben im Browser gespeichert (`localStorage`, Namespace `nordlys:`),
  Fortschritt pro Kategorie, Print-Stylesheet (`Ctrl+P` druckt nur die Packliste).
- **Easter Egg**: 5× auf den Polarstern im Footer klicken.

## Selbst-Review (optional)

```bash
npm run preview                 # serviert dist/ auf Port 4173
node scripts/review.mjs         # Screenshots aller Sektionen (1440 px + 390 px) nach review/
node scripts/interact.mjs       # Interaktions-Smoke-Test (Karte, Budget, Packliste, Easter Egg)
```

## Stack

Vite 7 · TypeScript (vanilla, kein Framework) · GSAP + ScrollTrigger · Lenis ·
MapLibre GL · Fonts self-hosted via Fontsource (Big Shoulders, Hanken Grotesk, Space Mono).
