// Einmaliger Build-Time-Fetch der Tages-Etappen via OSRM-Demo-Server.
// Ergebnis wird statisch in src/data/day-geometry.json gespeichert — die Site
// macht zur Laufzeit keine Routing-Requests. Gleiches Muster wie fetch-route.mjs.
// Aufruf: node scripts/fetch-day-routes.mjs

import { writeFileSync } from 'node:fs';

// Wegpunkte [lng, lat] pro Tag — Quelle: route.json / itinerary.json / fetch-route.mjs
const P = {
  uster: [8.7208, 47.3492],
  hamburg: [9.9937, 53.5511],
  harburg: [9.9489, 53.4623], // Kleines Hotel Heimfeld — Nacht 1
  puttgarden: [11.224, 54.5034],
  roedby: [11.3531, 54.6565],
  oeresund: [12.8485, 55.5712],
  stockholm: [18.1622, 59.25], // First Camp City-Stockholm, Skarpnäck — Nacht 2
  hoegakusten: [18.3534, 63.0814],
  toere: [22.6529, 65.9061],
  kiruna: [20.2253, 67.8558],
  tornetraesk: [19.7167, 68.2167],
  abisko: [18.7822, 68.3585],
  bjerkvik: [17.5715, 68.5575], // E6/E10-Knoten
  nordkjosbotn: [19.5583, 69.2258],
  tromsoe: [18.9553, 69.6492],
  skogsfjordvatnet: [19.1206, 69.9733], // Småbruk (Airbnb) — Nächte 5+6
  svolvaer: [14.568, 68.2343],
  hoven: [14.1543, 68.3247],
  unstad: [13.6084, 68.269],
  eggum: [13.63, 68.3049],
  henningsvaer: [14.204, 68.1564],
  haukland: [13.5347, 68.1947],
  uttakleiv: [13.5057, 68.2117],
  fredvang: [13.172, 68.0866],
  reine: [13.0877, 67.932],
  aa: [12.9777, 67.8794],
  nusfjord: [13.352, 68.0311],
  moskenes: [13.045, 67.8943],
  bodoe: [14.405, 67.28],
  saltstraumen: [14.6203, 67.2346],
  mosjoen: [13.1907, 65.8361],
  laksforsen: [13.285, 65.621],
  grong: [12.3097, 64.4636], // Camp Namdalen — Nacht 11
  trondheim: [10.3951, 63.4305],
  kristiansund: [7.728, 63.1105],
  atlanterhavsvegen: [7.3559, 63.016],
  molde: [7.1607, 62.7372],
  aandalsnes: [7.687, 62.5675],
  trollstigen: [7.6712, 62.4574],
  geiranger: [7.2059, 62.1012],
  lom: [8.5667, 61.8381],
  oslo: [10.7522, 59.9133],
  goeteborg: [11.9746, 57.7089],
};

const DAYS = {
  1: [P.uster, P.harburg],
  2: [P.harburg, P.puttgarden, P.roedby, P.oeresund, P.stockholm],
  3: [P.stockholm, P.hoegakusten],
  4: [P.hoegakusten, P.toere, P.kiruna, P.tornetraesk],
  5: [P.tornetraesk, P.abisko, P.bjerkvik, P.nordkjosbotn, P.tromsoe, P.skogsfjordvatnet],
  6: [P.skogsfjordvatnet, P.tromsoe, P.skogsfjordvatnet],
  7: [P.skogsfjordvatnet, P.tromsoe, P.nordkjosbotn, P.bjerkvik, P.svolvaer, P.henningsvaer],
  8: [P.henningsvaer, P.hoven, P.unstad, P.haukland, P.uttakleiv],
  9: [P.uttakleiv, P.fredvang],
  10: [P.fredvang, P.reine, P.aa, P.nusfjord, P.moskenes],
  11: [P.moskenes, P.bodoe, P.saltstraumen, P.mosjoen, P.laksforsen, P.grong],
  12: [P.grong, P.trondheim, P.kristiansund, P.atlanterhavsvegen, P.molde],
  13: [P.molde, P.aandalsnes, P.trollstigen, P.geiranger, P.lom],
  14: [P.lom, P.oslo, P.goeteborg],
  15: [P.goeteborg, P.oeresund, P.roedby, P.puttgarden, P.hamburg],
  16: [P.hamburg, P.uster],
};

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

const days = {};
for (const [day, points] of Object.entries(DAYS)) {
  days[day] = await fetchChain(points, `Tag ${day}`);
}
writeFileSync(
  new URL('../src/data/day-geometry.json', import.meta.url),
  JSON.stringify({ stand: new Date().toISOString().slice(0, 10), days })
);
console.log(`day-geometry.json geschrieben: ${Object.values(days).map((d) => d.length).reduce((a, b) => a + b, 0)} pts total`);
