// Logbuch-Tagesseite: HTML aus Tages-JSON + Medien-Manifest. Reine String-Templates wie im
// Briefing (dayview.ts) — kein Framework. Die Galerie selbst baut gallery.ts (braucht Layout).

import itinerary from '../data/itinerary.json';
import { STAY_ICONS, STAY_LABELS } from '../render';
import { shortDate } from '../utils';
import type { LogDay, LogIndexEntry, MediaItem } from './types';

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
export const pad = (n: number) => String(n).padStart(2, '0');

/** Pfad zur Site-Wurzel — die Tagesseiten liegen zwei Ebenen tief (logbuch/tag-NN/). */
export const ROOT = document.body.dataset.root ?? './';

export const fmtTime = (iso: string | null) => (iso ? iso.slice(11, 16) : '');
export const fmtCoords = (lat: number, lng: number) => `${lat.toFixed(4)}° N · ${lng.toFixed(4)}° E`;
export const fmtMb = (bytes: number) => `${(bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0)} MB`;
export const fmtDuration = (s: number) => `${Math.floor(s / 60)}:${pad(Math.round(s % 60))}`;

const TOTAL = itinerary.days.length;

/** Im Logbuch zählt, was war — nicht, was gebucht ist. Eigene Labels statt der Plan-Labels. */
export const NIGHT_LABELS: Record<string, string> = {
  zelt: 'Zelt · wild',
  auto: 'Im Auto',
  camping: 'Campingplatz',
  home: 'Daheim',
  hotel: 'Hotel',
  bungalow: 'Bungalow',
  hof: 'Småbruk',
  biwak: 'Biwak · draussen',
};

/** «2026-08-24T23:17» → «24.08.2026, 23:17» */
function fmtStand(stand: string): string {
  const m = stand.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}, ${m[4]}` : stand;
}

export function heroHtml(d: LogDay, hero: MediaItem): string {
  const src = hero.type === 'photo' ? hero.src : hero.poster!;
  const auroraBadge = d.aurora
    ? `<span class="log-badge log-badge--aurora mono">Aurora${typeof d.aurora === 'string' ? ' · ' + esc(d.aurora) : ''}</span>`
    : '';
  return `
  <header class="log-hero">
    <div class="log-hero__media" style="background-image:url(${hero.lqip})">
      <img src="${ROOT}${src}" width="${hero.w}" height="${hero.h}" alt="" fetchpriority="high" decoding="async"${d.heroPos ? ` style="object-position:${esc(d.heroPos)}"` : ''} />
    </div>
    <span class="log-hero__ghost" aria-hidden="true">${pad(d.day)}</span>
    <a class="log-hero__back mono" href="${ROOT}logbuch.html">← Logbuch</a>
    <div class="log-hero__head">
      <p class="log-hero__eyebrow mono">Logbuch · Tag ${pad(d.day)}/${TOTAL} · ${shortDate(d.date)}${auroraBadge}</p>
      <h1 class="log-hero__title" id="log-title">${esc(d.title)}</h1>
      <p class="log-hero__lead">${esc(d.lead)}</p>
      <p class="log-hero__meta mono">
        <span>${esc(d.place.name)}${d.place.region ? ' · ' + esc(d.place.region) : ''}</span>
        <span>${fmtCoords(d.place.lat, d.place.lng)}</span>
        ${d.stats.weather ? `<span>${esc(d.stats.weather)}</span>` : ''}
      </p>
    </div>
  </header>`;
}

export function statsHtml(d: LogDay, media: MediaItem[]): string {
  const photos = media.filter((m) => m.type === 'photo').length;
  const videos = media.filter((m) => m.type === 'video').length;
  const stat = (num: string, label: string, cls = '') =>
    `<div class="log-stat ${cls}"><span class="log-stat__num">${num}</span><span class="log-stat__label mono">${label}</span></div>`;
  const night = d.stats.night;
  return `
  <section class="log-stats" aria-label="Zahlen des Tages">
    ${stat(String(d.stats.km), 'km heute')}
    ${d.stats.drive ? stat(esc(d.stats.drive), 'Fahrzeit') : ''}
    ${stat(String(d.stats.kmTotal), 'km total')}
    <div class="log-stat log-stat--night log-stat--${night.type}">
      <span class="log-stat__icon">${STAY_ICONS[night.type] ?? ''}</span>
      <span class="log-stat__num log-stat__num--text">${esc(NIGHT_LABELS[night.type] ?? STAY_LABELS[night.type] ?? night.type)}</span>
      <span class="log-stat__label mono">Die Nacht</span>
    </div>
    ${stat(`${photos}<small>+${videos}</small>`, videos ? 'Fotos + Videos' : 'Fotos')}
  </section>`;
}

export function stageHtml(d: LogDay): string {
  const plan = itinerary.days.find((x) => x.day === d.day);
  const route = plan ? esc(plan.route) : '';
  const hasMap = d.track !== 'none';
  const timeline = d.timeline?.length
    ? `<ol class="log-plan">${d.timeline
        .map(
          (p) => `
        <li>
          <p class="log-plan__when"><span class="mono">${esc(p.t)}</span><b>${esc(p.title)}</b></p>
          ${p.text ? `<p class="log-plan__what">${esc(p.text)}</p>` : ''}
        </li>`
        )
        .join('')}</ol>`
    : '';
  if (!hasMap && !timeline) return '';
  return `
  <section class="log-section log-stage" id="etappe">
    <div class="container">
      <div class="log-stage__grid${hasMap && timeline ? '' : ' log-stage__grid--single'}">
        ${hasMap ? `
        <div class="will-reveal">
          <h2 class="log-h mono">Die Etappe${route ? ' · ' + route : ''}</h2>
          <div class="log-mapslot" data-log-map aria-label="Karte der Etappe von Tag ${d.day}"></div>
          <p class="log-mapnote mono">${d.track === 'gpx' ? 'Gefahrene Spur' : 'Geplante Etappe'} · ${d.stats.km} km</p>
        </div>` : ''}
        ${timeline ? `<div class="will-reveal"><h2 class="log-h mono">So lief der Tag</h2>${timeline}</div>` : ''}
      </div>
    </div>
  </section>`;
}

export function storyHtml(d: LogDay): string {
  const blocks = d.story
    .map((b) => {
      if (typeof b === 'string') return `<p>${esc(b)}</p>`;
      return `<blockquote class="log-quote"><p>«${esc(b.quote)}»</p>${b.who ? `<footer class="mono">— ${esc(b.who)}</footer>` : ''}</blockquote>`;
    })
    .join('');
  return `
  <section class="log-section log-story" id="story">
    <div class="container">
      <h2 class="log-h mono will-reveal">Der Tag</h2>
      <div class="log-story__body will-reveal">${blocks}</div>
    </div>
  </section>`;
}

export function galleryShellHtml(all: MediaItem[], picks: MediaItem[]): string {
  if (!all.length) return '';
  const photos = all.filter((m) => m.type === 'photo').length;
  const videos = all.length - photos;
  const parts = [`${photos} ${photos === 1 ? 'Foto' : 'Fotos'}`];
  if (videos) parts.push(`${videos} ${videos === 1 ? 'Video' : 'Videos'}`);
  // Auswahl zuerst, der Rest hinter dem Knopf — ohne Auswahl gibt es keinen Knopf
  const curated = picks.length < all.length;
  const more = curated
    ? `<button type="button" class="log-gallery__more mono" data-log-more aria-expanded="false" aria-controls="log-gallery" data-label-all="Alle ${all.length} Bilder zeigen" data-label-picks="Nur die Auswahl zeigen">
          <span data-log-more-label>Alle ${all.length} Bilder zeigen</span>
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" aria-hidden="true"><path d="M5 9 L12 16 L19 9"/></svg>
        </button>`
    : '';
  const count = curated ? `<span data-log-count>Auswahl · ${picks.length} von ${all.length}</span> · ` : '';
  return `
  <section class="log-section log-gallery-section" id="bilder">
    <div class="container container--wide">
      <h2 class="log-h mono">Bilder · ${parts.join(' · ')}</h2>
      <div class="log-gallery" id="log-gallery" data-log-gallery></div>
      <div class="log-gallery__foot">
        ${more}
        <p class="log-gallery__hint mono">${count}Antippen zum Vergrössern · ←/→ blättert · Videos laden erst beim Abspielen</p>
      </div>
    </div>
  </section>`;
}

export function notesHtml(d: LogDay): string {
  const next = itinerary.days.find((x) => x.day === d.day + 1);
  const facts = d.numbers?.length
    ? `<div class="will-reveal"><h2 class="log-h mono">Zahlen des Tages</h2><dl class="log-facts">${d.numbers
        .map((f) => `<div><dt>${esc(f.k)}</dt><dd>${esc(f.v)}</dd></div>`)
        .join('')}</dl></div>`
    : '';
  const tomorrow =
    d.tomorrow || next
      ? `<div class="will-reveal">
        <h2 class="log-h log-h--ember mono">Morgen</h2>
        <div class="log-tomorrow">
          ${next ? `<p class="log-tomorrow__title">Tag ${pad(next.day)} · ${esc(next.title)}</p>` : ''}
          ${d.tomorrow ? `<p class="log-tomorrow__text">${esc(d.tomorrow)}</p>` : ''}
          ${next ? `<p class="log-tomorrow__route mono">${esc(next.route)} · ${next.km} km${next.ferry ? ' · Fähre' : ''}</p>` : ''}
        </div>
      </div>`
      : '';
  if (!facts && !tomorrow) return '';
  return `
  <section class="log-section log-notes" id="notizen">
    <div class="container">
      <div class="log-notes__grid${facts && tomorrow ? '' : ' log-notes__grid--single'}">${facts}${tomorrow}</div>
    </div>
  </section>`;
}

export function footHtml(d: LogDay, prev: LogIndexEntry | undefined, next: LogIndexEntry | undefined, stand: string | null): string {
  const link = (e: LogIndexEntry | undefined, dir: 'prev' | 'next') =>
    e
      ? `<a class="log-nav__link log-nav__link--${dir}" href="${ROOT}${e.url}">
          <span class="mono">${dir === 'prev' ? '← Tag ' : 'Tag '}${pad(e.day)}${dir === 'next' ? ' →' : ''}</span>
          <b>${esc(e.title)}</b>
        </a>`
      : dir === 'prev'
        ? `<span class="log-nav__link log-nav__link--prev is-empty"><span class="mono">${d.day === 1 ? 'Abfahrt' : 'Tag ' + pad(d.day - 1)}</span><b>${d.day === 1 ? 'Uster, Tag 0' : 'Eintrag folgt'}</b></span>`
        : `<span class="log-nav__link log-nav__link--next is-empty"><span class="mono">${d.day >= TOTAL ? 'Ende' : 'Tag ' + pad(d.day + 1)}</span><b>${d.day >= TOTAL ? 'Zurück in Uster' : 'Folgt am Abend'}</b></span>`;
  return `
  <footer class="log-foot">
    <div class="container">
      <nav class="log-nav" aria-label="Logbuch-Navigation">
        ${link(prev, 'prev')}
        <a class="log-nav__index mono" href="${ROOT}logbuch.html">Logbuch<br /><b>${pad(d.day)}/${TOTAL}</b></a>
        ${link(next, 'next')}
      </nav>
      <p class="log-foot__meta mono">
        <a href="${ROOT}index.html#tage">So war es geplant → Briefing</a>
        <span>NORDLYS · Logbuch${stand ? ' · Stand ' + esc(fmtStand(stand)) : ''}</span>
      </p>
    </div>
  </footer>`;
}

export function hudHtml(d: LogDay): string {
  return `
  <div class="hud mono is-on" aria-hidden="true">
    <span>Tag ${pad(d.day)}/${TOTAL}</span>
    <span class="hud__lat">${d.place.lat.toFixed(4)}° N</span>
  </div>`;
}
