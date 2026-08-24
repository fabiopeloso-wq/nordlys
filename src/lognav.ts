// Logbuch-Pill oben rechts auf der Hauptseite: erscheint, sobald ein Eintrag online ist,
// und führt auf den neuesten Tag. Wird per JS eingehängt (neben den Proviant-Knopf), damit
// index.html selbst unangetastet bleibt; der Proviant-Knopf wandert mit in die .topbar.

import index from './data/log/index.json';
import type { LogIndex } from './log/types';

export function initLogNav() {
  const days = (index as LogIndex).days;
  if (!days.length) return;
  const latest = days[days.length - 1];
  const nn = String(latest.day).padStart(2, '0');

  const link = document.createElement('a');
  link.className = 'topnav-log mono';
  link.href = `./${latest.url}`;
  link.title = `Logbuch — neuester Eintrag: Tag ${nn} · ${latest.title}`;
  link.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" aria-hidden="true">
      <path d="M5 4.5 H14.5 A3 3 0 0 1 17.5 7.5 V19.5 H8 A3 3 0 0 1 5 16.5 Z"/>
      <path d="M8 4.5 V19.5 M11 8.5 H14.5 M11 11.5 H14.5"/>
    </svg>
    <span>Logbuch · Tag ${nn}</span>`;

  const existing = document.querySelector<HTMLElement>('.topnav');
  const bar = document.createElement('div');
  bar.className = 'topbar';
  if (existing) {
    existing.replaceWith(bar);
    bar.append(link, existing);
  } else {
    bar.append(link);
    document.body.prepend(bar);
  }
}
