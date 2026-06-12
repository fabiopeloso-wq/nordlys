// Crew-Akten: 4 Karten, ein einzelnes Dossier-Panel, das im Grid hinter die
// aktive Karte wandert (grid-column 1/-1 → öffnet direkt unter der Karten-Zeile,
// auf Mobile direkt unter der getippten Karte). GSAP-Höhenanimation, gestaffelte
// Inhalte, Stempel-Slam. prefers-reduced-motion → harter Toggle ohne Tweens.

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import crew from './data/crew.json';
import { prefersReducedMotion } from './utils';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

type Member = (typeof crew.members)[number];

const STAMP = 'Einsatzbereit';

function dossierHtml(m: Member, i: number): string {
  const no = String(i + 1).padStart(2, '0');
  return `
    <span class="crew__dossier-notch" aria-hidden="true"></span>
    <div class="crew__dossier-inner">
      <span class="crew__dossier-mark" aria-hidden="true">${esc(m.name[0])}</span>
      <header class="crew__dossier-head" data-d-reveal>
        <p class="crew__dossier-eyebrow mono">Akte ${no}/04 · Ressort: ${esc(m.ressort)}</p>
        <h4 class="crew__dossier-title">${esc(m.role)}</h4>
        <p class="crew__dossier-mandat">${esc(m.mandat)}</p>
        <span class="crew__stamp mono" aria-hidden="true">${STAMP}</span>
      </header>
      <div class="crew__dossier-cols">
        <section class="crew__dossier-col" data-d-reveal>
          <h5 class="crew__dossier-h mono">Verantwortlich für</h5>
          <ol class="crew__duties">
            ${m.duties
              .map(
                (d, j) => `
            <li>
              <span class="crew__duty-no mono">${String(j + 1).padStart(2, '0')}</span>
              <div><b>${esc(d.t)}</b><span>${esc(d.d)}</span></div>
            </li>`
              )
              .join('')}
          </ol>
        </section>
        <section class="crew__dossier-col" data-d-reveal>
          <h5 class="crew__dossier-h mono">Vor Abfahrt</h5>
          <ul class="crew__prep">
            ${m.prep
              .map(
                (p) => `
            <li><span>${esc(p.task)}</span><em class="mono${p.due === 'sofort' ? ' is-hot' : ''}">${esc(p.due)}</em></li>`
              )
              .join('')}
          </ul>
          <p class="crew__stat"><span class="mono">${esc(m.stat.label)}</span><b>${esc(m.stat.value)}</b></p>
        </section>
        <section class="crew__dossier-col crew__dossier-col--fire" data-d-reveal>
          <h5 class="crew__dossier-h mono">Wenn's brennt</h5>
          <p class="crew__fire-sub mono">Remote-Protokoll · ein Kunde ruft</p>
          <p class="crew__fire-text">${esc(m.emergency)}</p>
        </section>
      </div>
    </div>`;
}

export function initCrew() {
  const grid = document.querySelector<HTMLElement>('[data-render="crew"]')!;
  const reduced = prefersReducedMotion();

  grid.innerHTML = crew.members
    .map(
      (m, i) => `
      <article class="crew__card will-reveal${i % 2 ? ' crew__card--alt' : ''}" data-crew="${m.id}">
        <div class="crew__avatar" style="--rot:${i * 90}deg"><span class="crew__initial" style="background-image:linear-gradient(${45 + i * 70}deg, var(--aurora-green), var(--aurora-cyan), var(--aurora-violet))">${esc(m.name[0])}</span></div>
        <h3 class="crew__name">${esc(m.name)}</h3>
        <p class="crew__role">${esc(m.role)}</p>
        <p class="crew__line">${esc(m.line)}</p>
        <button type="button" class="crew__open mono" aria-expanded="false" aria-controls="crew-dossier" aria-label="Akte von ${esc(m.name)} öffnen">
          <span>Akte ${String(i + 1).padStart(2, '0')}</span>
          <span class="crew__open-icon" aria-hidden="true">+</span>
        </button>
      </article>`
    )
    .join('');

  const panel = document.createElement('div');
  panel.className = 'crew__dossier';
  panel.id = 'crew-dossier';
  panel.setAttribute('role', 'region');
  panel.hidden = true;

  const cards = [...grid.querySelectorAll<HTMLElement>('.crew__card')];
  const toggles = cards.map((c) => c.querySelector<HTMLButtonElement>('.crew__open')!);

  let openId: string | null = null;
  let anim: gsap.core.Timeline | null = null;

  function setExpanded(id: string | null) {
    cards.forEach((c, i) => {
      const on = c.dataset.crew === id;
      c.classList.toggle('is-open', on);
      toggles[i].setAttribute('aria-expanded', String(on));
      toggles[i].setAttribute('aria-label', `Akte von ${crew.members[i].name} ${on ? 'schliessen' : 'öffnen'}`);
    });
  }

  // Raute + gestrichelte Anschluss-Linie unter der Mitte der aktiven Karte (Faden-Vokabular)
  function placeNotch(card: HTMLElement) {
    const c = card.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    panel.style.setProperty('--notch-x', `${Math.round(c.left + c.width / 2 - p.left)}px`);
  }

  // Das Panel kommt ans Ende der Kartenreihe der aktiven Karte — nicht direkt
  // hinter die Karte, sonst rutscht der Rest der Reihe unters Dossier.
  function anchorFor(card: HTMLElement): HTMLElement {
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    const i = cards.indexOf(card);
    return cards[Math.min(cards.length, (Math.floor(i / cols) + 1) * cols) - 1];
  }

  function openFor(card: HTMLElement) {
    const i = cards.indexOf(card);
    const m = crew.members[i];
    panel.innerHTML = dossierHtml(m, i);
    panel.setAttribute('aria-label', `Akte ${m.name} — ${m.role}`);
    anchorFor(card).insertAdjacentElement('afterend', panel);
    panel.hidden = false;
    openId = m.id;
    setExpanded(m.id);
    placeNotch(card);

    if (reduced) {
      ScrollTrigger.refresh();
      return;
    }

    panel.style.height = 'auto';
    const h = panel.offsetHeight;
    const stamp = panel.querySelector('.crew__stamp')!;
    anim?.kill();
    anim = gsap
      .timeline({
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          panel.style.height = 'auto';
          ScrollTrigger.refresh();
        },
      })
      .fromTo(panel, { height: 0 }, { height: h, duration: 0.55, ease: 'power3.inOut' })
      .from(panel.querySelectorAll('[data-d-reveal]'), { opacity: 0, y: 22, duration: 0.5, stagger: 0.07 }, '-=0.22')
      // Stempel-Slam: gross & durchsichtig reinfallen lassen, kurz nachfedern
      .fromTo(stamp, { opacity: 0, scale: 2.4, rotate: 4 }, { opacity: 1, scale: 0.94, rotate: -8, duration: 0.26, ease: 'expo.in' }, '-=0.1')
      .to(stamp, { scale: 1, rotate: -8, duration: 0.22, ease: 'back.out(4)' });
  }

  function close(after?: () => void) {
    openId = null;
    setExpanded(null);
    const finish = () => {
      panel.hidden = true;
      panel.style.height = '';
      if (after) after();
      else ScrollTrigger.refresh();
    };
    if (reduced) {
      finish();
      return;
    }
    anim?.kill();
    anim = gsap.timeline({ onComplete: finish }).to(panel, { height: 0, duration: 0.3, ease: 'power2.in' });
  }

  function toggle(card: HTMLElement) {
    if (openId === card.dataset.crew) close();
    else if (openId) close(() => openFor(card));
    else openFor(card);
  }

  cards.forEach((card) => card.addEventListener('click', () => toggle(card)));

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !openId) return;
    const i = cards.findIndex((c) => c.dataset.crew === openId);
    close();
    toggles[i]?.focus();
  });

  // Bei Resize kann sich die Spaltenzahl ändern → Panel neu verankern + Notch nachführen
  let rt = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(rt);
    rt = window.setTimeout(() => {
      const card = openId && cards.find((c) => c.dataset.crew === openId);
      if (!card) return;
      anchorFor(card).insertAdjacentElement('afterend', panel);
      placeNotch(card);
    }, 200);
  });
}
