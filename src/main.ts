// NORDLYS — Einstiegspunkt. Reihenfolge: Daten rendern → Motion-Layer → Karte lazy.

import '@fontsource-variable/big-shoulders';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
import './styles/base.css';
import './styles/hero.css';
import './styles/sections.css';
import './styles/tools.css';
import './styles/dayview.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import { renderHero, renderRouteStats, renderRoutePanelDefault, renderDays, renderRules, renderAuroraGuide } from './render';
import { initDayView } from './dayview';
import { initCrew } from './crew';
import { initBudget } from './budget';
import { initPacking } from './packing';
import { initCountdown } from './countdown';
import { initMapLazy } from './map';
import { initThread } from './thread';
import { Aurora } from './aurora';
import { Starfield } from './stars';
import { prefersReducedMotion, chf } from './utils';

gsap.registerPlugin(ScrollTrigger);
const reduced = prefersReducedMotion();

// ---------- 1 · Inhalte aus den Daten rendern ----------
renderHero();
initCrew();
renderRouteStats();
renderRoutePanelDefault();
renderDays();
renderRules();
renderAuroraGuide();
initBudget();
initPacking();
initCountdown();
initDayView();

// ---------- 2 · Smooth Scrolling (Lenis) + ScrollTrigger-Brücke ----------
if (!reduced) {
  const lenis = new Lenis({ duration: 1.1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  // Tagesfenster offen → Seite hinter dem Overlay einfrieren
  window.addEventListener('nordlys:lock', () => lenis.stop());
  window.addEventListener('nordlys:unlock', () => lenis.start());
}

// ---------- 3 · Canvas-Himmel ----------
new Starfield(document.querySelector<HTMLCanvasElement>('.hero__stars')!);
const aurora = new Aurora(document.querySelector<HTMLCanvasElement>('.hero__aurora')!);
void aurora;

// ---------- 4 · Reveals & Hero-Choreografie ----------
if (reduced) {
  gsap.set('.will-reveal', { opacity: 1, y: 0 });
} else {
  // Hero: ein orchestrierter Moment beim Laden
  gsap
    .timeline({ defaults: { ease: 'power3.out' } })
    .from('.hero__kicker', { opacity: 0, y: 14, duration: 0.7 }, 0.15)
    .from('.hero__title', { opacity: 0, y: 34, duration: 1.1, letterSpacing: '0.12em' }, 0.3)
    .from('.hero__subline', { opacity: 0, y: 14, duration: 0.7 }, 0.7)
    .from('.hero__countdown', { opacity: 0, y: 18, duration: 0.7 }, 0.9)
    .from('.hero__cd-label', { opacity: 0, duration: 0.6 }, 1.1)
    .from('.hero__scrollhint', { opacity: 0, duration: 0.8 }, 1.3);

  // Berg-Silhouetten: leichte Parallaxe beim Wegscrollen
  gsap.to('.hero__ridge--far', { yPercent: 26, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__ridge--mid', { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__content', { yPercent: -10, opacity: 0.25, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 35%', scrub: true } });

  // Sektions-Header sanft rein
  document.querySelectorAll<HTMLElement>('.section .section__eyebrow, .section .section__title, .section .section__lead').forEach((el) => {
    gsap.from(el, { opacity: 0, y: 24, duration: 0.85, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
  });

  // Generische Karten-Reveals
  gsap.utils.toArray<HTMLElement>('.will-reveal').forEach((el, i) => {
    gsap.to(el, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: (i % 4) * 0.06, scrollTrigger: { trigger: el, start: 'top 90%' } });
  });
}

// ---------- 5 · Route-Stats-Counter ----------
document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
  const target = parseFloat(el.dataset.count!);
  if (reduced) {
    el.textContent = chf(target);
    return;
  }
  const obj = { v: 0 };
  ScrollTrigger.create({
    trigger: el,
    start: 'top 88%',
    once: true,
    onEnter: () =>
      gsap.to(obj, {
        v: target,
        duration: 1.6,
        ease: 'power2.out',
        onUpdate: () => (el.textContent = chf(Math.round(obj.v))),
      }),
  });
});

// ---------- 6 · 16-Tage-Band: horizontal auf Desktop ----------
const mm = gsap.matchMedia();
mm.add('(min-width: 1025px) and (prefers-reduced-motion: no-preference)', () => {
  const track = document.querySelector<HTMLElement>('.days__track')!;
  const progressEl = document.querySelector<HTMLElement>('[data-days-progress]')!;
  const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
  const tween = gsap.to(track, {
    x: () => -dist(),
    ease: 'none',
    scrollTrigger: {
      trigger: '#tage',
      start: 'top top',
      end: () => '+=' + dist(),
      pin: true,
      scrub: 0.6,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const day = Math.min(16, Math.max(1, Math.round(self.progress * 15) + 1));
        progressEl.textContent = `TAG ${String(day).padStart(2, '0')}/16`;
      },
    },
  });
  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
  };
});

// ---------- 7 · Faden + HUD, Karte lazy ----------
initThread();
initMapLazy();

// ---------- 8 · Easter Egg: 5× Polarstern → Kp 9 ----------
const star = document.querySelector<HTMLButtonElement>('.footer__star')!;
const toast = document.createElement('p');
toast.className = 'footer__toast';
toast.setAttribute('aria-live', 'polite');
star.insertAdjacentElement('afterend', toast);
let clicks = 0;
star.addEventListener('click', () => {
  clicks++;
  if (clicks >= 5) {
    window.dispatchEvent(new Event('nordlys:max'));
    document.querySelector('.footer')!.classList.add('footer--max');
    toast.textContent = 'Kp 9 — maximale Aktivität. Hochscrollen und schauen.';
    if (!reduced) gsap.fromTo(star, { rotate: 0 }, { rotate: 360, duration: 1.2, ease: 'power2.inOut' });
    clicks = 0;
  } else if (clicks >= 2) {
    toast.textContent = `Kp ${clicks + 4} …`;
  }
});

// ---------- 9 · Nachjustieren, wenn Fonts/Layout fertig sind ----------
window.addEventListener('load', () => ScrollTrigger.refresh());
