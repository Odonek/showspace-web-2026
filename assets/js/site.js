// ShowSpace – drobná interaktivita společná všem stránkám (bez knihoven)

// Mobilní menu
const toggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.nav');
if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

// Skutečná prohlídka se načte až po kliknutí (šetří data a zrychluje stránku)
document.querySelectorAll('[data-tour]').forEach((box) => {
  const btn = box.querySelector('[data-tour-start]');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const frame = document.createElement('iframe');
    frame.src = box.dataset.tour;
    frame.title = box.dataset.tourTitle || 'Virtuální prohlídka';
    frame.allow = 'fullscreen; xr-spatial-tracking; gyroscope; accelerometer';
    frame.allowFullscreen = true;
    box.querySelector('.tour__start').remove();
    box.appendChild(frame);
    box.closest('.finder')?.classList.add('is-live');
    frame.focus();
  });
});

// Filtr referencí
const filters = document.querySelector('.filters');
if (filters) {
  const items = [...document.querySelectorAll('.refs > li')];
  const count = document.querySelector('[data-ref-count]');
  const apply = (cat) => {
    let shown = 0;
    items.forEach((li) => {
      const match = cat === 'vse' || li.dataset.cat === cat;
      li.hidden = !match;
      if (match) shown += 1;
    });
    filters.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === cat)));
    if (count) count.textContent = shown === items.length ? `Všech ${shown} prohlídek` : `Zobrazeno ${shown} z ${items.length}`;
  };
  filters.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-filter]');
    if (b) apply(b.dataset.filter);
  });
  const initial = new URLSearchParams(location.search).get('typ');
  apply(initial && filters.querySelector(`[data-filter="${CSS.escape(initial)}"]`) ? initial : 'vse');
}

// Tlačítko u balíčku předvyplní formulář
document.querySelectorAll('[data-prefill]').forEach((link) => {
  link.addEventListener('click', () => {
    const select = document.querySelector('#f-prostor');
    const msg = document.querySelector('#f-zprava');
    if (select && link.dataset.prostor) select.value = link.dataset.prostor;
    if (msg && !msg.value) msg.value = `Mám zájem o balíček: ${link.dataset.prefill}.\n`;
  });
});

// Typ prostoru z adresy (?prostor=...)
const wanted = new URLSearchParams(location.search).get('prostor');
const select = document.querySelector('#f-prostor');
if (wanted && select && [...select.options].some((o) => o.value === wanted)) select.value = wanted;

document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
