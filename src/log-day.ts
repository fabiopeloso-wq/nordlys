// Einstiegspunkt einer Logbuch-Tagesseite (logbuch/tag-NN/index.html).
// Bewusst ohne GSAP und Lenis: Galerien auf Touch brauchen natives Scrollen, Reveals
// macht ein IntersectionObserver, die Lightbox CSS-Transitions. Die Karte lädt erst,
// wenn ihr Slot in den Viewport kommt (MapLibre ist gross).

import '@fontsource-variable/big-shoulders';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
import './styles/base.css';
import './styles/log.css';

import index from './data/log/index.json';
import { mountDayMap } from './dayroute';
import { onEnter, prefersReducedMotion } from './utils';
import { mountGallery } from './log/gallery';
import { createLightbox } from './log/lightbox';
import { ROOT, footHtml, galleryShellHtml, heroHtml, hudHtml, notesHtml, stageHtml, statsHtml, storyHtml } from './log/render';
import type { LogDay, LogIndex, MediaManifest } from './log/types';

const dayMods = import.meta.glob('./data/log/tag-*.json');

async function main() {
  const NN = (document.body.dataset.logDay ?? '1').padStart(2, '0');
  const loadDay = dayMods[`./data/log/tag-${NN}.json`];
  const loadMedia = dayMods[`./data/log/tag-${NN}.media.json`];
  const host = document.querySelector<HTMLElement>('[data-log-root]')!;
  if (!loadDay || !loadMedia) {
    host.innerHTML = `<p class="log-missing mono">Tag ${NN}: noch kein Eintrag.</p>`;
    return;
  }
  const [dayMod, mediaMod] = await Promise.all([loadDay(), loadMedia()]);
  const day = (dayMod as { default: LogDay }).default;
  const manifest = (mediaMod as { default: MediaManifest }).default;
  // Kuratierung: das Manifest kennt alles, die Seite zeigt nur die Auswahl
  const omitted = new Set(day.omit ?? []);
  const media = manifest.items.filter((m) => !omitted.has(m.id));
  const idx = index as LogIndex;
  const pos = idx.days.findIndex((d) => d.day === day.day);
  const prev = pos > 0 ? idx.days[pos - 1] : undefined;
  const next = pos >= 0 ? idx.days[pos + 1] : undefined;
  const hero = manifest.items.find((m) => m.id === day.hero) ?? media[0];
  const captions = day.captions ?? {};

  document.body.dataset.mood = day.mood;
  document.title = `NORDLYS — Logbuch · Tag ${NN} · ${day.title}`;

  host.innerHTML =
    heroHtml(day, hero) +
    statsHtml(day, media) +
    stageHtml(day) +
    storyHtml(day) +
    galleryShellHtml(media) +
    notesHtml(day) +
    footHtml(day, prev, next, manifest.stand) +
    hudHtml(day);

  // Hero-Bild: Blur-up
  const heroImg = host.querySelector<HTMLImageElement>('.log-hero__media img');
  if (heroImg) {
    const done = () => heroImg.parentElement!.classList.add('is-loaded');
    if (heroImg.complete && heroImg.naturalWidth > 0) done();
    else heroImg.addEventListener('load', done, { once: true });
  }

  // Galerie + Lightbox
  const galleryEl = host.querySelector<HTMLElement>('[data-log-gallery]');
  if (galleryEl && media.length) {
    const lightbox = createLightbox(media, { root: ROOT, captions });
    mountGallery(galleryEl, media, { root: ROOT, captions, onOpen: (id, trigger) => lightbox.open(id, trigger) });
  }

  // Karte lazy — erst wenn der Slot sichtbar wird
  const mapSlot = host.querySelector<HTMLElement>('[data-log-map]');
  if (mapSlot) onEnter(mapSlot, () => mountDayMap(mapSlot, day.day), '200px 0px');

  // Reveals
  const reduced = prefersReducedMotion();
  const targets = host.querySelectorAll<HTMLElement>('.will-reveal');
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
      { rootMargin: '0px 0px -8% 0px' }
    );
    targets.forEach((el) => io.observe(el));
  }
}

void main();
