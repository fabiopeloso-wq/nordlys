# NORDLYS — Design-Plan «Arctic Night»

Die Page ist die Reise: oben Zivilisation, unten Polarnacht. Scrollen = nach Norden fahren.

## 1 · Token-System

| Token | Wert | Rolle |
|---|---|---|
| `--night-deep` | `#05070D` | Polarnacht — Page-Ende, Footer |
| `--night` | `#0A101E` | Basis-Hintergrund (Page-Anfang) |
| `--night-raised` | `#111A2E` | Panels, Karten, Inputs |
| `--ice` | `#EAF2FA` | Primärtext |
| `--ice-dim` | `#8FA3BC` | Sekundärtext, Labels |
| `--aurora-green / -cyan / -violet` | `#4DE8A6 / #35D6D2 / #8E7BFF` | Aurora — **immer als Verlauf**, nie solo |
| `--ember` | `#E8A558` | Warmes Gegengewicht: Camp, Budget, Packliste |
| `--line` | `#22304A` | 1px-Hairlines, gestrichelte Routen |

Der Body-Hintergrund verläuft über die gesamte Dokumenthöhe von `--night` nach `--night-deep` — die Abdunkelung ist Teil der Dramaturgie. Dezentes SVG-Grain-Overlay (4 % Opacity) gegen Flächen-Sterilität.

**Typo-Rollen:**
- **Display:** Big Shoulders (variable) — hohe, kondensierte Gothic; Expeditionsplakat-Vertikalität, bewusst nicht Inter/Space Grotesk/Playfair. Headlines gross, uppercase, eng.
- **Body:** Hanken Grotesk (variable) — ruhig, leicht warm, sehr gut lesbar auf Dunkel.
- **Mono:** Space Mono — alles Datenhafte: Koordinaten, `TAG 07/16`, km, KP-Werte, Preise. Der Mono trägt das Expeditions-Vernakular.

**Spacing:** 8-px-Basis; Sektionsabstand `clamp(6rem, 14vh, 11rem)`; Inhalt max. 1160 px, Datenpanels 760 px. Viel Negativraum oben, kontrollierte Dichte in Daten-Sektionen.

## 2 · Layout-Konzept (eine Zeile + Wireframe pro Sektion)

```
┌──────────────────────────────┐
│ HERO   Aurora-Canvas, Titel  │ Vollbild: Aurora über Berg-Silhouette, Countdown, Scroll-Hint
│        zentriert, Countdown  │
├──┬───────────────────────────┤
│┆ │ CREW   4 Karten, versetzt │ Asymmetrisches 4er-Raster, Initialen-Monogramme, Mono-Rollen
│┆ │ ROUTE  Karte + Statleiste │ Dark-Map 60 % + Stats/Etappen-Panel 40 %, Hin/Zurück-Toggle
│┆ │ 16 TAGE  ──────────────▶  │ Desktop: gepinnte Horizontal-Timeline; Mobile: vertikale Karten
│┆ │ REGELN  4 Länder-Karten   │ 2×2-Raster + Lofoten-Sonderzone als hervorgehobener Block
│┆ │ BUDGET  Rechner | Balken  │ Inputs links, animierte SVG-Balken + Total rechts (Ember-Welt)
│┆ │ AURORA  KP-Skala, Mond    │ KP-Gauge als Leuchtband, Dunkelheits-Tabelle, Foto-Settings
│┆ │ PACKEN  Checkliste 2-spalt│ localStorage-Checkboxen, Fortschritt pro Kategorie (Ember)
├──┴───────────────────────────┤
│ FOOTER  67.93° N · Polarstern│ Riesige Reine-Koordinaten, Easter Egg: 5× Polarstern
└──────────────────────────────┘
 ┆ = der Faden (Signature)        HUD unten rechts: 47.35° N → 69.97° N
```

## 3 · Signature-Element: «Der Faden»

Eine durchgehende, gestrichelte Routenlinie am linken Rand zieht sich vom Ende des Heros bis in den Footer und **zeichnet sich beim Scrollen** (stroke-dashoffset, scrub). An jeder Sektion sitzt ein Tick mit Mono-Label (`TAG 01–16`, `66.5° N POLARKREIS` …). Dazu gehört die fixe **Breitengrad-HUD** unten rechts: `47.35° N` zählt beim Scrollen auf `69.97° N` hoch und wieder zurück — Scrollposition = Position auf der Reise. Ein Konzept, zwei sichtbare Träger, konsequent bis zum Footer durchgezogen.

## 4 · Selbstkritik (vor dem ersten Code)

1. **Klischee-Gefahr «Nordlicht-Template»** (Dunkelblau + ein einzelnes Neongrün): entschärft — Aurora existiert ausschliesslich als Grün→Türkis→Violett-Verlauf; ab der Budget-Sektion übernimmt bewusst die warme Ember-Welt (Camp & Feuer), damit die Page nicht in kaltes Neon kippt. Keine Glow-Cards, sondern 1px-Hairlines und gestrichelte Linien.
2. **Font-Reflex vermieden:** Erste Idee war eine geometrische Sans — ersetzt durch Big Shoulders (kondensierte Plakat-Gothic). Der Charakter kommt aus der Vertikalität, nicht aus Effekten.
3. **Faden-Platzierung korrigiert:** Ursprünglich mittig durch alle Sektionen — kollidiert mit zentrierten Layouts und bricht responsive. Verlegt an den linken Rand als Margin-Element mit Ticks; die HUD übernimmt die erzählerische Kontinuität. Auf Mobile bleibt der Faden als schmale Randlinie sichtbar.
4. **Timeline-Standardpattern:** Horizontale Scroll-Timeline ist ein bekanntes Muster — gerettet durch Inhalt: riesige Mono-Tagesziffern als echte Sequenz, km-Balken als Mini-Profil, Übernachtungstyp als Symbol. Struktur trägt Information, nicht Dekor.
5. **Chanel-Regel** (vor Abschluss ein Accessoire entfernen) ist als Polish-Schritt eingeplant.

## 4b · Tagesfenster («Briefing», 06/2026)

Jede Tageskarte (und der Tages-Marker auf der Karte) öffnet ein Vollbild-Overlay: grosses Stimmungsbild des Etappenziels, Tages-Timeline im Faden-Vokabular (gestrichelte Linie + Ticks), Highlight mit Fakten-Tabelle, Plan B (Ember), Übernachtung. ←/→ blättert, Esc schliesst.

- **Overlay statt In-place-Expand:** Das 16-Tage-Band ist gepinnt und gescrubbt — eine Karte im Band aufzuklappen würde die ScrollTrigger-Distanzen brechen. Das Overlay friert die Seite ein (`lenis.stop()` + `html.dv-lock`).
- **Bilder:** Wikimedia Commons, einmalig via `scripts/fetch-day-images.mjs` (Kandidaten-Kontaktbögen → Auswahl in `day-image-picks.json` → WebP nach `public/img/days/`). Credits pro Bild in `itinerary.json`, verlinkt im Briefing-Fuss. Kein Hotlinking — die Site bleibt offline-tauglich.
- **Einbettung in Arctic Night:** Fotos leicht entsättigt (`saturate(.88)`), Verlauf ins Panel, Grain-Layer liegt bewusst ÜBER dem Overlay (z-index 85 < 90) — die realen Bilder bekommen dieselbe Körnung wie der Rest der Page.

## 5 · Technik-Entscheide

Vite + vanilla TypeScript (kein Framework-Overhead für eine scroll-getriebene Page). GSAP + ScrollTrigger, Lenis. Karte: MapLibre GL + CARTO `dark-matter`-Style (keyless, Attribution korrekt), lazy geladen. Aurora: Low-Res-Offscreen-Canvas, additive Blends, DPR-Cap 1.5, IntersectionObserver-Pause, `prefers-reduced-motion` → statisches Bild. Fonts self-hosted via Fontsource. Build rein statisch, `base: './'`.
