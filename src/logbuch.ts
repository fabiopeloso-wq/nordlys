// Logbuch-Übersicht (logbuch.html): Live-Zeile mit dem Stand der Reise, dann alle 16 Tage
// chronologisch — veröffentlichte als Karten mit Hero-Bild, kommende als gedimmte Zeilen.
// Schlank wie die Proviant-Seite: kein GSAP, kein Lenis.

import '@fontsource-variable/big-shoulders';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
import './styles/base.css';
import './styles/log.css';

import index from './data/log/index.json';
import itinerary from './data/itinerary.json';
import { TRIP } from './trip.config.js';
import { STAY_ICONS, STAY_LABELS } from './render';
import { prefersReducedMotion, shortDate, zonedTime } from './utils';
import { NIGHT_LABELS, esc, pad } from './log/render';
import type { LogIndex, LogIndexEntry } from './log/types';

const idx = index as LogIndex;
const ROOT = document.body.dataset.root ?? './';
const TOTAL = itinerary.days.length;

function renderLive() {
  const el = document.querySelector<HTMLElement>('[data-render="log-live"]');
  if (!el) return;
  const latest = idx.days[idx.days.length - 1];
  const start = zonedTime(TRIP.startDate, TRIP.startTime, TRIP.timezone);
  const today = Math.min(TOTAL, Math.max(0, Math.floor((Date.now() - start) / 86400000) + 1));
  const tents = idx.days.filter((d) => d.night === 'zelt').length;
  const photos = idx.days.reduce((n, d) => n + d.photos, 0);
  const videos = idx.days.reduce((n, d) => n + d.videos, 0);
  const cells: string[] = [];
  if (today >= 1 && today <= TOTAL) cells.push(`<span>Unterwegs · Tag ${pad(today)} von ${TOTAL}</span>`);
  else if (today > TOTAL) cells.push(`<span>Zurück · ${TOTAL} Tage</span>`);
  else cells.push(`<span>Abfahrt ${shortDate(TRIP.startDate)}</span>`);
  if (latest) {
    cells.push(`<span>${latest.lat.toFixed(2)}° N · ${esc(latest.place)}</span>`);
    cells.push(`<span>${latest.kmTotal} km gefahren</span>`);
    if (tents) cells.push(`<span>${tents} ${tents === 1 ? 'Nacht' : 'Nächte'} im Zelt</span>`);
    cells.push(`<span>${photos} Fotos · ${videos} Videos</span>`);
  }
  el.innerHTML =
    `<p class="log-live__cells">${cells.join('')}</p>` +
    (latest
      ? `<a class="log-live__latest" href="${ROOT}${latest.url}"><span class="mono">Neuester Eintrag</span><b>Tag ${pad(latest.day)} · ${esc(latest.title)}</b><span class="mono">Lesen →</span></a>`
      : `<p class="log-live__empty">Noch kein Eintrag — der erste kommt am Abend des ersten Tages.</p>`);
}

function entryHtml(e: LogIndexEntry, isLatest: boolean): string {
  const media = [`${e.photos} ${e.photos === 1 ? 'Foto' : 'Fotos'}`, e.videos ? `${e.videos} ${e.videos === 1 ? 'Video' : 'Videos'}` : '']
    .filter(Boolean)
    .join(' · ');
  return `
  <li class="log-entry log-entry--online will-reveal" data-mood="${e.mood}">
    <a class="log-entry__link" href="${ROOT}${e.url}">
      <span class="log-entry__media" style="background-image:url(${e.hero.lqip})">
        <img src="${ROOT}${e.hero.thumb}" width="${e.hero.w}" height="${e.hero.h}" alt="" loading="lazy" decoding="async" />
      </span>
      <span class="log-entry__body">
        <span class="log-entry__top">
          <span class="log-entry__num">${pad(e.day)}<small>/${TOTAL}</small></span>
          <span class="log-entry__date mono">${shortDate(e.date)}${isLatest ? ' <em class="log-badge log-badge--new">Neu</em>' : ''}</span>
        </span>
        <span class="log-entry__title">${esc(e.title)}</span>
        <span class="log-entry__lead">${esc(e.lead)}</span>
        <span class="log-entry__stats mono">
          <span><b>${e.km}</b> km</span>
          <span class="log-entry__night log-entry__night--${e.night}">${STAY_ICONS[e.night] ?? ''}${esc(NIGHT_LABELS[e.night] ?? STAY_LABELS[e.night] ?? e.night)}</span>
          <span>${media}</span>
        </span>
        <span class="log-entry__cta mono">Tag ${pad(e.day)} lesen →</span>
      </span>
    </a>
  </li>`;
}

function pendingHtml(d: (typeof itinerary.days)[number], today: number): string {
  const state = d.day === today ? 'Heute unterwegs — Eintrag folgt am Abend' : d.day < today ? 'Eintrag folgt' : 'Ausstehend';
  return `
  <li class="log-entry log-entry--pending${d.day === today ? ' is-today' : ''}">
    <span class="log-entry__num">${pad(d.day)}<small>/${TOTAL}</small></span>
    <span class="log-entry__pending-body">
      <span class="log-entry__date mono">${shortDate(d.date)}</span>
      <span class="log-entry__title">${esc(d.title)}</span>
      <span class="log-entry__route">${esc(d.route)} · ${d.km} km</span>
    </span>
    <span class="log-entry__state mono">${state}</span>
  </li>`;
}

function renderEntries() {
  const el = document.querySelector<HTMLElement>('[data-render="log-entries"]');
  if (!el) return;
  const start = zonedTime(TRIP.startDate, TRIP.startTime, TRIP.timezone);
  const today = Math.floor((Date.now() - start) / 86400000) + 1;
  const latest = idx.days[idx.days.length - 1];
  el.innerHTML = itinerary.days
    .map((d) => {
      const online = idx.days.find((e) => e.day === d.day);
      return online ? entryHtml(online, online === latest) : pendingHtml(d, today);
    })
    .join('');
}

renderLive();
renderEntries();

const reduced = prefersReducedMotion();
const targets = document.querySelectorAll<HTMLElement>('.will-reveal');
if (reduced) {
  targets.forEach((el) => el.classList.add('is-in'));
} else {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    },
    // Ohne negative Schwelle: die erste Karte liegt oft knapp unter der Falz und soll sofort da sein
    { rootMargin: '0px 0px 120px 0px' }
  );
  targets.forEach((el) => io.observe(el));
}
