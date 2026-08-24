// Einmaliger Build-Time-Fetch der Routengeometrie via OSRM-Demo-Server.
// Ergebnis wird statisch in src/data/geometry.json gespeichert — die Site
// macht zur Laufzeit keine Routing-Requests.
// Aufruf: node scripts/fetch-route.mjs

import { writeFileSync } from 'node:fs';

const OUT = [
  [8.7208, 47.3492], // Uster
  [9.9489, 53.4623], // Hamburg-Harburg (Hotel, Nacht 1)
  [11.224, 54.5034], // Puttgarden
  [11.3531, 54.6565], // Rødby (Fähre via OSM)
  [12.8485, 55.5712], // Öresund
  [18.1622, 59.25], // Stockholm-Skarpnäck (Bungalow, Nacht 2)
  [18.3534, 63.0814], // Höga Kusten
  [22.6529, 65.9061], // Töre
  [20.2253, 67.8558], // Kiruna
  [18.7822, 68.3585], // Abisko
  [17.5715, 68.5575], // Bjerkvik (E6 Nord statt E10 West)
  [19.5583, 69.2258], // Nordkjosbotn
  [18.9553, 69.6492], // Tromsø
  [19.1206, 69.9733], // Skogsfjordvatnet — Småbruk (Airbnb, Nächte 5+6)
  [18.9553, 69.6492], // Tromsø
  [19.5583, 69.2258], // Nordkjosbotn
  [17.5715, 68.5575], // Bjerkvik (E10 West)
  [14.568, 68.2343], // Svolvær
  [13.0877, 67.932], // Reine
  [12.9777, 67.8794], // Å
];

const BACK = [
  [13.045, 67.8943], // Moskenes (Fähre)
  [14.405, 67.28], // Bodø
  [14.6203, 67.2346], // Saltstraumen
  [13.1907, 65.8361], // Mosjøen
  [10.3951, 63.4305], // Trondheim
  [7.728, 63.1105], // Kristiansund
  [7.3559, 63.016], // Atlantikstrasse
  [7.1607, 62.7372], // Molde
  [7.687, 62.5675], // Åndalsnes
  [7.6712, 62.4574], // Trollstigen
  [7.2059, 62.1012], // Geiranger
  [8.5667, 61.8381], // Lom
  [10.7522, 59.9133], // Oslo
  [11.9746, 57.7089], // Göteborg
  [12.8485, 55.5712], // Öresund
  [11.3531, 54.6565], // Rødby
  [11.224, 54.5034], // Puttgarden
  [9.9937, 53.5511], // Hamburg
  [8.7208, 47.3492], // Uster
];

async function fetchLeg(a, b) {
  const url = `https://router.project-osrm.org/route/v1/driving/${a[0]},${a[1]};${b[0]},${b[1]}?overview=simplified&geometries=geojson`;
  const res = await fetch(url, { headers: { 'User-Agent': 'nordlys-roadtrip-planner (one-time build fetch)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const json = await res.json();
  if (json.code !== 'Ok' || !json.routes?.[0]) throw new Error(`OSRM: ${json.code} for ${url}`);
  return json.routes[0].geometry.coordinates;
}

async function fetchChain(points, label) {
  const coords = [];
  for (let i = 0; i < points.length - 1; i++) {
    try {
      const leg = await fetchLeg(points[i], points[i + 1]);
      coords.push(...(coords.length ? leg.slice(1) : leg));
      console.log(`${label} ${i + 1}/${points.length - 1}: ${leg.length} pts`);
    } catch (e) {
      // Fallback: gerade Linie zwischen den Punkten, damit die Karte nie leer ist
      console.warn(`${label} ${i + 1}: ${e.message} — fallback auf Direktlinie`);
      coords.push(points[i], points[i + 1]);
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  return coords.map(([x, y]) => [Math.round(x * 1e5) / 1e5, Math.round(y * 1e5) / 1e5]);
}

const out = await fetchChain(OUT, 'out');
const back = await fetchChain(BACK, 'back');
writeFileSync(
  new URL('../src/data/geometry.json', import.meta.url),
  JSON.stringify({ stand: new Date().toISOString().slice(0, 10), out, back })
);
console.log(`geometry.json geschrieben: out=${out.length} pts, back=${back.length} pts`);
