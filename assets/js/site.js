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
  ['.show', 1], ['.reel', 1], ['.reel-head .reel__nav', 1], ['.photos > li', 4],
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
const revealTargets = [...document.querySelectorAll('[data-reveal], .steps')];
if ('IntersectionObserver' in window && !calm) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      // odkryj i prvky, které uživatel přeskočil (skok na kotvu, rychlý scroll)
      if (!e.isIntersecting && e.boundingClientRect.top > 0) return;
      e.target.classList.add('is-in');
      setTimeout(() => e.target.classList.add('is-done'), 1200);
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  revealTargets.forEach((el) => io.observe(el));
} else {
  revealTargets.forEach((el) => el.classList.add('is-in'));
}

// Průběh čtení + stín hlavičky
const headerEl = document.querySelector('.site-header');
let ticking = false;
const onScroll = () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
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

// ---------------------------------------------------------------------
// Přepínač „Co dostanete“
// ---------------------------------------------------------------------
document.querySelectorAll('[data-show]').forEach((show) => {
  const tabs = [...show.querySelectorAll('[role="tab"]')];
  const panels = [...show.querySelectorAll('[role="tabpanel"]')];
  const select = (i, focus = false) => {
    tabs.forEach((t, k) => {
      t.setAttribute('aria-selected', String(k === i));
      t.tabIndex = k === i ? 0 : -1;
    });
    panels.forEach((p, k) => {
      p.hidden = k !== i;
      const video = p.querySelector('video');
      if (!video) return;
      if (k === i && video.hasAttribute('data-autoplay') && !calm) video.play().catch(() => {});
      else video.pause();
    });
    if (focus) tabs[i].focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(i));
    t.addEventListener('keydown', (e) => {
      const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      select((i + step + tabs.length) % tabs.length, true);
    });
  });
  // smyčka se spustí, až je přepínač vidět
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e], io) => {
      if (!e.isIntersecting) return;
      select(tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'));
      io.disconnect();
    }, { threshold: 0.3 }).observe(show);
  }
});

// ---------------------------------------------------------------------
// Pás prohlídek: šipky a tažení myší
// ---------------------------------------------------------------------
document.querySelectorAll('.reel').forEach((reel) => {
  const nav = [...document.querySelectorAll('[data-reel]')];
  const step = () => (reel.querySelector('li')?.getBoundingClientRect().width || 400) + 24;
  const sync = () => {
    const max = reel.scrollWidth - reel.clientWidth - 4;
    nav.forEach((b) => { b.disabled = b.dataset.reel === '-1' ? reel.scrollLeft <= 4 : reel.scrollLeft >= max; });
  };
  nav.forEach((b) => b.addEventListener('click', () => reel.scrollBy({ left: step() * Number(b.dataset.reel), behavior: calm ? 'auto' : 'smooth' })));
  reel.addEventListener('scroll', sync, { passive: true });
  sync();

  let start = null;
  reel.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    start = { x: e.clientX, left: reel.scrollLeft, moved: false };
  });
  window.addEventListener('pointermove', (e) => {
    if (!start) return;
    const dx = e.clientX - start.x;
    if (!start.moved && Math.abs(dx) > 6) { start.moved = true; reel.classList.add('is-dragging'); }
    if (start.moved) reel.scrollLeft = start.left - dx;
  });
  window.addEventListener('pointerup', () => {
    if (!start) return;
    const moved = start.moved;
    start = null;
    if (moved) setTimeout(() => reel.classList.remove('is-dragging'), 0);
  });
  reel.addEventListener('dragstart', (e) => e.preventDefault());
});

// ---------------------------------------------------------------------
// Prohlížeč: prohlídky (iframe) a fotky (s listováním)
// ---------------------------------------------------------------------
const viewer = document.querySelector('.viewer');
if (viewer && typeof viewer.showModal === 'function') {
  const frame = viewer.querySelector('.viewer__frame');
  const title = viewer.querySelector('#viewer-title');
  const out = viewer.querySelector('.viewer__out');
  const prev = viewer.querySelector('.viewer__nav--prev');
  const next = viewer.querySelector('.viewer__nav--next');
  let photos = [], index = 0;

  const showPhoto = (i) => {
    index = (i + photos.length) % photos.length;
    const p = photos[index];
    title.textContent = p.dataset.title;
    frame.innerHTML = '';
    const im = new Image();
    im.src = p.dataset.full;
    im.alt = p.dataset.title;
    frame.appendChild(im);
  };
  const open = (kind) => {
    prev.hidden = next.hidden = kind !== 'photo';
    out.hidden = kind !== 'tour';
    viewer.showModal();
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-viewer]');
    if (!el || e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (el.closest('.reel.is-dragging')) return;
    e.preventDefault();
    if (el.dataset.viewer === 'tour') {
      title.textContent = el.dataset.title;
      out.href = el.href;
      frame.innerHTML = '';
      const ifr = document.createElement('iframe');
      ifr.src = el.href;
      ifr.title = `Virtuální prohlídka: ${el.dataset.title}`;
      ifr.allow = 'fullscreen; xr-spatial-tracking; gyroscope; accelerometer';
      ifr.allowFullscreen = true;
      frame.appendChild(ifr);
      open('tour');
    } else {
      photos = [...document.querySelectorAll('[data-viewer="photo"]')];
      showPhoto(photos.indexOf(el));
      open('photo');
    }
  });
  prev.addEventListener('click', () => showPhoto(index - 1));
  next.addEventListener('click', () => showPhoto(index + 1));
  viewer.querySelector('.viewer__close').addEventListener('click', () => viewer.close());
  viewer.addEventListener('click', (e) => { if (e.target === viewer) viewer.close(); });
  viewer.addEventListener('keydown', (e) => {
    if (prev.hidden) return;
    if (e.key === 'ArrowLeft') showPhoto(index - 1);
    if (e.key === 'ArrowRight') showPhoto(index + 1);
  });
  viewer.addEventListener('close', () => { frame.innerHTML = ''; });
}

// ---------------------------------------------------------------------
// Oko z loga sleduje kurzor
// ---------------------------------------------------------------------
const eye = document.querySelector('.eye');
if (eye && !calm) {
  const look = eye.querySelector('.eye__look');
  window.addEventListener('pointermove', (e) => {
    const r = eye.getBoundingClientRect();
    if (r.bottom < -200 || r.top > window.innerHeight + 200) return;
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy) || 1;
    const reach = Math.min(1, d / 260);
    look.style.setProperty('--ex', `${((dx / d) * 15 * reach).toFixed(1)}px`);
    look.style.setProperty('--ey', `${((dy / d) * 8 * reach).toFixed(1)}px`);
  }, { passive: true });
}
