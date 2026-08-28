// Lightbox der Galerie: Foto in voller Grösse (1800 px, Blur-up aus dem LQIP) oder Video mit
// Poster und nativen Controls. ←/→/Esc wie im Briefing, Wischen auf Touch, Bild-ID im
// URL-Hash (#p-014) — so lässt sich ein einzelnes Bild teilen. Ohne GSAP: CSS-Transitions.
// Die Liste, über die geblättert wird, ist die der Galerie (Auswahl oder alle) — setItems() hält sie synchron.

import type { MediaItem } from './types';
import { esc, fmtCoords, fmtDuration, fmtMb, fmtTime } from './render';
import { positionLabel } from './gallery';

interface Opts {
  root: string;
  captions: Record<string, string>;
}

export interface Lightbox {
  open(id: string, trigger?: HTMLElement | null): void;
  close(): void;
  setItems(items: MediaItem[]): void;
}

export function createLightbox(initial: MediaItem[], opts: Opts): Lightbox {
  let items = initial;
  const root = document.createElement('div');
  root.className = 'lb';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Bild in voller Grösse');
  root.hidden = true;
  root.innerHTML = `
    <div class="lb__backdrop" data-lb-close></div>
    <button type="button" class="lb__close" aria-label="Schliessen">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" aria-hidden="true"><path d="M6 6 L18 18 M18 6 L6 18"/></svg>
    </button>
    <button type="button" class="lb__arrow lb__arrow--prev" aria-label="Vorheriges Bild">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" aria-hidden="true"><path d="M15 5 L8 12 L15 19"/></svg>
    </button>
    <button type="button" class="lb__arrow lb__arrow--next" aria-label="Nächstes Bild">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" aria-hidden="true"><path d="M9 5 L16 12 L9 19"/></svg>
    </button>
    <figure class="lb__figure">
      <div class="lb__stage" data-lb-stage></div>
      <figcaption class="lb__caption">
        <p class="lb__text" data-lb-text></p>
        <p class="lb__meta mono" data-lb-meta></p>
      </figcaption>
    </figure>
    <p class="lb__count mono" data-lb-count></p>`;
  document.body.appendChild(root);

  const stage = root.querySelector<HTMLElement>('[data-lb-stage]')!;
  const text = root.querySelector<HTMLElement>('[data-lb-text]')!;
  const meta = root.querySelector<HTMLElement>('[data-lb-meta]')!;
  const count = root.querySelector<HTMLElement>('[data-lb-count]')!;
  const closeBtn = root.querySelector<HTMLButtonElement>('.lb__close')!;
  const prevBtn = root.querySelector<HTMLButtonElement>('.lb__arrow--prev')!;
  const nextBtn = root.querySelector<HTMLButtonElement>('.lb__arrow--next')!;

  let current: number = -1;
  let returnTo: HTMLElement | null = null;
  let swapTimer = 0;

  const byId = (id: string) => items.findIndex((m) => m.id === id);

  function metaLine(m: MediaItem): string {
    const parts: string[] = [];
    if (m.taken && m.takenSource === 'exif') parts.push(fmtTime(m.taken));
    if (m.type === 'video') parts.push(`${fmtDuration(m.duration ?? 0)} min`, m.size ? fmtMb(m.size) : '');
    if (m.gps) parts.push(fmtCoords(m.gps[0], m.gps[1]));
    if (m.camera) parts.push(m.camera);
    return parts.filter(Boolean).join(' · ');
  }

  function stopVideo() {
    const v = stage.querySelector('video');
    if (v) v.pause();
  }

  function fill(i: number) {
    const m = items[i];
    stopVideo();
    if (m.type === 'photo') {
      stage.innerHTML = `<img class="lb__img" src="${opts.root}${m.src}" width="${m.w}" height="${m.h}" alt="${esc(opts.captions[m.id] ?? '')}" style="background-image:url(${m.lqip})" decoding="async" />`;
      const img = stage.querySelector('img')!;
      const done = () => img.classList.add('is-loaded');
      if (img.complete && img.naturalWidth > 0) done();
      else img.addEventListener('load', done, { once: true });
    } else {
      stage.innerHTML = `<video class="lb__video" controls playsinline preload="metadata" poster="${opts.root}${m.poster}" width="${m.w}" height="${m.h}"><source src="${m.src}" type="video/mp4" />Dein Browser spielt dieses Video nicht ab.</video>`;
    }
    text.textContent = opts.captions[m.id] ?? '';
    text.hidden = !text.textContent;
    meta.textContent = metaLine(m);
    count.textContent = positionLabel(items, m.id);
    prevBtn.disabled = i === 0;
    nextBtn.disabled = i === items.length - 1;
    root.setAttribute('aria-label', `${m.type === 'video' ? 'Video' : 'Foto'} ${i + 1} von ${items.length}`);
    history.replaceState(null, '', `#${m.id}`);
    // Nachbarn vorladen
    for (const n of [i - 1, i + 1]) {
      const nb = items[n];
      if (nb?.type === 'photo') new Image().src = `${opts.root}${nb.src}`;
    }
  }

  function lock(on: boolean) {
    document.documentElement.classList.toggle('lb-lock', on);
  }

  function open(id: string, trigger?: HTMLElement | null) {
    const i = byId(id);
    if (i < 0) return;
    returnTo = trigger ?? null;
    current = i;
    root.hidden = false;
    lock(true);
    fill(i);
    requestAnimationFrame(() => root.classList.add('is-open'));
    closeBtn.focus({ preventScroll: true });
  }

  function close() {
    if (current < 0) return;
    current = -1;
    stopVideo();
    root.classList.remove('is-open');
    lock(false);
    history.replaceState(null, '', location.pathname + location.search);
    window.setTimeout(() => {
      if (current >= 0) return;
      root.hidden = true;
      stage.innerHTML = '';
    }, 260);
    returnTo?.focus({ preventScroll: true });
    returnTo = null;
  }

  function goto(i: number) {
    if (current < 0 || i < 0 || i >= items.length || i === current) return;
    const dir = i > current ? 1 : -1;
    current = i;
    stage.classList.add(dir > 0 ? 'is-out-left' : 'is-out-right');
    window.clearTimeout(swapTimer);
    swapTimer = window.setTimeout(() => {
      fill(i);
      stage.classList.remove('is-out-left', 'is-out-right');
    }, 140);
  }

  function setItems(next: MediaItem[]) {
    const openId = current >= 0 ? items[current]?.id : null;
    items = next;
    if (openId) {
      // Offen während des Wechsels (kommt praktisch nicht vor): Position neu bestimmen oder schliessen
      const i = byId(openId);
      if (i >= 0) {
        current = i;
        fill(i);
      } else close();
    }
  }

  closeBtn.addEventListener('click', close);
  root.querySelector('[data-lb-close]')!.addEventListener('click', close);
  prevBtn.addEventListener('click', () => goto(current - 1));
  nextBtn.addEventListener('click', () => goto(current + 1));

  document.addEventListener('keydown', (e) => {
    if (current < 0) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') goto(current - 1);
    else if (e.key === 'ArrowRight') goto(current + 1);
    else if (e.key === 'Tab') {
      const f = [...root.querySelectorAll<HTMLElement>('button:not(:disabled), video')];
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  });

  // Wischen: horizontale Geste auf der Bühne blättert, vertikale nach unten schliesst
  let sx = 0, sy = 0, tracking = false;
  stage.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).tagName === 'VIDEO') return;
    sx = e.clientX;
    sy = e.clientY;
    tracking = true;
  });
  stage.addEventListener('pointerup', (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    if (Math.abs(dx) > 48 && Math.abs(dy) < 80) goto(current + (dx < 0 ? 1 : -1));
    else if (dy > 90 && Math.abs(dx) < 60) close();
  });
  stage.addEventListener('pointercancel', () => (tracking = false));

  return { open, close, setItems };
}
