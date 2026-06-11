// Budget-Rechner: Defaults aus budget.json, jede Annahme mit Quelle-Tooltip,
// Breakdown als selbstgebaute SVG-Balken, animierte Totale.

import gsap from 'gsap';
import budget from './data/budget.json';
import { chf } from './utils';
import { prefersReducedMotion } from './utils';

type Nums = {
  fuelPrice: number; consumption: number; km: number; food: number;
  toll: number; campNights: number; campPrice: number; misc: number; reserve: number;
};

const BAR_COLORS: Record<string, string> = {
  Sprit: 'var(--aurora-cyan)',
  Fähren: 'var(--aurora-green)',
  Maut: 'var(--aurora-violet)',
  Essen: 'var(--ember)',
  Camping: '#f4c98a',
  'Gas & Kleinkram': '#8fa3bc',
  Reserve: '#5c6f8c',
};

function tipFor(key: string): string {
  const a = budget.assumptions.find((x) => x.key === key);
  return a ? a.source : '';
}

function field(id: string, label: string, value: number, step: string, tipKey?: string): string {
  const tip = tipKey ? tipFor(tipKey) : '';
  return `
    <div class="field">
      <label class="field__label" for="bf-${id}">${label}
        ${tip ? `<span class="tip" tabindex="0" role="note" aria-label="Quelle">i<span class="tip__text">${tip}</span></span>` : ''}
      </label>
      <input type="number" id="bf-${id}" data-bf="${id}" value="${value}" step="${step}" min="0" inputmode="decimal" />
    </div>`;
}

export function initBudget() {
  const wrap = document.querySelector('[data-render="budget"]')!;
  const d = budget.defaults;
  const reduced = prefersReducedMotion();

  wrap.innerHTML = `
    <form class="budget__form will-reveal" novalidate>
      <h3>Annahmen — alle editierbar</h3>
      ${field('fuelPrice', 'Spritpreis Ø (CHF/l)', d.fuelPriceChf, '0.01', 'fuelPriceChf')}
      <div class="field--row field">
        ${field('consumption', 'Verbrauch (l/100 km)', d.consumptionPetrol, '0.1', 'consumptionPetrol')}
        ${field('km', 'Gesamt-km', d.totalKm, '50', 'totalKm')}
      </div>
      <div class="field--row field">
        ${field('food', 'Essen / Tag / Person (CHF)', d.foodPerDayPerPerson, '1', 'foodPerDayPerPerson')}
        ${field('toll', 'Maut-Pauschale (CHF)', d.tollChf, '5', 'tollChf')}
      </div>
      <div class="field--row field">
        ${field('campNights', 'Camping-Nächte', d.campingNights, '1', 'campingPerNight')}
        ${field('campPrice', 'Camping / Nacht (CHF)', d.campingPerNight, '5')}
      </div>
      <div class="field--row field">
        ${field('misc', 'Gas & Kleinkram (CHF)', d.miscChf, '5', 'miscChf')}
        ${field('reserve', 'Reserve (%)', d.reservePct, '1')}
      </div>
      <h3 style="margin-top:0.5rem">Fähren &amp; Brücken</h3>
      <div class="budget__ferries">
        ${budget.ferries.map((f) => `
          <label class="ferry">
            <input type="checkbox" data-ferry="${f.id}" ${f.on ? 'checked' : ''} />
            <span class="ferry__box" aria-hidden="true"></span>
            <span>${f.name}<span class="tip" tabindex="0" role="note" aria-label="Hinweis" style="margin-left:.45rem">i<span class="tip__text">${f.note}</span></span></span>
            <span class="ferry__price">${f.chf} CHF</span>
          </label>`).join('')}
      </div>
    </form>
    <div class="budget__out will-reveal" aria-live="polite">
      <h3>Hochrechnung — sparsamer Stil</h3>
      <div class="budget__totals">
        <div class="budget__pp"><span>Pro Person</span><b data-out="pp">0</b></div>
        <div class="budget__total"><span>Total · 4 Mann</span><b data-out="total">0</b></div>
      </div>
      <svg class="budget__bars" data-bars role="img" aria-label="Kosten-Aufschlüsselung als Balkendiagramm"></svg>
      <p class="budget__note">Kurse fix per ${budget.stand}: 1 € = ${budget.rates.EUR} · 1 NOK = ${budget.rates.NOK} · 1 SEK = ${budget.rates.SEK} CHF. Vor Abreise nochmals prüfen.</p>
    </div>`;

  const extras = document.querySelector('[data-render="budget-extras"]')!;
  extras.innerHTML = `
    <div class="budget__savings will-reveal">
      <h4>${budget.savings.title}</h4>
      <p>${budget.savings.text}</p>
      <p class="beer">→ ${budget.savings.beerFact}</p>
    </div>
    <div class="budget__fines will-reveal">
      <h4>${budget.fines.title}</h4>
      <p class="limits">${budget.fines.limits}</p>
      <table><tbody>
        ${budget.fines.rows.map((r) => `<tr><td>${r.over}</td><td>${r.fine} ≈ ${r.chf} CHF</td></tr>`).join('')}
      </tbody></table>
      <p class="note">${budget.fines.note}</p>
    </div>`;

  const read = (): Nums => {
    const get = (id: string, fb: number) => {
      const el = wrap.querySelector<HTMLInputElement>(`[data-bf="${id}"]`);
      const v = el ? parseFloat(el.value) : NaN;
      return Number.isFinite(v) && v >= 0 ? v : fb;
    };
    return {
      fuelPrice: get('fuelPrice', d.fuelPriceChf),
      consumption: get('consumption', d.consumptionPetrol),
      km: get('km', d.totalKm),
      food: get('food', d.foodPerDayPerPerson),
      toll: get('toll', d.tollChf),
      campNights: get('campNights', d.campingNights),
      campPrice: get('campPrice', d.campingPerNight),
      misc: get('misc', d.miscChf),
      reserve: get('reserve', d.reservePct),
    };
  };

  const shown = { total: 0, pp: 0 };
  const outTotal = wrap.querySelector('[data-out="total"]')!;
  const outPp = wrap.querySelector('[data-out="pp"]')!;
  const barsSvg = wrap.querySelector<SVGSVGElement>('[data-bars]')!;

  function compute() {
    const n = read();
    const fuel = (n.km / 100) * n.consumption * n.fuelPrice;
    const ferries = budget.ferries.reduce((sum, f) => {
      const cb = wrap.querySelector<HTMLInputElement>(`[data-ferry="${f.id}"]`);
      return sum + (cb?.checked ? f.chf : 0);
    }, 0);
    const food = n.food * d.persons * d.days;
    const camping = n.campNights * n.campPrice;
    const sub = fuel + ferries + n.toll + food + camping + n.misc;
    const reserve = (sub * n.reserve) / 100;
    const total = sub + reserve;
    return {
      total,
      pp: total / d.persons,
      items: [
        ['Sprit', fuel], ['Fähren', ferries], ['Maut', n.toll], ['Essen', food],
        ['Camping', camping], ['Gas & Kleinkram', n.misc], ['Reserve', reserve],
      ] as [string, number][],
    };
  }

  function drawBars(items: [string, number][], animate: boolean) {
    // viewBox an die echte Breite koppeln, sonst werden die Labels auf Mobile winzig
    const W = Math.max(300, Math.round(barsSvg.clientWidth) || 560);
    const ROW = 42;
    const LABEL_Y = 12;
    const max = Math.max(...items.map(([, v]) => v), 1);
    const H = items.length * ROW;
    barsSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    barsSvg.innerHTML = items
      .map(([label, v], i) => {
        const y = i * ROW;
        const bw = Math.max(2, (v / max) * W);
        return `
          <g>
            <text x="0" y="${y + LABEL_Y}">${label}</text>
            <text class="val" x="${W}" y="${y + LABEL_Y}">${chf(v)} CHF</text>
            <rect class="track" x="0" y="${y + 20}" width="${W}" height="7"></rect>
            <rect class="fill" x="0" y="${y + 20}" width="${animate ? 2 : bw}" height="7" fill="${BAR_COLORS[label]}" data-w="${bw}"></rect>
          </g>`;
      })
      .join('');
    if (animate) {
      barsSvg.querySelectorAll<SVGRectElement>('rect.fill').forEach((r, i) => {
        gsap.to(r, { attr: { width: parseFloat(r.dataset.w!) }, duration: 0.7, delay: i * 0.05, ease: 'power3.out' });
      });
    }
  }

  let first = true;
  function update() {
    const { total, pp, items } = compute();
    if (reduced) {
      shown.total = total; shown.pp = pp;
      outTotal.textContent = chf(total);
      outPp.textContent = chf(pp);
      drawBars(items, false);
    } else {
      gsap.to(shown, {
        total, pp, duration: first ? 1.1 : 0.45, ease: 'power2.out',
        onUpdate: () => {
          outTotal.textContent = chf(shown.total);
          outPp.textContent = chf(shown.pp);
        },
      });
      drawBars(items, first);
      if (!first) {
        barsSvg.querySelectorAll<SVGRectElement>('rect.fill').forEach((r) => {
          gsap.to(r, { attr: { width: parseFloat(r.dataset.w!) }, duration: 0.45, ease: 'power2.out' });
        });
      }
    }
    first = false;
  }

  wrap.addEventListener('input', update);
  wrap.addEventListener('change', update);
  let rt = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(rt);
    rt = window.setTimeout(update, 200);
  });
  update();
}
