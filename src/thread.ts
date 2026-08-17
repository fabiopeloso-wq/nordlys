// Der Faden (Signature-Element): durchgehende gestrichelte Routenlinie am linken
// Rand, zeichnet sich beim Scrollen. Dazu die Breitengrad-HUD unten rechts —
// Scrollposition = Position auf der Reise (Tag + Breitengrad aus itinerary.json).

import { ScrollTrigger } from 'gsap/ScrollTrigger';
import itinerary from './data/itinerary.json';
import { TRIP } from './trip.config.js';
import { prefersReducedMotion } from './utils';

const TICKS: { selector: string; label: string; ember?: boolean }[] = [
  { selector: '#crew', label: '4 Mann' },
  { selector: '#route', label: '7250 km' },
  { selector: '#tage', label: '16 Tage' },
  { selector: '#regeln', label: '150 m · 2 Nächte' },
  { selector: '#budget', label: 'CHF · Camp & Kasse', ember: true },
  { selector: '#aurora', label: 'Kp ≥ 2' },
  { selector: '#packen', label: 'Komfort 0 °C', ember: true },
  { selector: '#footer', label: '67.93° N — Ziel' },
];

export function initThread() {
  const journey = document.querySelector<HTMLElement>('.journey')!;
  const thread = journey.querySelector<HTMLElement>('.thread')!;
  const svg = thread.querySelector<SVGSVGElement>('.thread__svg')!;
  const path = svg.querySelector<SVGPathElement>('.thread__path')!;
  const ticksWrap = thread.querySelector<HTMLElement>('.thread__ticks')!;
  const reduced = prefersReducedMotion();

  // Gradient-Def für den Strich (CSS referenziert url(#threadGrad)).
  // userSpaceOnUse zwingend: die Linie hat Breite 0 → objectBoundingBox wäre degeneriert.
  svg.innerHTML =
    `<defs><linearGradient id="threadGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1000">
      <stop offset="0" stop-color="#4DE8A6"/><stop offset="0.5" stop-color="#35D6D2"/><stop offset="1" stop-color="#8E7BFF"/>
    </linearGradient></defs>` + svg.innerHTML;
  const pathEl = svg.querySelector<SVGPathElement>('.thread__path') ?? path;
  const gradEl = svg.querySelector<SVGLinearGradientElement>('#threadGrad')!;

  let H = 0;
  function layout() {
    H = journey.scrollHeight;
    svg.setAttribute('viewBox', `0 0 2 ${H}`);
    gradEl.setAttribute('y2', String(H));
    pathEl.setAttribute('d', `M1 0 V ${reduced ? H : 0}`);
    ticksWrap.innerHTML = '';
    const journeyTop = journey.getBoundingClientRect().top + window.scrollY;
    for (const t of TICKS) {
      const sec = document.querySelector<HTMLElement>(t.selector);
      if (!sec) continue;
      const y = sec.getBoundingClientRect().top + window.scrollY - journeyTop + 120;
      const el = document.createElement('div');
      el.className = 'thread__tick' + (t.ember ? ' thread__tick--ember' : '');
      el.style.top = `${y}px`;
      el.textContent = t.label;
      ticksWrap.appendChild(el);
    }
  }
  layout();
  let rt = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(rt);
    rt = window.setTimeout(layout, 200);
  });
  // Pin-Spacer und Webfonts verschieben das Layout nach dem Init → neu messen
  window.addEventListener('load', layout);
  ScrollTrigger.addEventListener('refresh', layout);

  if (!reduced) {
    ScrollTrigger.create({
      trigger: journey,
      start: 'top 80%',
      end: 'bottom bottom',
      scrub: 0.6,
      onUpdate: (self) => {
        pathEl.setAttribute('d', `M1 0 V ${Math.round(H * self.progress)}`);
      },
    });
  }

  initHud();
}

function initHud() {
  const hud = document.querySelector<HTMLElement>('[data-hud]')!;
  const dayEl = hud.querySelector('[data-hud-day]')!;
  const latEl = hud.querySelector('[data-hud-lat]')!;
  const days = itinerary.days;
  const startLat = TRIP.origin.lat;

  function update() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    hud.classList.toggle('is-on', window.scrollY > window.innerHeight * 0.7);
    // Scroll-Fortschritt → Reisetag → Breitengrad (stückweise linear zwischen Etappenzielen)
    const f = p * days.length;
    const i = Math.min(days.length - 1, Math.floor(f));
    const frac = f - i;
    const prevLat = i === 0 ? startLat : days[i - 1].coord.lat;
    const lat = prevLat + (days[i].coord.lat - prevLat) * frac;
    dayEl.textContent = `Tag ${String(Math.min(16, i + 1)).padStart(2, '0')}/16`;
    latEl.textContent = `${lat.toFixed(4)}° N`;
  }

  let queued = false;
  window.addEventListener(
    'scroll',
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        update();
      });
    },
    { passive: true }
  );
  update();
}
