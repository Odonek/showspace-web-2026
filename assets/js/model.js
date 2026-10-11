// ShowSpace – 3D model bytu na úvodní stránce.
// Scrollováním se z půdorysu zvednou stěny, objeví se kóty a informační body.
// Model je ilustrační (není to konkrétní zakázka). Rozměry jsou v metrech.
import * as THREE from '../vendor/three.module.min.js';

const stage = document.querySelector('.stage');
const view = stage?.querySelector('.stage__view');
const canvas = view?.querySelector('canvas');
const overlay = view?.querySelector('.stage__overlay');
const beats = stage ? [...stage.querySelectorAll('.beat')] : [];
const dots = stage ? [...stage.querySelectorAll('.stage__progress button')] : [];

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const COLORS = {
  wall: 0x1f2a3c,
  floor: 0xf8e6d4,
  floorAlt: 0xf3dcc6,
  slate: 0x415a77,
  white: 0xffffff,
  wood: 0xc99b6b,
};

// ---- Dispozice: 3+kk, 88 m² -------------------------------------------------
const ROOMS = [
  { name: 'Obývací pokoj s kuchyní', area: '29,3 m²', rects: [[0, 0, 6.5, 4.5]], label: [3.1, 2.5] },
  { name: 'Ložnice', area: '20,3 m²', rects: [[6.5, 0, 11, 4.5]], label: [8.9, 3.4] },
  { name: 'Pokoj', area: '14,0 m²', rects: [[0, 4.5, 4, 8]], label: [2.3, 6.1] },
  { name: 'Chodba', area: '13,5 m²', rects: [[4, 4.5, 6, 8], [6, 4.5, 11, 5.8]], label: [5, 6.8] },
  { name: 'Koupelna', area: '5,7 m²', rects: [[6, 5.8, 8.6, 8]], label: [7.0, 7.3] },
  { name: 'Šatna', area: '5,3 m²', rects: [[8.6, 5.8, 11, 8]], label: [9.8, 7.0] },
];

// [x1, z1, x2, z2, tloušťka] – mezery jsou dveře
const O = 0.3, I = 0.14;
const WALLS = [
  [0, 0, 11, 0, O], [0, 0, 0, 8, O], [11, 0, 11, 8, O],
  [0, 8, 4.6, 8, O], [5.5, 8, 11, 8, O],
  [0, 4.5, 4.5, 4.5, I], [5.4, 4.5, 7.5, 4.5, I], [8.4, 4.5, 11, 4.5, I],
  [6.5, 0, 6.5, 4.5, I],
  [4, 4.5, 4, 5.0, I], [4, 5.9, 4, 8, I],
  [6, 5.8, 6, 8, I],
  [6, 5.8, 6.8, 5.8, I], [7.6, 5.8, 9.3, 5.8, I], [10.1, 5.8, 11, 5.8, I],
  [8.6, 5.8, 8.6, 8, I],
];

// [x1, z1, x2, z2, výška, barva]
const FURNITURE = [
  [1.0, 0.5, 3.5, 1.45, 0.72, 'slate'],   // pohovka
  [1.6, 2.1, 2.9, 2.8, 0.38, 'white'],    // konferenční stolek
  [5.75, 0.35, 6.35, 3.7, 0.9, 'white'],  // kuchyňská linka
  [3.9, 1.3, 4.9, 3.1, 0.75, 'wood'],     // jídelní stůl
  [7.9, 0.35, 9.9, 2.5, 0.5, 'white'],    // postel
  [7.9, 0.35, 9.9, 0.5, 1.0, 'slate'],    // čelo postele
  [10.25, 1.0, 10.82, 4.1, 1.55, 'white'], // skříň
  [0.3, 4.8, 1.3, 6.8, 0.45, 'white'],    // postel v pokoji
  [0.3, 7.1, 1.9, 7.75, 0.75, 'wood'],    // psací stůl
  [7.7, 6.1, 8.45, 7.8, 0.55, 'white'],   // vana
  [6.2, 7.3, 6.9, 7.8, 0.85, 'white'],    // umyvadlo
  [8.8, 7.4, 10.8, 7.85, 1.5, 'white'],   // šatní police
];

// kóty: [x1, z1, x2, z2, text]
const DIMS = [
  [0.15, 4.05, 6.43, 4.05, '6,3 m'],
  [6.57, 4.05, 10.85, 4.05, '4,3 m'],
  [3.55, 4.57, 3.55, 7.85, '3,3 m'],
];

const SPOTS = [
  { at: [6.05, 1.15, 2.0], title: 'Kuchyňská linka', text: 'Příklad: „Linka na míru z roku 2023, spotřebiče zůstávají.“' },
  { at: [7.3, 0.9, 6.9], title: 'Koupelna', text: 'Příklad: „Po rekonstrukci, podlahové topení.“' },
  { at: [2.2, 1.4, 0.25], title: 'Okna', text: 'Příklad: „Orientace na jih, předokenní žaluzie.“' },
];

const CENTER = new THREE.Vector3(5.5, 0, 4);
const WALL_H = 1.7;

function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

if (stage && canvas && overlay) {
  if (!supportsWebGL()) stage.classList.add('no-webgl');
  else init();
}

function init() {
  if (reduceMotion) stage.classList.add('is-static');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xe9edf2, 2.5));
  const sun = new THREE.DirectionalLight(0xffffff, 1.15);
  sun.position.set(-2, 14, -5);
  sun.target.position.copy(CENTER);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  sun.shadow.bias = -0.0006;
  sun.shadow.radius = 5;
  scene.add(sun, sun.target);

  const mat = (c) => new THREE.MeshStandardMaterial({ color: COLORS[c], roughness: 0.9, metalness: 0 });
  const mats = { wall: mat('wall'), slate: mat('slate'), white: mat('white'), wood: mat('wood') };

  // podlahy
  ROOMS.forEach((room, i) => {
    const m = new THREE.MeshStandardMaterial({ color: i % 2 ? COLORS.floorAlt : COLORS.floor, roughness: 1 });
    room.rects.forEach(([x1, z1, x2, z2]) => {
      const g = new THREE.PlaneGeometry(x2 - x1, z2 - z1);
      g.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
      mesh.receiveShadow = true;
      scene.add(mesh);
    });
  });

  // stěny – rostou odspodu (scale.y)
  const walls = new THREE.Group();
  WALLS.forEach(([x1, z1, x2, z2, t]) => {
    const horizontal = z1 === z2;
    const len = (horizontal ? x2 - x1 : z2 - z1) + t;
    const g = new THREE.BoxGeometry(horizontal ? len : t, WALL_H, horizontal ? t : len);
    g.translate(0, WALL_H / 2, 0);
    const mesh = new THREE.Mesh(g, mats.wall);
    mesh.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    walls.add(mesh);
  });
  scene.add(walls);

  const furniture = new THREE.Group();
  FURNITURE.forEach(([x1, z1, x2, z2, h, c]) => {
    const g = new THREE.BoxGeometry(x2 - x1, h, z2 - z1);
    g.translate(0, h / 2, 0);
    const mesh = new THREE.Mesh(g, mats[c]);
    mesh.position.set((x1 + x2) / 2, 0.002, (z1 + z2) / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    furniture.add(mesh);
  });
  scene.add(furniture);

  // kóty – tenké pásky na podlaze, vždy viditelné i přes stěny
  const dimMat = new THREE.MeshBasicMaterial({ color: COLORS.slate, transparent: true, opacity: 0, depthTest: false });
  const dimLines = new THREE.Group();
  const strip = (x1, z1, x2, z2) => {
    const w = 0.05;
    const g = new THREE.PlaneGeometry(Math.abs(x2 - x1) + w, Math.abs(z2 - z1) + w);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, dimMat);
    m.position.set((x1 + x2) / 2, 0.03, (z1 + z2) / 2);
    m.renderOrder = 10;
    dimLines.add(m);
  };
  DIMS.forEach(([x1, z1, x2, z2]) => {
    const k = 0.2;
    const horizontal = z1 === z2;
    strip(x1, z1, x2, z2);
    [[x1, z1], [x2, z2]].forEach(([x, z]) => (horizontal ? strip(x, z - k, x, z + k) : strip(x - k, z, x + k, z)));
  });
  scene.add(dimLines);

  // ---- HTML popisky promítané z 3D ----
  const tags = [];
  const addTag = (cls, html, pos, group) => {
    const el = document.createElement('div');
    el.className = `tag ${cls}`;
    el.innerHTML = html;
    el.style.opacity = '0';
    overlay.appendChild(el);
    const tag = { el, pos: new THREE.Vector3(...pos), group };
    tags.push(tag);
    return tag;
  };
  ROOMS.forEach((r) => addTag('tag--room', `${r.name}<span>${r.area}</span>`, [r.label[0], 0.05, r.label[1]], 'room'));
  DIMS.forEach(([x1, z1, x2, z2, text]) => addTag('tag--dim', text, [(x1 + x2) / 2, 0.02, (z1 + z2) / 2], 'dim'));
  SPOTS.forEach((s, i) => {
    const tag = addTag(
      'tag--spot',
      `<button class="spot" type="button" aria-expanded="false" aria-label="Informační bod: ${s.title}">i</button>
       <div class="spot-card" hidden><strong>${s.title}</strong>${s.text}</div>`,
      s.at, 'spot',
    );
    const btn = tag.el.querySelector('button');
    const card = tag.el.querySelector('.spot-card');
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      closeSpots();
      btn.setAttribute('aria-expanded', String(open));
      card.hidden = !open;
      tag.el.style.zIndex = open ? '5' : '';
    });
    tag.index = i;
  });
  function closeSpots() {
    overlay.querySelectorAll('.spot').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    overlay.querySelectorAll('.spot-card').forEach((c) => { c.hidden = true; });
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSpots(); });

  // ---- stav ----
  let progress = reduceMotion ? 1 : 0;   // 0..1 podle scrollu
  let width = 1, height = 1, baseRadius = 20;
  const cur = { rise: reduceMotion ? 1 : 0, az: 0, pol: 0.02, rad: 1, dim: 0, spot: 0, tx: CENTER.x, tz: CENTER.z };
  const user = { az: 0, pol: 0 };
  let visible = true, needsFrame = true;

  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => a + (b - a) * t;
  const deg = (d) => (d * Math.PI) / 180;

  function targets(p) {
    const rise = smooth(0.05, 0.3, p);
    const s2 = smooth(0.44, 0.56, p);
    const s3 = smooth(0.74, 0.9, p);
    return {
      rise,
      pol: mix(mix(0.02, deg(40), rise), deg(34), s2) + s3 * deg(8),
      az: mix(mix(0, deg(-28), rise), deg(16), s2) + s3 * deg(22),
      rad: mix(mix(1, 1.4, rise), 1.34, s2) - s3 * 0.06,
      dim: s2 * (1 - smooth(0.72, 0.78, p)),
      spot: s3,
      tx: CENTER.x - s3 * 0.4,
      tz: CENTER.z - s3 * 0.2,
    };
  }

  function resize() {
    const r = view.getBoundingClientRect();
    width = Math.max(1, r.width); height = Math.max(1, r.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const t = Math.tan(deg(15));
    baseRadius = Math.max(9.6 / (2 * t), 13.2 / (2 * t * camera.aspect));
    needsFrame = true;
  }

  function readScroll() {
    if (reduceMotion) return;
    const r = stage.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    progress = total > 0 ? clamp01(-r.top / total) : 0;
    const beat = Math.min(beats.length - 1, Math.floor(progress * beats.length * 0.999));
    beats.forEach((b, i) => b.classList.toggle('is-active', i === beat));
    dots.forEach((d, i) => d.setAttribute('aria-current', String(i === beat)));
    if (progress < 0.6) closeSpots();
    needsFrame = true;
  }

  const v = new THREE.Vector3();
  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    const t = targets(progress);
    let moving = false;
    for (const k of Object.keys(t)) {
      const d = t[k] - cur[k];
      if (Math.abs(d) > 0.0005) { cur[k] += d * (reduceMotion ? 1 : 0.09); moving = true; } else cur[k] = t[k];
    }
    if (!moving && !needsFrame) return;
    needsFrame = false;

    walls.scale.y = Math.max(0.012, cur.rise);
    furniture.scale.y = Math.max(0.004, smooth(0.25, 1, cur.rise));
    dimMat.opacity = cur.dim;

    const pol = Math.min(deg(80), Math.max(0.02, cur.pol + user.pol * cur.rise));
    const az = cur.az + user.az * cur.rise;
    const tiltRoom = camera.aspect < 1.2 ? 0.84 : 1; // na výšku rozhoduje šířka, model může být blíž
    const rad = baseRadius * mix(1, cur.rad * tiltRoom, cur.rise);
    camera.position.set(
      cur.tx + rad * Math.sin(pol) * Math.sin(az),
      rad * Math.cos(pol),
      cur.tz + rad * Math.sin(pol) * Math.cos(az),
    );
    camera.lookAt(cur.tx, 0, cur.tz);
    renderer.render(scene, camera);

    const roomAlpha = (1 - Math.max(cur.spot, cur.dim * 0.6)) * (width < 520 ? 1 - cur.rise : 1);
    for (const tag of tags) {
      v.copy(tag.pos);
      if (tag.group === 'spot') v.y *= cur.rise;
      v.project(camera);
      const x = (v.x * 0.5 + 0.5) * width;
      const y = (-v.y * 0.5 + 0.5) * height;
      const a = tag.group === 'room' ? roomAlpha : tag.group === 'dim' ? cur.dim : cur.spot;
      tag.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      tag.el.style.opacity = a.toFixed(2);
      tag.el.style.visibility = a < 0.03 ? 'hidden' : 'visible';
    }
  }

  // ---- otáčení tažením ----
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (cur.rise < 0.5) return;
    drag = { x: e.clientX, y: e.clientY, az: user.az, pol: user.pol };
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    user.az = drag.az - ((e.clientX - drag.x) / width) * Math.PI * 1.2;
    if (e.pointerType === 'mouse') user.pol = Math.min(0.5, Math.max(-0.6, drag.pol - ((e.clientY - drag.y) / height) * 1.2));
    needsFrame = true;
  });
  const endDrag = () => { drag = null; canvas.classList.remove('is-dragging'); };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  // tečky průběhu = skok na krok
  dots.forEach((d, i) => d.addEventListener('click', () => {
    const r = stage.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    const top = window.scrollY + r.top + total * ((i + 0.5) / beats.length);
    window.scrollTo({ top, behavior: 'smooth' });
  }));

  new ResizeObserver(resize).observe(view);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; needsFrame = true; }).observe(stage);
  window.addEventListener('scroll', readScroll, { passive: true });
  resize();
  readScroll();
  if (reduceMotion) beats.forEach((b) => b.classList.add('is-active'));
  frame();

  // pro ladění a testy
  window.__showspaceModel = { get progress() { return progress; } };
}
