// Live-Countdown zum Startdatum, korrekt in Europe/Zurich (DST-sicher via Intl).

import { TRIP } from './trip.config.js';
import { zonedTime, shortDate } from './utils';

export function initCountdown() {
  const cells = {
    d: document.querySelector('[data-cd="d"]')!,
    h: document.querySelector('[data-cd="h"]')!,
    m: document.querySelector('[data-cd="m"]')!,
    s: document.querySelector('[data-cd="s"]')!,
  };
  const label = document.querySelector('[data-cd-label]')!;
  const target = zonedTime(TRIP.startDate, TRIP.startTime, TRIP.timezone);
  const endDate = new Date(target + TRIP.days * 86400000);

  const pad = (n: number) => String(n).padStart(2, '0');

  function tick() {
    const now = Date.now();
    let diff = target - now;
    if (diff <= 0) {
      if (now < endDate.getTime()) {
        const day = Math.floor((now - target) / 86400000) + 1;
        cells.d.textContent = pad(day);
        cells.h.textContent = '——';
        cells.m.textContent = '——';
        cells.s.textContent = '——';
        label.textContent = `Unterwegs — Tag ${day} von ${TRIP.days}`;
        return;
      }
      cells.d.textContent = '00';
      cells.h.textContent = '00';
      cells.m.textContent = '00';
      cells.s.textContent = '00';
      label.textContent = 'Zurück. Nächste Reise: offen.';
      return;
    }
    const d = Math.floor(diff / 86400000);
    diff -= d * 86400000;
    const h = Math.floor(diff / 3600000);
    diff -= h * 3600000;
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff - m * 60000) / 1000);
    cells.d.textContent = pad(d);
    cells.h.textContent = pad(h);
    cells.m.textContent = pad(m);
    cells.s.textContent = pad(s);
  }

  label.textContent = `Abfahrt ${shortDate(TRIP.startDate)}2026 · ${TRIP.startTime} Uhr · Uster`;
  tick();
  window.setInterval(tick, 1000);
}
