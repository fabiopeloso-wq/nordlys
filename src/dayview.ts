// Tagesfenster («Briefing»): Vollbild-Overlay pro Etappe — grosses Stimmungsbild
// (lokal gebundelt, Wikimedia Commons), Tages-Timeline im Faden-Vokabular,
// Highlight mit Fakten, Plan B. Klick auf eine Tageskarte öffnet es; das
// gepinnte Horizontal-Band bleibt unangetastet (Overlay statt In-place-Expand).
// ←/→ blättert zwischen Tagen, Esc schliesst. prefers-reduced-motion → ohne Tweens.

import gsap from 'gsap';
import itinerary from './data/itinerary.json';
import { STAY_ICONS, STAY_LABELS } from './render';
import { prefersReducedMotion, shortDate } from './utils';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

type Day = (typeof itinerary.days)[number];

const BASE = import.meta.env.BASE_URL;
const pad = (n: number) => String(n).padStart(2, '0');

function contentHtml(d: Day): string {
  const coords = `${d.coord.lat.toFixed(4)}° N · ${d.coord.lng.toFixed(4)}° E`;
  const stats = [`${d.km} km`, d.drive, d.ferry ? `Fähre ${d.ferry}` : null].filter(Boolean).join(' · ');
  return `
    <figure class="dayview__media">
      <img src="${BASE}${d.image.src}" alt="${esc(d.image.alt)}" decoding="async" />
      <span class="dayview__ghost" aria-hidden="true">${pad(d.day)}</span>
      <figcaption class="dayview__head" data-dv-reveal>
        <p class="dayview__eyebrow mono">Briefing · Tag ${pad(d.day)}/16 · ${shortDate(d.date)}</p>
        <h3 class="dayview__title" id="dayview-title">${esc(d.title)}</h3>
        <p class="dayview__route">${esc(d.route)} — ${esc(stats)}</p>
      </figcaption>
      <p class="dayview__coords mono" aria-hidden="true">${coords}</p>
    </figure>
    <div class="dayview__body">
      <section class="dayview__col" data-dv-reveal>
        <h4 class="dayview__h mono">So könnte der Tag laufen</h4>
        <ol class="dayview__plan">
          ${d.plan
            .map(
              (p) => `
          <li>
            <p class="dayview__when"><span class="mono">${esc(p.t)}</span><b>${esc(p.title)}</b></p>
            <p class="dayview__what">${esc(p.text)}</p>
          </li>`
            )
            .join('')}
        </ol>
      </section>
      <aside class="dayview__col" data-dv-reveal>
        <h4 class="dayview__h dayview__h--peak mono">Highlight des Tages</h4>
        <p class="dayview__peak-name">${esc(d.peak.name)}</p>
        <p class="dayview__peak-text">${esc(d.peak.text)}</p>
        <dl class="dayview__facts">
          ${d.peak.facts.map((f) => `<div><dt>${esc(f.k)}</dt><dd>${esc(f.v)}</dd></div>`).join('')}
        </dl>
        ${d.planB ? `<div class="dayview__planb"><b>Plan B</b><p>${esc(d.planB)}</p></div>` : ''}
        <div class="day-card__stay day-card__stay--${d.stay.type} dayview__stay">
          ${STAY_ICONS[d.stay.type]}
          <div><b>${STAY_LABELS[d.stay.type]}</b>${esc(d.stay.text)}</div>
        </div>
      </aside>
    </div>
    <footer class="dayview__foot" data-dv-reveal>
      <a class="dayview__credit mono" href="${d.image.source}" target="_blank" rel="noopener">${esc(d.image.credit)}</a>
      <div class="dayview__nav">
        <button type="button" class="dayview__navbtn mono" data-dv-prev ${d.day === 1 ? 'disabled' : ''}>← Tag ${pad(Math.max(1, d.day - 1))}</button>
        <span class="dayview__navpos mono">${pad(d.day)}/16</span>
        <button type="button" class="dayview__navbtn mono" data-dv-next ${d.day === 16 ? 'disabled' : ''}>Tag ${pad(Math.min(16, d.day + 1))} →</button>
      </div>
    </footer>`;
}

export function initDayView() {
  const reduced = prefersReducedMotion();
  const root = document.createElement('div');
  root.className = 'dayview';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'dayview-title');
  root.hidden = true;
  root.innerHTML = `
    <div class="dayview__backdrop" data-dv-close></div>
    <div class="dayview__panel" data-lenis-prevent tabindex="-1">
      <button type="button" class="dayview__close" aria-label="Briefing schliessen">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" aria-hidden="true"><path d="M6 6 L18 18 M18 6 L6 18"/></svg>
      </button>
      <div class="dayview__content"></div>
    </div>`;
  document.body.appendChild(root);

  const panel = root.querySelector<HTMLElement>('.dayview__panel')!;
  const content = root.querySelector<HTMLElement>('.dayview__content')!;
  const closeBtn = root.querySelector<HTMLButtonElement>('.dayview__close')!;

  let openDay: number | null = null;
  let returnTo: HTMLElement | null = null;
  let anim: gsap.core.Timeline | null = null;

  function preloadNeighbours(day: number) {
    [day - 1, day + 1].forEach((n) => {
      const d = itinerary.days.find((x) => x.day === n);
      if (d) new Image().src = `${BASE}${d.image.src}`;
    });
  }

  function fill(day: number) {
    const d = itinerary.days.find((x) => x.day === day);
    if (!d) return;
    openDay = day;
    content.innerHTML = contentHtml(d);
    root.setAttribute('aria-label', `Briefing Tag ${d.day} — ${d.title}`);
    content.querySelector('[data-dv-prev]')!.addEventListener('click', () => goto(day - 1));
    content.querySelector('[data-dv-next]')!.addEventListener('click', () => goto(day + 1));
    preloadNeighbours(day);
  }

  function lock(on: boolean) {
    document.documentElement.classList.toggle('dv-lock', on);
    window.dispatchEvent(new Event(on ? 'nordlys:lock' : 'nordlys:unlock'));
  }

  function open(day: number, trigger: HTMLElement) {
    returnTo = trigger;
    fill(day);
    root.hidden = false;
    lock(true);
    panel.scrollTop = 0;
    panel.focus({ preventScroll: true });

    if (reduced) return;
    const img = content.querySelector('img')!;
    anim?.kill();
    anim = gsap
      .timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.28, ease: 'power1.out' })
      .fromTo(panel, { y: 44, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, '-=0.12')
      .fromTo(img, { scale: 1.07 }, { scale: 1, duration: 1.1, ease: 'power2.out' }, '<')
      .from(content.querySelectorAll('[data-dv-reveal]'), { opacity: 0, y: 20, duration: 0.45, stagger: 0.08 }, '-=0.85');
  }

  function close() {
    if (openDay === null) return;
    openDay = null;
    const finish = () => {
      root.hidden = true;
      lock(false);
      returnTo?.focus({ preventScroll: true });
      returnTo = null;
    };
    if (reduced) {
      finish();
      return;
    }
    anim?.kill();
    anim = gsap.timeline({ onComplete: finish }).to(root, { opacity: 0, duration: 0.22, ease: 'power1.in' });
  }

  function goto(day: number) {
    if (day < 1 || day > 16 || openDay === null) return;
    if (reduced) {
      fill(day);
      panel.scrollTop = 0;
      return;
    }
    anim?.kill();
    anim = gsap
      .timeline()
      .to(content, { opacity: 0, x: day > openDay ? -18 : 18, duration: 0.18, ease: 'power1.in' })
      .add(() => {
        fill(day);
        panel.scrollTop = 0;
      })
      .fromTo(content, { opacity: 0, x: day > (openDay ?? day) ? 18 : -18 }, { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' });
  }

  // Delegiert: Tageskarten (ganze Fläche) + jedes Element mit data-open-day
  // (z. B. der Briefing-Button im Routen-Panel der Karte)
  document.addEventListener('click', (e) => {
    const hit = (e.target as HTMLElement).closest<HTMLElement>('.day-card, [data-open-day]');
    if (!hit || root.contains(hit)) return;
    const day = Number(hit.dataset.day ?? hit.dataset.openDay);
    const focusTarget = hit.classList.contains('day-card') ? hit.querySelector<HTMLElement>('.day-card__open')! : hit;
    open(day, focusTarget);
  });

  closeBtn.addEventListener('click', close);
  root.querySelector('[data-dv-close]')!.addEventListener('click', close);

  document.addEventListener('keydown', (e) => {
    if (openDay === null) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') goto(openDay - 1);
    else if (e.key === 'ArrowRight') goto(openDay + 1);
    else if (e.key === 'Tab') {
      // Minimaler Fokus-Ring: Tab bleibt im Dialog
      const f = [...root.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]')];
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  });
}
