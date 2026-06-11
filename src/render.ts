// Daten-getriebene Renderer: UI entsteht vollständig aus src/data/*.json + trip.config.js

import { TRIP } from './trip.config.js';
import routeData from './data/route.json';
import itinerary from './data/itinerary.json';
import rules from './data/rules.json';
import aurora from './data/aurora.json';
import { shortDate } from './utils';

const STAY_ICONS: Record<string, string> = {
  zelt: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" aria-hidden="true"><path d="M12 4.5 L3 19.5 H9.5 L12 14.5 L14.5 19.5 H21 Z"/><path d="M12 4.5 L12 8"/></svg>',
  auto: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" aria-hidden="true"><path d="M4 16 L5 11.5 C5.3 10.3 6.1 9.5 7.5 9.5 H16.5 C17.9 9.5 18.7 10.3 19 11.5 L20 16 M4 16 H20 M4 16 V18 M20 16 V18"/><circle cx="8" cy="16" r="1.4"/><circle cx="16" cy="16" r="1.4"/></svg>',
  camping: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" aria-hidden="true"><path d="M8 9 a4 4 0 0 1 8 0 V10.5 H8 Z"/><path d="M9 14 v1.5 M12 14 v2.5 M15 14 v1.5"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" aria-hidden="true"><path d="M4.5 11 L12 4.5 L19.5 11 V19.5 H4.5 Z"/></svg>',
};

const STAY_LABELS: Record<string, string> = {
  zelt: 'Wildcamp · Zelt',
  auto: 'Nacht im Auto',
  camping: 'Camping · Dusch-Stopp',
  home: 'Daheim',
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export function renderCrew() {
  const el = document.querySelector('[data-render="crew"]')!;
  el.innerHTML = TRIP.crew
    .map(
      (m: { name: string; role: string; line: string }, i: number) => `
      <article class="crew__card will-reveal">
        <div class="crew__avatar" style="--rot:${i * 90}deg"><span class="crew__initial" style="background-image:linear-gradient(${45 + i * 70}deg, var(--aurora-green), var(--aurora-cyan), var(--aurora-violet))">${esc(m.name[0])}</span></div>
        <h3 class="crew__name">${esc(m.name)}</h3>
        <p class="crew__role">${esc(m.role)}</p>
        <p class="crew__line">${esc(m.line)}</p>
      </article>`
    )
    .join('');
}

export function renderRouteStats() {
  const s = routeData.summary;
  const el = document.querySelector('[data-render="route-stats"]')!;
  const stat = (num: number, suffix: string, label: string) =>
    `<div class="route__stat will-reveal"><span class="route__stat-num"><span data-count="${num}">0</span><em>${suffix}</em></span><span class="route__stat-label">${label}</span></div>`;
  el.innerHTML =
    stat(s.totalKm, ' km', 'Gesamtstrecke') +
    stat(s.driveHours, ' h', 'Reine Fahrzeit') +
    stat(s.countries, '', 'Länder') +
    stat(s.ferries, '', 'Fähren');
}

export function renderRoutePanelDefault() {
  const el = document.querySelector('[data-render="route-panel"]')!;
  const s = routeData.summary;
  el.innerHTML = `
    <p class="route__panel-day mono">Die Schleife</p>
    <h3 class="route__panel-title">Einmal Arktis und zurück</h3>
    <div class="route__legs">
      <div class="route__leg"><b>${esc(s.legOut.label)}</b><span>${s.legOut.km} km · ${esc(s.legOut.days)} — Autobahn bis Töre, dann E10 bis ans Meer.</span></div>
      <div class="route__leg route__leg--back"><b>${esc(s.legBack.label)}</b><span>${s.legBack.km} km · ${esc(s.legBack.days)} — Fähre, Helgeland, Atlantikstrasse, Trollstigen, Geiranger.</span></div>
    </div>
    <p class="route__panel-hint">Klick auf einen Tages-Marker für Etappe, Camp-Tipp und Highlights.</p>`;
}

export function renderRoutePanelDay(dayNum: number) {
  const d = itinerary.days.find((x) => x.day === dayNum);
  if (!d) return;
  const el = document.querySelector('[data-render="route-panel"]')!;
  el.innerHTML = `
    <p class="route__panel-day mono">Tag ${String(d.day).padStart(2, '0')}/16 · ${shortDate(d.date)}</p>
    <h3 class="route__panel-title">${esc(d.title)}</h3>
    <p class="route__panel-route">${esc(d.route)}</p>
    <div class="route__panel-stats">
      <div><b>${d.km}</b><span>km</span></div>
      <div><b>${esc(d.drive)}</b><span>Fahrzeit</span></div>
      ${d.ferry ? `<div><b>Fähre</b><span>${esc(d.ferry)}</span></div>` : ''}
    </div>
    <ul class="route__panel-high">${d.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
    <p class="route__panel-stay"><b>${STAY_LABELS[d.stay.type]}</b> — ${esc(d.stay.text)}</p>`;
}

export function renderDays() {
  const el = document.querySelector('[data-render="days"]')!;
  el.innerHTML = itinerary.days
    .map((d) => {
      const lofoten = d.day >= 5 && d.day <= 9 ? ' day-card--lofoten' : '';
      return `
      <article class="day-card${lofoten}" data-day="${d.day}">
        <div class="day-card__top">
          <span class="day-card__num">${String(d.day).padStart(2, '0')}<small>/16</small></span>
          <span class="day-card__date mono">${shortDate(d.date)}</span>
        </div>
        <h3 class="day-card__title">${esc(d.title)}</h3>
        <p class="day-card__route">${esc(d.route)}</p>
        <div class="day-card__stats">
          <span><b>${d.km}</b> km</span>
          <span><b>${esc(d.drive)}</b></span>
          ${d.ferry ? `<span>Fähre · ${esc(d.ferry)}</span>` : ''}
        </div>
        <ul class="day-card__high">${d.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
        <div class="day-card__stay day-card__stay--${d.stay.type}">
          ${STAY_ICONS[d.stay.type]}
          <div><b>${STAY_LABELS[d.stay.type]}</b>${esc(d.stay.text)}</div>
        </div>
      </article>`;
    })
    .join('');
}

export function renderRules() {
  const grid = document.querySelector('[data-render="rules"]')!;
  grid.innerHTML = rules.countries
    .map(
      (c) => `
      <article class="rule-card rule-card--${c.verdict} will-reveal">
        <span class="rule-card__code" aria-hidden="true">${c.code}</span>
        <h3 class="rule-card__name">${esc(c.name)}</h3>
        <p class="rule-card__verdict">${esc(c.verdictLabel)}</p>
        <dl class="rule-card__rows">
          <div><dt>Zelt</dt><dd>${esc(c.zelt)}</dd></div>
          <div><dt>Auto</dt><dd>${esc(c.auto)}</dd></div>
          <div><dt>Feuer</dt><dd>${esc(c.feuer)}</dd></div>
          <div><dt>Busse-Risiko</dt><dd class="is-busse">${esc(c.busse)}</dd></div>
        </dl>
        <p class="rule-card__tip">${esc(c.tipp)}</p>
        <p class="rule-card__source mono">${esc(c.source)}</p>
      </article>`
    )
    .join('');

  const lof = rules.lofoten;
  document.querySelector('[data-render="rules-lofoten"]')!.innerHTML = `
    <h3>${esc(lof.title)}</h3>
    <p>${esc(lof.intro)}</p>
    <div class="rules__lofoten-cols">
      <div class="rules__col--banned"><h4>Zelten verboten</h4><ul>${lof.banned.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></div>
      <div class="rules__col--allowed"><h4>Legal &amp; gut</h4><ul>${lof.allowed.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>
    </div>
    <p class="rules__lofoten-map mono">${esc(lof.map)} · ${esc(lof.source)}</p>`;

  document.querySelector('[data-render="rules-lnt"]')!.innerHTML = rules.leaveNoTrace
    .map(
      (r, i) => `
      <div class="lnt will-reveal">
        <span class="lnt__num">0${i + 1}</span>
        <h4 class="lnt__title">${esc(r.title)}</h4>
        <p class="lnt__text">${esc(r.text)}</p>
      </div>`
    )
    .join('');
}

export function renderAuroraGuide() {
  const el = document.querySelector('[data-render="aurora"]')!;
  const kp = aurora.kp;
  const markerPos = ((kp.threshold + 0.5) / 10) * 100;
  el.innerHTML = `
    <div class="guide__grid">
      <div class="guide__panel will-reveal">
        <h3>Die Kp-Skala</h3>
        <p>${esc(kp.explainer)}</p>
        <div class="kp__band" role="img" aria-label="Kp-Skala von 0 bis 9, ab Kp ${kp.threshold} lohnt es sich auf den Lofoten">
          <span class="kp__marker" style="left:${markerPos}%">${esc(kp.thresholdLabel)}</span>
        </div>
        <div class="kp__ticks">${Array.from({ length: 10 }, (_, i) => `<span>${i}</span>`).join('')}</div>
        <ul class="kp__scale">
          ${kp.scale.slice(0, 6).map((s) => `<li><span class="k">Kp ${s.kp}</span><span class="l">${esc(s.label)}</span><span>${esc(s.lofoten)}</span></li>`).join('')}
        </ul>
        <p class="kp__cycle">${esc(kp.cycle)}</p>
      </div>

      <div class="guide__row2">
        <div class="guide__panel will-reveal">
          <h3>Wann es dunkel wird</h3>
          <p>${esc(aurora.darkness.intro)}</p>
          <div class="scroll-x"><table class="dark__table">
            <thead><tr><th>Datum</th><th>Sonnenuntergang</th><th>Bestes Fenster</th><th>Lage</th></tr></thead>
            <tbody>
              ${aurora.darkness.rows.map((r) => `<tr><td class="mono-cell">${r.date}</td><td class="mono-cell">${r.sunset}</td><td class="mono-cell">${r.window}</td><td>${esc(r.note)}</td></tr>`).join('')}
            </tbody>
          </table></div>
          <p class="dark__note">${esc(aurora.darkness.note)}</p>
        </div>
        <div class="guide__panel will-reveal">
          <h3>Der Mond spielt mit</h3>
          <div class="moon__events">
            ${aurora.moon.events.map((m, i) => `
              <div class="moon__event">
                <span class="moon__glyph moon__glyph--${['full', 'last', 'new'][i]}" aria-hidden="true"></span>
                <div><b>${m.date} · ${esc(m.phase)}</b><p>${esc(m.note)}</p></div>
              </div>`).join('')}
          </div>
          <p class="moon__verdict">${esc(aurora.moon.verdict)}</p>
        </div>
      </div>

      <div class="guide__row3">
        <div class="guide__panel will-reveal">
          <h3>Foto-Settings</h3>
          <table class="photo__table"><tbody>
            ${aurora.photo.camera.map((r) => `<tr><td>${esc(r.k)}</td><td>${esc(r.v)}</td></tr>`).join('')}
          </tbody></table>
          <h3 style="margin-top:1.6rem">Smartphone</h3>
          <table class="photo__table"><tbody>
            ${aurora.photo.phone.map((r) => `<tr><td>${esc(r.k)}</td><td>${esc(r.v)}</td></tr>`).join('')}
          </tbody></table>
        </div>
        <div class="guide__panel will-reveal">
          <h3>Forecast-Apps</h3>
          <ul class="apps__list">
            ${aurora.apps.map((a) => `<li><b>${esc(a.name)}</b>${esc(a.why)}</li>`).join('')}
          </ul>
          <h3 style="margin-top:1.6rem">Wo hinstehen</h3>
          <div class="guide__chips">
            ${aurora.spots.map((s) => `<div class="chip"><b>${esc(s.name)}</b>${esc(s.why)}</div>`).join('')}
          </div>
        </div>
      </div>

      <div class="guide__panel will-reveal">
        <h3>Plan B bei Sauwetter</h3>
        <div class="planb__grid">
          ${aurora.badWeather.map((b) => `<div class="planb"><b>${esc(b.name)}</b><span class="where">${esc(b.where)}</span><p>${esc(b.what)}</p></div>`).join('')}
        </div>
      </div>
    </div>`;
}

export function renderHero() {
  document.querySelector('.hero__subline')!.textContent = TRIP.subline;
}
