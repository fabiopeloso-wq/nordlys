// Einstiegspunkt der Proviant-Subseite. Bewusst schlank: keine Karte, kein GSAP, kein Lenis —
// die Seite ist eine Liste, die auch am Ladenregal mit schlechtem Empfang schnell dastehen muss.

import '@fontsource-variable/big-shoulders';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
import './styles/base.css';
import './styles/sections.css';
import './styles/tools.css';
import './styles/food.css';

import { initFood } from './food';
import { prefersReducedMotion } from './utils';

initFood();

// Reveals ohne GSAP: ein IntersectionObserver reicht für eine statische Seite.
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
    { rootMargin: '0px 0px -8% 0px' },
  );
  targets.forEach((el) => io.observe(el));
}
