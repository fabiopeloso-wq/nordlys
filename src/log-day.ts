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
  // Kuratierung in zwei Stufen: omit fliegt ganz raus (Doppel, Ausschuss); picks ist die Auswahl,
  // die zuerst steht — «Alle Bilder zeigen» blendet den Rest chronologisch dazwischen ein.
  const omitted = new Set(day.omit ?? []);
  const all = manifest.items.filter((m) => !omitted.has(m.id));
  const pickSet = new Set(day.picks ?? []);
  const picks = pickSet.size ? all.filter((m) => pickSet.has(m.id)) : all;
  const idx = index as LogIndex;
  const pos = idx.days.findIndex((d) => d.day === day.day);
  const prev = pos > 0 ? idx.days[pos - 1] : undefined;
  const next = pos >= 0 ? idx.days[pos + 1] : undefined;
  const hero = manifest.items.find((m) => m.id === day.hero) ?? all[0];
  const captions = day.captions ?? {};

  document.body.dataset.mood = day.mood;
  document.title = `NORDLYS — Logbuch · Tag ${NN} · ${day.title}`;

  host.innerHTML =
    heroHtml(day, hero) +
    statsHtml(day, all) +
    stageHtml(day) +
    storyHtml(day) +
    galleryShellHtml(all, picks) +
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

  // Galerie + Lightbox — beide blättern über dieselbe Liste (Auswahl oder alle)
  const galleryEl = host.querySelector<HTMLElement>('[data-log-gallery]');
  if (galleryEl && all.length) {
    const lightbox = createLightbox(picks, { root: ROOT, captions });
    const gallery = mountGallery(galleryEl, picks, { root: ROOT, captions, onOpen: (id, trigger) => lightbox.open(id, trigger) });
    const section = galleryEl.closest<HTMLElement>('.log-gallery-section');
    const moreBtn = host.querySelector<HTMLButtonElement>('[data-log-more]');
    const moreLabel = moreBtn?.querySelector<HTMLElement>('[data-log-more-label]');
    const countEl = host.querySelector<HTMLElement>('[data-log-count]');
    let expanded = false;
    const setExpanded = (on: boolean) => {
      if (!moreBtn || on === expanded) return;
      expanded = on;
      const items = on ? all : picks;
      gallery.setItems(items);
      lightbox.setItems(items);
      if (moreLabel) moreLabel.textContent = moreBtn.dataset[on ? 'labelPicks' : 'labelAll'] ?? '';
      moreBtn.setAttribute('aria-expanded', String(on));
      section?.classList.toggle('is-expanded', on);
      if (countEl) countEl.textContent = on ? `Alle ${all.length}` : `Auswahl · ${picks.length} von ${all.length}`;
    };
    moreBtn?.addEventListener('click', () => {
      setExpanded(!expanded);
      // Zugeklappt schrumpft die Seite unter dem Leser weg — zurück an den Anfang der Galerie
      if (!expanded) section?.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'instant' : 'smooth' });
    });

    // Deep-Link: #p-014 öffnet direkt — liegt das Bild ausserhalb der Auswahl, erst alles einblenden
    const hash = location.hash.slice(1);
    if (hash && all.some((m) => m.id === hash)) {
      if (!picks.some((m) => m.id === hash)) setExpanded(true);
      window.setTimeout(() => lightbox.open(hash), 120);
    }
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
