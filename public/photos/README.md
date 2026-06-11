# Eigene Fotos

Hier können später eigene Fotos rein (z. B. `crew-fabio.jpg`, `tag-05-svolvaer.jpg`).

Das Layout funktioniert komplett ohne Fotos — die visuelle Kraft kommt aus Canvas/SVG.
Wenn ihr nach der Reise Bilder einbauen wollt:

1. Fotos hier ablegen (WebP oder JPG, max. ~1600 px Breite reicht).
2. In `src/render.ts` bei den Crew-Karten bzw. Tages-Karten einen `<img>`-Slot ergänzen.
3. `npm run build` und `dist/` neu hochladen.
