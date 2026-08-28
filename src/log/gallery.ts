// Galerie in «Justified Rows» (Flickr-Prinzip): kein Bild wird beschnitten, jede Zeile füllt
// die Breite exakt, Hochformate und Panoramen bleiben, was sie sind. Layout aus den
// Seitenverhältnissen im Manifest, neu berechnet bei Resize. Thumbs lazy, LQIP als Blur-up.
// Zwei Stufen: zuerst die Auswahl des Tages (picks), «Alle Bilder zeigen» blendet den Rest
// chronologisch dazwischen ein — setItems() baut die Kacheln neu, Listener und Observer bleiben.

import type { MediaItem } from './types';
import { esc, fmtDuration, fmtMb, fmtTime, pad } from './render';

interface Opts {
  root: string;
  captions: Record<string, string>;
  onOpen: (id: string, trigger: HTMLElement) => void;
}

export interface Gallery {
  /** Kacheln neu aufbauen (z. B. Auswahl ↔ alle); bereits geladene Thumbs kommen aus dem Cache */
  setItems(items: MediaItem[]): void;
  items(): MediaItem[];
}

function targetHeight(width: number): number {
  if (width < 520) return 150;
  if (width < 900) return 200;
  if (width < 1300) return 240;
  return 270;
}

function itemHtml(m: MediaItem, i: number, total: number, opts: Opts, isNew: boolean): string {
  const cap = opts.captions[m.id] ?? '';
  const label = `${m.type === 'video' ? 'Video' : 'Foto'} ${i + 1} von ${total}${cap ? ': ' + cap : ''}`;
  const badge =
    m.type === 'video'
      ? `<span class="lg-badge mono"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5 L18 12 L8 18.5 Z"/></svg>${fmtDuration(m.duration ?? 0)}${m.size ? `<span class="lg-badge__size"> · ${fmtMb(m.size)}</span>` : ''}</span>`
      : m.taken
        ? `<span class="lg-time mono">${fmtTime(m.taken)}</span>`
        : '';
  return `
      <button type="button" class="lg-item lg-item--${m.type}${isNew ? ' is-new' : ''}" data-id="${m.id}" aria-label="${esc(label)}" style="background-image:url(${m.lqip})">
        <img src="${opts.root}${m.thumb}" width="${m.w}" height="${m.h}" alt="" loading="lazy" decoding="async" />
        ${badge}
      </button>`;
}

export function mountGallery(el: HTMLElement, initial: MediaItem[], opts: Opts): Gallery {
  let items: MediaItem[] = [];
  let nodes: HTMLElement[] = [];
  let ratios: number[] = [];

  // Blur-up: Thumb erst einblenden, wenn geladen (load bubbelt nicht → Capture-Phase)
  el.addEventListener(
    'load',
    (e) => {
      const img = e.target as HTMLElement;
      if (img.tagName === 'IMG') img.parentElement!.classList.add('is-loaded');
    },
    true
  );

  el.addEventListener('click', (e) => {
    const hit = (e.target as HTMLElement).closest<HTMLElement>('.lg-item');
    if (hit) opts.onOpen(hit.dataset.id!, hit);
  });

  function render(next: MediaItem[]) {
    // Neue Kacheln (beim Aufklappen) bekommen einen kurzen Einblend-Effekt, bekannte nicht
    const known = new Set(items.map((m) => m.id));
    items = next;
    el.innerHTML = items.map((m, i) => itemHtml(m, i, items.length, opts, known.size > 0 && !known.has(m.id))).join('');
    nodes = [...el.querySelectorAll<HTMLElement>('.lg-item')];
    ratios = items.map((m) => m.w / m.h);
    nodes.forEach((n) => {
      const img = n.querySelector('img')!;
      if (img.complete && img.naturalWidth > 0) n.classList.add('is-loaded');
    });
    el.classList.remove('is-laid-out');
    layout();
  }

  function layout() {
    const W = el.clientWidth;
    if (!W || !nodes.length) return;
    const target = targetHeight(W);
    // Der Gap kommt aus dem CSS (Mobile hat einen kleineren) — nie zwei Wahrheiten
    const GAP = parseFloat(getComputedStyle(el).columnGap) || 6;
    let row: number[] = [];
    let sum = 0;
    const apply = (idx: number[], h: number) => {
      const widths = idx.map((i) => Math.floor(ratios[i] * h));
      // Rundungsrest auf das letzte Element, damit die Zeile exakt schliesst (nur volle Zeilen)
      const used = widths.reduce((a, b) => a + b, 0) + (idx.length - 1) * GAP;
      if (h < target || idx.length > 1) {
        const diff = W - used;
        if (diff > 0 && diff < idx.length * 3) widths[widths.length - 1] += diff;
      }
      idx.forEach((i, k) => {
        nodes[i].style.width = `${widths[k]}px`;
        nodes[i].style.height = `${Math.round(h)}px`;
      });
    };
    for (let i = 0; i < ratios.length; i++) {
      row.push(i);
      sum += ratios[i];
      const widthAtTarget = sum * target + (row.length - 1) * GAP;
      if (widthAtTarget >= W) {
        apply(row, (W - (row.length - 1) * GAP) / sum);
        row = [];
        sum = 0;
      }
    }
    if (row.length) {
      // Letzte Zeile nicht auf Breite ziehen — höchstens leicht grösser als Zielhöhe
      const fit = (W - (row.length - 1) * GAP) / sum;
      apply(row, Math.min(fit, target * 1.15));
    }
    el.classList.add('is-laid-out');
  }

  render(initial);
  let t = 0;
  const ro = new ResizeObserver(() => {
    window.clearTimeout(t);
    t = window.setTimeout(layout, 80);
  });
  ro.observe(el);

  return { setItems: render, items: () => items };
}

/** Index eines Items in der Galerie-Reihenfolge — für «07/27» in der Lightbox. */
export const positionLabel = (items: MediaItem[], id: string) => `${pad(items.findIndex((m) => m.id === id) + 1)}/${pad(items.length)}`;
