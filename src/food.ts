// Proviant-Seite: Menüplan + Einkaufslisten aus src/data/food.json.
// Häkchen der Einkaufslisten liegen in localStorage (Namespace nordlys:), wie bei der Packliste.

import foodData from './data/food.json';
import { shortDate } from './utils';

const KEY = 'nordlys:food.v1';

// Die JSON hat optionale Felder (fire, note, name) — darum ein expliziter Vertrag statt Inferenz.
interface FoodItem { id: string; label: string; note?: string }
interface FoodGroup { name?: string; note?: string; items: FoodItem[] }
interface FoodList { id: string; name: string; when: string; intro?: string; groups: FoodGroup[] }
interface FoodDay { day: number; date: string; place: string; meal: string; type: string; note: string; fire?: boolean }
interface FoodShop { n: number; day: string; where: string; what: string; list: string; accent?: boolean }
interface MealBlock { title: string; text?: string; items: string[]; note?: string }
interface Food {
  stand: string;
  setup: string;
  rules: { title: string; text: string }[];
  days: FoodDay[];
  meals: { breakfast: MealBlock; lunch: MealBlock; reserve: MealBlock };
  carry: { title: string; text: string; items: string[]; warn: string };
  shops: FoodShop[];
  lists: FoodList[];
  cooler: MealBlock;
  burners: MealBlock;
  budgetNote: string;
}

const food = foodData as Food;

const TYPE_LABEL: Record<string, string> = {
  kocher: 'Kocher',
  kueche: 'Küche',
  auswaerts: 'Auswärts',
  trage: 'Tragetag',
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function load(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

function save(state: Record<string, boolean>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* localStorage gesperrt — Häkchen gelten dann nur für die Session */
  }
}

/** Kopfzeile: die vier Zahlen, die den Plan zusammenfassen. */
function renderStats() {
  const el = document.querySelector('[data-render="food-stats"]');
  if (!el) return;
  const cooked = food.days.filter((d) => d.type !== 'auswaerts').length;
  const out = food.days.length - cooked;
  const items = food.lists.reduce((n, l) => n + l.groups.reduce((m, g) => m + g.items.length, 0), 0);
  const stat = (num: string, label: string) =>
    `<div class="food-stat"><span class="food-stat__num">${num}</span><span class="food-stat__label">${label}</span></div>`;
  el.innerHTML =
    stat(String(cooked), 'Abende am Kocher') +
    stat(String(out), 'Abende ohne Kocher') +
    stat(String(food.shops.length), 'Einkäufe') +
    stat(String(items), 'Positionen auf der Liste');
}

function renderRules() {
  const el = document.querySelector('[data-render="food-rules"]');
  if (!el) return;
  el.innerHTML = food.rules
    .map(
      (r, i) => `
      <article class="food-rule will-reveal">
        <span class="food-rule__n mono">${String(i + 1).padStart(2, '0')}</span>
        <h3 class="food-rule__title">${esc(r.title)}</h3>
        <p class="food-rule__text">${esc(r.text)}</p>
      </article>`,
    )
    .join('');
}

function renderDays() {
  const el = document.querySelector('[data-render="food-days"]');
  if (!el) return;
  el.innerHTML = food.days
    .map(
      (d) => `
      <article class="menu-day menu-day--${d.type} will-reveal">
        <div class="menu-day__day">
          <span class="menu-day__num">${String(d.day).padStart(2, '0')}</span>
          <span class="menu-day__date mono">${shortDate(d.date)}</span>
        </div>
        <div class="menu-day__body">
          <p class="menu-day__place mono">${esc(d.place)}</p>
          <h3 class="menu-day__meal">${esc(d.meal)}</h3>
          <p class="menu-day__note">${esc(d.note)}</p>
        </div>
        <div class="menu-day__tags">
          <span class="food-tag food-tag--${d.type}">${TYPE_LABEL[d.type] ?? d.type}</span>
          ${d.fire ? '<span class="food-tag food-tag--fire">Grillstelle möglich</span>' : ''}
        </div>
      </article>`,
    )
    .join('');
}

function renderMealBlocks() {
  const el = document.querySelector('[data-render="food-meals"]');
  if (!el) return;
  const block = (b: MealBlock) => `
    <article class="food-card will-reveal">
      <h3 class="food-card__title">${esc(b.title)}</h3>
      ${b.text ? `<p class="food-card__lead">${esc(b.text)}</p>` : ''}
      <ul class="food-card__list">${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
      ${b.note ? `<p class="food-card__note">${esc(b.note)}</p>` : ''}
    </article>`;

  el.innerHTML =
    block(food.meals.breakfast) +
    block(food.meals.lunch) +
    `<article class="food-card food-card--carry will-reveal">
      <h3 class="food-card__title">${esc(food.carry.title)}</h3>
      <p class="food-card__lead">${esc(food.carry.text)}</p>
      <ul class="food-card__list">${food.carry.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
      <p class="food-card__warn">${esc(food.carry.warn)}</p>
    </article>` +
    block(food.meals.reserve);
}

function renderShops() {
  const el = document.querySelector('[data-render="food-shops"]');
  if (!el) return;
  el.innerHTML = food.shops
    .map(
      (s) => `
      <a class="shop-card${s.accent ? ' shop-card--accent' : ''} will-reveal" href="#liste-${s.list}">
        <span class="shop-card__n mono">Einkauf ${s.n}</span>
        <span class="shop-card__day mono">${esc(s.day)}</span>
        <span class="shop-card__where">${esc(s.where)}</span>
        <span class="shop-card__what">${esc(s.what)}</span>
        <span class="shop-card__link mono">Zur Liste →</span>
      </a>`,
    )
    .join('');
}

/** Die Einkaufslisten — der eigentliche Zweck der Seite. */
function renderLists(state: Record<string, boolean>) {
  const el = document.querySelector('[data-render="food-lists"]');
  if (!el) return;

  el.innerHTML = `
    <div class="packing__bar will-reveal">
      <div class="packing__total">
        <div class="packing__total-label"><span>Eingekauft</span><b data-fd-total>0/0</b></div>
        <div class="progress"><i data-fd-totalbar></i></div>
      </div>
      <button type="button" class="packing__reset" data-fd-reset>Alles zurücksetzen</button>
    </div>
    ${food.lists
      .map(
        (list) => `
        <section class="shop-list will-reveal" id="liste-${list.id}" data-list="${list.id}">
          <header class="shop-list__head">
            <div>
              <h3 class="shop-list__name">${esc(list.name)}</h3>
              <p class="shop-list__when mono">${esc(list.when)}</p>
            </div>
            <span class="shop-list__count mono" data-list-count>0/0</span>
          </header>
          <div class="progress"><i data-list-bar></i></div>
          ${list.intro ? `<p class="shop-list__intro">${esc(list.intro)}</p>` : ''}
          <div class="shop-list__groups">
            ${list.groups
              .map(
                (g) => `
              <div class="shop-group">
                ${g.name ? `<h4 class="shop-group__name mono">${esc(g.name)}</h4>` : ''}
                <div class="pack-cat__items">
                  ${g.items
                    .map((it) => {
                      const id = `${list.id}-${it.id}`;
                      return `
                      <label class="pack-item">
                        <input type="checkbox" data-fd="${id}" ${state[id] ? 'checked' : ''} />
                        <span class="pack-item__box" aria-hidden="true"><svg viewBox="0 0 12 12"><path d="M2 6.5 L5 9.5 L10 2.5"/></svg></span>
                        <span class="pack-item__label">${esc(it.label)}${it.note ? `<em class="pack-item__hint">${esc(it.note)}</em>` : ''}</span>
                      </label>`;
                    })
                    .join('')}
                </div>
                ${g.note ? `<p class="shop-group__note">${esc(g.note)}</p>` : ''}
              </div>`,
              )
              .join('')}
          </div>
        </section>`,
      )
      .join('')}`;

  const totalEl = el.querySelector('[data-fd-total]')!;
  const totalBar = el.querySelector<HTMLElement>('[data-fd-totalbar]')!;

  function refresh() {
    let done = 0;
    let all = 0;
    el!.querySelectorAll<HTMLElement>('.shop-list').forEach((listEl) => {
      const boxes = listEl.querySelectorAll<HTMLInputElement>('input[data-fd]');
      const checked = [...boxes].filter((b) => b.checked).length;
      listEl.querySelector('[data-list-count]')!.textContent = `${checked}/${boxes.length}`;
      listEl.querySelector<HTMLElement>('[data-list-bar]')!.style.setProperty('--p', String(boxes.length ? checked / boxes.length : 0));
      listEl.classList.toggle('is-done', boxes.length > 0 && checked === boxes.length);
      done += checked;
      all += boxes.length;
    });
    totalEl.textContent = `${done}/${all}`;
    totalBar.style.setProperty('--p', String(all ? done / all : 0));
  }

  el.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    if (!input.matches('input[data-fd]')) return;
    state[input.dataset.fd!] = input.checked;
    if (!input.checked) delete state[input.dataset.fd!];
    save(state);
    refresh();
  });

  // Reset: erster Klick scharfstellen, zweiter Klick löscht — wie bei der Packliste
  const reset = el.querySelector<HTMLButtonElement>('[data-fd-reset]')!;
  let armed = false;
  let disarm = 0;
  reset.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      reset.textContent = 'Sicher? Nochmals klicken';
      reset.classList.add('is-armed');
      disarm = window.setTimeout(() => {
        armed = false;
        reset.textContent = 'Alles zurücksetzen';
        reset.classList.remove('is-armed');
      }, 3000);
      return;
    }
    window.clearTimeout(disarm);
    armed = false;
    reset.textContent = 'Alles zurücksetzen';
    reset.classList.remove('is-armed');
    Object.keys(state).forEach((k) => delete state[k]);
    save(state);
    el.querySelectorAll<HTMLInputElement>('input[data-fd]').forEach((b) => (b.checked = false));
    refresh();
  });

  refresh();
}

function renderKitchen() {
  const el = document.querySelector('[data-render="food-kitchen"]');
  if (!el) return;
  const block = (b: MealBlock, mod = '') => `
    <article class="food-card${mod} will-reveal">
      <h3 class="food-card__title">${esc(b.title)}</h3>
      ${b.text ? `<p class="food-card__lead">${esc(b.text)}</p>` : ''}
      <ul class="food-card__list">${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
    </article>`;
  el.innerHTML =
    block(food.cooler) +
    block(food.burners) +
    `<article class="food-card food-card--budget will-reveal">
      <h3 class="food-card__title">Budget</h3>
      <p class="food-card__lead">${esc(food.budgetNote)}</p>
      <p class="food-card__note"><a href="./index.html#budget">Zum Budget-Rechner →</a></p>
    </article>`;
}

export function initFood() {
  renderStats();
  renderRules();
  renderDays();
  renderMealBlocks();
  renderShops();
  renderLists(load());
  renderKitchen();

  const stand = document.querySelector('[data-food-stand]');
  if (stand) {
    const [y, m, d] = food.stand.split('-');
    stand.textContent = `Stand ${d}.${m}.${y} · ${food.setup}`;
  }
}
