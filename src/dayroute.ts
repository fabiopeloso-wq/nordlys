// Mini-Karte im Tagesfenster: zeigt die Fahretappe des jeweiligen Tages.
// Eine einzige MapLibre-Instanz wird beim ersten Öffnen erzeugt und beim
// Blättern zwischen Tagen wiederverwendet (Container wird umgehängt) —
// gleiche CARTO-dark-Basemap wie die grosse Karte, Linienfarbe nach Leg.

import dayGeometry from './data/day-geometry.json';

const STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const LEG_COLOR = (day: number) => (day <= 5 ? '#4DE8A6' : day <= 9 ? '#3ED3E8' : '#8E7BFF');

type MapT = import('maplibre-gl').Map;
type MarkerT = import('maplibre-gl').Marker;

async function loadLib() {
  const lib = (await import('maplibre-gl')).default;
  await import('maplibre-gl/dist/maplibre-gl.css');
  return lib;
}

let mapEl: HTMLDivElement | null = null;
let map: MapT | null = null;
let styleReady = false;
let markers: MarkerT[] = [];
let pendingDay: number | null = null;
let libPromise: ReturnType<typeof loadLib> | null = null;

const coordsFor = (day: number): number[][] | undefined =>
  (dayGeometry.days as Record<string, number[][]>)[String(day)];

function lineFeature(coords: number[][]) {
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'LineString' as const, coordinates: coords },
  };
}

function bbox(coords: number[][]): [[number, number], [number, number]] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of coords) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [[minX, minY], [maxX, maxY]];
}

async function ensureMap(): Promise<void> {
  if (map) return;
  libPromise ??= loadLib();
  const maplibregl = await libPromise;
  if (map) return;

  mapEl!.innerHTML = '';
  const m = new maplibregl.Map({
    container: mapEl!,
    style: STYLE_URL,
    center: [14, 62],
    zoom: 3,
    attributionControl: { compact: true },
    cooperativeGestures: true,
    dragRotate: false,
  });
  m.touchZoomRotate.disableRotation();
  m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  m.on('load', () => {
    m.addSource('day-route', { type: 'geojson', data: lineFeature([]) });
    m.addLayer({ id: 'day-route-glow', type: 'line', source: 'day-route', paint: { 'line-color': '#4DE8A6', 'line-width': 8, 'line-opacity': 0.2, 'line-blur': 4 } });
    m.addLayer({ id: 'day-route-line', type: 'line', source: 'day-route', paint: { 'line-color': '#4DE8A6', 'line-width': 2.4, 'line-opacity': 0.95 } });
    styleReady = true;
    if (pendingDay !== null) {
      const d = pendingDay;
      pendingDay = null;
      showDay(d);
    }
  });
  map = m;
}

async function showDay(day: number): Promise<void> {
  const coords = coordsFor(day);
  if (!map || !coords?.length) return;
  if (!styleReady) {
    pendingDay = day;
    return;
  }
  const color = LEG_COLOR(day);
  (map.getSource('day-route') as import('maplibre-gl').GeoJSONSource).setData(lineFeature(coords));
  map.setPaintProperty('day-route-line', 'line-color', color);
  map.setPaintProperty('day-route-glow', 'line-color', color);

  markers.forEach((mk) => mk.remove());
  markers = [];
  const maplibregl = await libPromise!;
  const dot = (cls: string) => {
    const el = document.createElement('span');
    el.className = `dvmap-dot ${cls}`;
    el.style.setProperty('--dot', color);
    return el;
  };
  markers.push(
    new maplibregl.Marker({ element: dot('dvmap-dot--start') }).setLngLat(coords[0] as [number, number]).addTo(map),
    new maplibregl.Marker({ element: dot('dvmap-dot--end') }).setLngLat(coords[coords.length - 1] as [number, number]).addTo(map)
  );

  map.fitBounds(bbox(coords), { padding: 42, duration: 0, maxZoom: 10 });
}

/** Hängt die (wiederverwendete) Tageskarte in den Slot des aktuellen Briefings. */
export function mountDayMap(slot: HTMLElement, day: number): void {
  if (!coordsFor(day)?.length) return;
  if (!mapEl) {
    mapEl = document.createElement('div');
    mapEl.className = 'dvmap';
  }
  slot.appendChild(mapEl);
  // Erst nach dem Einhängen initialisieren/resizen — vorher hat der Slot keine Grösse
  requestAnimationFrame(() => {
    void ensureMap().then(() => {
      map!.resize();
      void showDay(day);
    });
  });
}
