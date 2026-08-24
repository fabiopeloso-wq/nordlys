// Interaktive Dark-Map: MapLibre GL + CARTO dark-matter (keyless, Attribution korrekt).
// Lazy geladen, sobald die Sektion in die Nähe scrollt. Route zeichnet sich animiert.

import routeData from './data/route.json';
import geometry from './data/geometry.json';
import { renderRoutePanelDay, renderRoutePanelDefault } from './render';
import { prefersReducedMotion } from './utils';

const STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export function initMapLazy() {
  const container = document.querySelector<HTMLElement>('[data-map]')!;
  const io = new IntersectionObserver(
    ([e]) => {
      if (e.isIntersecting) {
        io.disconnect();
        void initMap(container);
      }
    },
    { rootMargin: '600px 0px' }
  );
  io.observe(container);
}

async function initMap(container: HTMLElement) {
  const maplibregl = (await import('maplibre-gl')).default;
  await import('maplibre-gl/dist/maplibre-gl.css');
  const reduced = prefersReducedMotion();

  const map = new maplibregl.Map({
    container,
    style: STYLE_URL,
    bounds: [
      [4.5, 46.5],
      [24.5, 70.6],
    ],
    fitBoundsOptions: { padding: 40 },
    attributionControl: { compact: true },
    cooperativeGestures: true,
    dragRotate: false,
  });
  map.touchZoomRotate.disableRotation();
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  map.on('load', () => {
    container.classList.add('is-ready');

    const lineFeature = (coords: number[][]) => ({
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'LineString' as const, coordinates: coords },
    });

    map.addSource('route-out', { type: 'geojson', data: lineFeature(reduced ? geometry.out : [geometry.out[0]]) });
    map.addSource('route-back', { type: 'geojson', data: lineFeature(reduced ? geometry.back : [geometry.back[0]]) });

    // Glow-Unterlage + Linie, Hinweg grün-türkis, Rückweg violett gestrichelt
    map.addLayer({ id: 'route-out-glow', type: 'line', source: 'route-out', paint: { 'line-color': '#4DE8A6', 'line-width': 7, 'line-opacity': 0.18, 'line-blur': 4 } });
    map.addLayer({ id: 'route-out-line', type: 'line', source: 'route-out', paint: { 'line-color': '#4DE8A6', 'line-width': 2.2, 'line-opacity': 0.95 } });
    map.addLayer({ id: 'route-back-glow', type: 'line', source: 'route-back', paint: { 'line-color': '#8E7BFF', 'line-width': 7, 'line-opacity': 0.16, 'line-blur': 4 } });
    map.addLayer({
      id: 'route-back-line', type: 'line', source: 'route-back',
      paint: { 'line-color': '#8E7BFF', 'line-width': 2.2, 'line-opacity': 0.95, 'line-dasharray': [1.6, 1.6] },
    });

    // Tages-Marker
    const seen = new Set<number>();
    for (const stop of routeData.stops) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `map-marker map-marker--${stop.leg}${(stop as { ferry?: boolean }).ferry ? ' map-marker--ferry' : ''}`;
      el.setAttribute('aria-label', `Tag ${stop.day}: ${stop.name}`);
      const first = !seen.has(stop.day);
      seen.add(stop.day);
      el.innerHTML = first ? `<span class="map-marker__label">${String(stop.day).padStart(2, '0')}</span>` : '';
      el.addEventListener('click', () => {
        renderRoutePanelDay(stop.day);
        document.querySelectorAll('.map-marker.is-active').forEach((m) => m.classList.remove('is-active'));
        el.classList.add('is-active');
      });
      new maplibregl.Marker({ element: el }).setLngLat([stop.lng, stop.lat]).addTo(map);
      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 14 }).setText(stop.name);
      el.addEventListener('mouseenter', () => popup.setLngLat([stop.lng, stop.lat]).addTo(map));
      el.addEventListener('mouseleave', () => popup.remove());
    }

    // Route zeichnet sich beim ersten Sichtbarwerden
    if (!reduced) {
      const animate = (sourceId: string, coords: number[][], duration: number, delay: number) => {
        const src = map.getSource(sourceId) as unknown as { setData: (d: unknown) => void };
        const start = performance.now() + delay;
        const tick = (now: number) => {
          const t = Math.min(1, Math.max(0, (now - start) / duration));
          const eased = 1 - Math.pow(1 - t, 2.5);
          const n = Math.max(1, Math.round(coords.length * eased));
          src.setData(lineFeature(coords.slice(0, n)));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      };
      animate('route-out', geometry.out, 2200, 200);
      animate('route-back', geometry.back, 2200, 2000);
    }
  });

  // Toggle Hinweg / Rückweg / beide
  const toggleWrap = document.querySelector('[data-render="route-toggle"]')!;
  toggleWrap.innerHTML = `
    <button type="button" data-leg="both" aria-pressed="true">Beide</button>
    <button type="button" data-leg="out" aria-pressed="false">Hinweg</button>
    <button type="button" data-leg="back" aria-pressed="false">Rückweg</button>`;
  toggleWrap.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-leg]');
    if (!btn || !map.isStyleLoaded()) return;
    const leg = btn.dataset.leg!;
    toggleWrap.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    const vis = (ids: string[], on: boolean) =>
      ids.forEach((id) => map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'));
    vis(['route-out-line', 'route-out-glow'], leg !== 'back');
    vis(['route-back-line', 'route-back-glow'], leg !== 'out');
    document.querySelectorAll<HTMLElement>('.map-marker').forEach((m) => {
      const isOut = m.classList.contains('map-marker--out') || m.classList.contains('map-marker--lofoten');
      const isBack = m.classList.contains('map-marker--back') || m.classList.contains('map-marker--lofoten');
      m.style.display = leg === 'both' || (leg === 'out' && isOut) || (leg === 'back' && isBack) ? '' : 'none';
    });
  });

  renderRoutePanelDefault();

  function lineFeature(coords: number[][]) {
    return {
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'LineString' as const, coordinates: coords },
    };
  }
}
