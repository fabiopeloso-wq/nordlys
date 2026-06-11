// Packliste: Checkboxen mit localStorage-Persistenz (Namespace nordlys:),
// Fortschritt pro Kategorie + total, zweistufiger Reset.

import packing from './data/packing.json';

const KEY = 'nordlys:packing.v1';

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

export function initPacking() {
  const wrap = document.querySelector('[data-render="packing"]')!;
  const state = load();

  wrap.innerHTML = `
    <div class="packing__bar will-reveal">
      <div class="packing__total">
        <div class="packing__total-label"><span>Gesamtfortschritt</span><b data-pk-total>0/0</b></div>
        <div class="progress"><i data-pk-totalbar></i></div>
      </div>
      <button type="button" class="packing__reset" data-pk-reset>Alles zurücksetzen</button>
    </div>
    <div class="packing__cols">
      ${packing.categories.map((cat) => `
        <section class="pack-cat will-reveal" data-cat="${cat.id}">
          <div class="pack-cat__head">
            <h3 class="pack-cat__name">${cat.name}</h3>
            <span class="pack-cat__count" data-cat-count>0/${cat.items.length}</span>
          </div>
          <div class="progress"><i data-cat-bar></i></div>
          <div class="pack-cat__items">
            ${cat.items.map((it) => {
              const id = `${cat.id}-${it.id}`;
              return `
                <label class="pack-item">
                  <input type="checkbox" data-pk="${id}" ${state[id] ? 'checked' : ''} />
                  <span class="pack-item__box" aria-hidden="true"><svg viewBox="0 0 12 12"><path d="M2 6.5 L5 9.5 L10 2.5"/></svg></span>
                  <span class="pack-item__label">${it.label}</span>
                </label>`;
            }).join('')}
          </div>
        </section>`).join('')}
    </div>
    <p class="packing__note">${packing.note}</p>`;

  const totalEl = wrap.querySelector('[data-pk-total]')!;
  const totalBar = wrap.querySelector<HTMLElement>('[data-pk-totalbar]')!;

  function refresh() {
    let done = 0;
    let all = 0;
    wrap.querySelectorAll<HTMLElement>('.pack-cat').forEach((catEl) => {
      const boxes = catEl.querySelectorAll<HTMLInputElement>('input[data-pk]');
      const checked = [...boxes].filter((b) => b.checked).length;
      catEl.querySelector('[data-cat-count]')!.textContent = `${checked}/${boxes.length}`;
      catEl.querySelector<HTMLElement>('[data-cat-bar]')!.style.setProperty('--p', String(boxes.length ? checked / boxes.length : 0));
      done += checked;
      all += boxes.length;
    });
    totalEl.textContent = `${done}/${all}`;
    totalBar.style.setProperty('--p', String(all ? done / all : 0));
  }

  wrap.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    if (!input.matches('input[data-pk]')) return;
    state[input.dataset.pk!] = input.checked;
    if (!input.checked) delete state[input.dataset.pk!];
    save(state);
    refresh();
  });

  // Reset: erster Klick scharfstellen, zweiter Klick löscht
  const reset = wrap.querySelector<HTMLButtonElement>('[data-pk-reset]')!;
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
    wrap.querySelectorAll<HTMLInputElement>('input[data-pk]').forEach((b) => (b.checked = false));
    refresh();
  });

  refresh();
}
