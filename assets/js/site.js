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

// ---------------------------------------------------------------------
// Pohyb: odkrývání při scrollu, průběh čtení, náklon za kurzorem
// ---------------------------------------------------------------------
const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Odkrývání. Skupiny dostanou zpoždění po sobě (--i), aby naskakovaly postupně.
const groups = [
  ['.section__head', 1], ['.split > div', 2], ['.deliver > div', 2], ['.reasons > div', 3],
  ['.steps li', 3], ['.plan', 3], ['.refs > li', 3], ['.strip a', 4], ['.types > div', 2],
  ['.faq details', 1], ['.included li', 2], ['.contact > *', 2], ['.draft-note', 1],
];
groups.forEach(([sel, perRow]) => {
  document.querySelectorAll(sel).forEach((el) => {
    if (el.closest('.stage')) return;
    const siblings = [...el.parentElement.children].filter((c) => c.matches(sel));
    el.dataset.reveal = '';
    el.style.setProperty('--i', String(siblings.indexOf(el) % perRow));
  });
});
// .steps a .plan-figure se neskrývají celé, animuje se jen jejich část (kóta, půdorys)
const revealTargets = [...document.querySelectorAll('[data-reveal], .steps, .plan-figure')];
if ('IntersectionObserver' in window && !calm) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  revealTargets.forEach((el) => io.observe(el));
} else {
  revealTargets.forEach((el) => el.classList.add('is-in'));
}

// Průběh čtení + stín hlavičky
const headerEl = document.querySelector('.site-header');
const bar = document.querySelector('.read-progress');
let ticking = false;
const onScroll = () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.setProperty('--read', max > 0 ? (window.scrollY / max).toFixed(4) : '0');
    headerEl?.classList.toggle('is-scrolled', window.scrollY > 8);
    ticking = false;
  });
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Náklon za kurzorem (jen myš)
if (!calm && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.querySelectorAll('[data-tilt]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      if (el.classList.contains('is-live')) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.classList.add('is-tilting');
      el.style.setProperty('--ry', `${(x * 7).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${(-y * 7).toFixed(2)}deg`);
    });
    el.addEventListener('pointerleave', () => {
      el.classList.remove('is-tilting');
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    });
  });
}

// Otázky: otevřená je vždy jen jedna
document.querySelectorAll('.faq').forEach((faq) => {
  faq.addEventListener('toggle', (e) => {
    if (!e.target.open) return;
    faq.querySelectorAll('details[open]').forEach((d) => { if (d !== e.target) d.open = false; });
  }, true);
});
