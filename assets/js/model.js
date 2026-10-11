// ShowSpace – interaktivní 3D model na úvodní stránce.
//
// Model vychází z půdorysu naší zakázky: byt 3+1 ve Svitavách (63,7 m²).
// Podlaha je přímo obrázek půdorysu z Giraffe360, stěny jsou z něj odvozené,
// takže pohled shora vypadá přesně jako 2D půdorys. Rozměry jsou v metrech.
//
// Průběh při scrollu:
//   krok 0 – statický 2D půdorys
//   krok 1 – stěny se zvednou do 3D, kliknutím na místnost do ní kamera vletí
//   krok 2 – kliknutím na dvě místa se změří vzdálenost
//   krok 3 – dráha slunce: stíny a světlo z oken podle času a ročního období
//   krok 4 – kamera přiblíží obývací pokoj a ukáže informační body
// Ve 3D krocích jde model přepnout zpět na 2D půdorys (tlačítka 2D / 3D).
import * as THREE from '../vendor/three.module.min.js';

const stage = document.querySelector('.stage');
const view = stage?.querySelector('.stage__view');
const canvas = view?.querySelector('canvas');
const overlay = view?.querySelector('.stage__overlay');
const planImg = view?.querySelector('.stage__fallback img');
const beats = stage ? [...stage.querySelectorAll('.beat')] : [];
const dots = stage ? [...stage.querySelectorAll('.stage__progress button')] : [];
const resetBtn = stage?.querySelector('.stage__reset');
const modeBox = stage?.querySelector('.stage__mode');
const sunBox = stage?.querySelector('[data-sun]');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const C = { wall: 0xf6f5f1, cap: 0x1c232e, hover: 0xeae151, white: 0xffffff, step: 0xe6cdbf, ink: 0x141c2b, glass: 0xa9c6e3, accent: 0xeae151 };

// obrázek půdorysu položený na zem: [x1, z1, x2, z2] v metrech
const PLANE = [-0.154, -0.925, 9.989, 9.518];
// stěny odvozené z půdorysu: [x1, z1, x2, z2]
const WALLS = [
  [0.011, -0.004, 4.751, 0.278], [5.703, -0.004, 9.826, 0.154], [-0.007, 0.013, 0.011, 1.493], [9.826, 0.013, 9.844, 3.626],
  [5.72, 0.154, 9.826, 0.278], [0.011, 0.278, 0.275, 1.493], [4.187, 0.278, 4.681, 2.815], [9.562, 0.278, 9.826, 3.626],
  [4.681, 2.674, 4.769, 2.815], [5.72, 2.674, 9.562, 2.815], [6.108, 2.815, 6.478, 2.833], [6.778, 2.815, 7.535, 2.833],
  [8.575, 2.815, 9.562, 2.833], [6.108, 2.833, 6.46, 2.903], [6.126, 2.903, 6.46, 2.921], [6.319, 2.921, 6.46, 3.361],
  [0.011, 3.555, 0.275, 5.035], [-0.007, 3.573, 0.011, 5.018], [0.275, 3.784, 4.839, 3.925], [4.187, 3.925, 4.839, 5.018],
  [6.319, 4.207, 8.046, 4.348], [6.319, 4.348, 6.478, 4.366], [7.659, 4.348, 8.046, 4.366], [6.319, 4.366, 6.46, 4.436],
  [7.676, 4.366, 8.046, 5.67], [9.562, 4.471, 9.826, 6.515], [9.826, 4.489, 9.844, 6.515], [7.659, 4.524, 7.676, 4.93],
  [4.187, 5.018, 4.681, 5.053], [6.319, 5.194, 6.478, 5.687], [6.478, 5.3, 6.919, 5.67], [7.659, 5.3, 7.676, 5.67],
  [8.046, 5.3, 8.064, 5.67], [5.808, 5.317, 6.319, 6.322], [6.919, 5.317, 7.659, 5.67], [8.064, 5.317, 9.562, 5.67],
  [6.319, 5.687, 6.46, 6.322], [4.205, 6.004, 4.663, 7.167], [4.187, 6.022, 4.205, 7.167], [4.663, 6.022, 4.681, 7.167],
  [0.011, 6.075, 0.275, 7.485], [-0.007, 6.093, 0.011, 7.467], [5.791, 6.163, 5.808, 6.322], [0.275, 6.181, 4.187, 6.322],
  [4.681, 6.181, 4.786, 6.322], [5.65, 6.181, 5.791, 6.322], [4.205, 8.013, 4.663, 9.37], [4.187, 8.031, 4.205, 9.37],
  [4.663, 8.031, 4.681, 9.37], [9.562, 8.718, 9.826, 9.37], [9.826, 8.736, 9.844, 9.352], [0.011, 9.053, 0.275, 9.37],
  [-0.007, 9.07, 0.011, 9.352], [0.275, 9.088, 0.293, 9.37], [1.844, 9.088, 4.187, 9.37], [4.681, 9.088, 9.562, 9.37],
];
// okna a prosklené dveře v obvodové stěně
const GLASS = [[0.06, 1.487, 0.2, 3.546], [0.06, 5.033, 0.2, 6.079], [0.06, 7.467, 0.2, 9.053], [0.3, 9.16, 1.841, 9.3], [9.63, 6.52, 9.77, 8.722]];

// místnosti (pro klikání a zvýraznění); názvy a plochy jsou z půdorysu
const ROOMS = [
  { name: 'Pokoj', area: '13,7 m²', rects: [[0.27, 0.27, 4.19, 3.78]] },
  { name: 'Pokoj', area: '8,6 m²', rects: [[0.27, 3.92, 4.19, 6.17]] },
  { name: 'Kuchyňský kout + jídelna', area: '10,9 m²', rects: [[0.27, 6.32, 4.44, 9.08]] },
  { name: 'Obývací pokoj', area: '15,9 m²', rects: [[4.67, 6.32, 9.56, 9.08], [6.47, 5.67, 9.56, 6.32]], main: true },
  { name: 'Chodba', area: '4,8 m²', rects: [[4.44, 2.79, 6.33, 5.31], [4.44, 5.31, 5.83, 6.24]] },
  { name: 'Koupelna', area: '4,9 m²', rects: [[6.4, 2.83, 9.56, 4.2], [8.04, 4.2, 9.56, 5.31]] },
  { name: 'WC', area: '1,1 m²', rects: [[6.4, 4.36, 7.67, 5.31]] },
  { name: 'Vstup a schodiště', rects: [[4.67, 0.27, 7.76, 2.68]] },
];

// zařizovací předměty zakreslené v půdorysu: [x1, z1, x2, z2, výška]
const BOXES = [
  [0.27, 8.47, 4.19, 9.08, 0.9],   // kuchyňská linka
  [8.57, 2.83, 9.55, 3.58, 0.08],  // sprchová vanička
  [6.79, 2.83, 7.52, 3.26, 0.85],  // umyvadlo
  [7.1, 4.5, 7.6, 4.85, 0.42],     // WC
  [6.47, 5.05, 6.9, 5.28, 0.8],    // umývátko
];

// ukázkové kóty: [x1, z1, x2, z2, text] – z měřítka půdorysu
const DIMS = [
  [0.3, 3.35, 4.16, 3.35, '3,9 m'],
  [4.7, 8.6, 9.53, 8.6, '4,9 m'],
  [3.85, 6.35, 3.85, 8.44, '2,1 m'],
];

const SPOTS = [
  { at: [7.2, 0.5, 7.7], title: 'Obývací pokoj', text: '15,9 m², dvoukřídlé dveře.' },
  { at: [2.2, 1.0, 8.78], title: 'Kuchyňský kout + jídelna', text: '10,9 m², linka s dřezem a varnou deskou.' },
  { at: [9.05, 0.4, 3.2], title: 'Koupelna', text: '4,9 m², sprchový kout a umyvadlo.' },
];

const HINTS = [
  'Byt 3+1, Svitavy, 63,7 m²: půdorys z naší zakázky',
  'Klikněte na místnost. Tažením model otočíte.',
  'Klikněte na dvě místa a změřte vzdálenost.',
  'Posuňte čas a sledujte stíny a světlo z oken.',
  'Klikněte na bod v modelu.',
];
const MODES = ['plan', 'explore', 'measure', 'sun', 'spots'];
const SUN_BEAT = 3, SPOT_BEAT = 4;

// ---- slunce ----
// Sever je na půdorysu pootočený o 28,5° po směru hodin (růžice v rohu výkresu z Giraffe360).
const NORTH_DEG = 28.5;
const LAT = 49.76, LON = 16.47;          // Svitavy
// roční období: deklinace slunce a posun místního času proti UTC (zimní / letní čas)
const SEASONS = {
  zima: { decl: -23.44, tz: 1, label: '21. prosince' },
  jaro: { decl: 0, tz: 1, label: '21. března' },
  leto: { decl: 23.44, tz: 2, label: '21. června' },
};
// okna: úsečka na vnitřní hraně stěny, směr ven z bytu, místnost (index v ROOMS), výška parapetu a nadpraží
const WINDOWS = [
  { a: [0.275, 1.49], b: [0.275, 3.55], n: [-1, 0], room: 0, sill: 0.9, top: 2.3 },
  { a: [0.275, 5.03], b: [0.275, 6.08], n: [-1, 0], room: 1, sill: 0.9, top: 2.3 },
  { a: [0.275, 7.47], b: [0.275, 9.05], n: [-1, 0], room: 2, sill: 0.9, top: 2.3 },
  { a: [0.3, 9.08], b: [1.84, 9.08], n: [0, 1], room: 2, sill: 0.9, top: 2.3 },
  { a: [9.56, 6.52], b: [9.56, 8.72], n: [1, 0], room: 3, sill: 0, top: 2.2 },
];
const SUN_C = [4.92, 4.68], SUN_R = 7.3;  // střed a poloměr dráhy slunce kolem bytu

const CENTER = new THREE.Vector3((PLANE[0] + PLANE[2]) / 2, 0, (PLANE[1] + PLANE[3]) / 2);
const PLANE_W = PLANE[2] - PLANE[0], PLANE_H = PLANE[3] - PLANE[1];
const WALL_H = 1.3;

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
  const hintEl = stage.querySelector('.stage__hint');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; // stíny se přepočítají jen při změně výšky stěn

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xe6ebf1, 2.3));
  const sun = new THREE.DirectionalLight(0xfff4e6, 1.5);
  sun.position.set(CENTER.x - 8, 13, CENTER.z - 8);
  sun.target.position.copy(CENTER);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 45 });
  sun.shadow.bias = -0.0006;
  scene.add(sun, sun.target);

  // ---- podlaha = obrázek půdorysu (bez osvětlení, aby barvy seděly s 2D) ----
  const planGeo = new THREE.PlaneGeometry(PLANE_W, PLANE_H);
  planGeo.rotateX(-Math.PI / 2);
  const planMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const plan = new THREE.Mesh(planGeo, planMat);
  plan.position.copy(CENTER);
  scene.add(plan);
  let textureReady = false;
  new THREE.TextureLoader().load(new URL('../img/byt-pudorys-textura.webp', import.meta.url).href, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    planMat.map = tex;
    planMat.needsUpdate = true;
    textureReady = true;
    needsFrame = true;
  });
  // průhledná vrstva, která jen přijímá stíny stěn
  const shadowMat = new THREE.ShadowMaterial({ opacity: 0 });
  const shadowPlane = new THREE.Mesh(planGeo, shadowMat);
  shadowPlane.position.set(CENTER.x, 0.004, CENTER.z);
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  // ---- místnosti: neviditelné plochy pro klikání + žluté zvýraznění ----
  const pickMeshes = [];
  ROOMS.forEach((room) => {
    room.mat = new THREE.MeshBasicMaterial({ color: C.hover, transparent: true, opacity: 0, depthWrite: false });
    room.glow = 0;
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    room.rects.forEach(([x1, z1, x2, z2]) => {
      const g = new THREE.PlaneGeometry(x2 - x1, z2 - z1);
      g.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(g, room.mat);
      mesh.position.set((x1 + x2) / 2, 0.012, (z1 + z2) / 2);
      mesh.userData.room = room;
      scene.add(mesh);
      pickMeshes.push(mesh);
      minX = Math.min(minX, x1); minZ = Math.min(minZ, z1); maxX = Math.max(maxX, x2); maxZ = Math.max(maxZ, z2);
    });
    room.center = [(minX + maxX) / 2, (minZ + maxZ) / 2];
    room.size = Math.max(maxX - minX, maxZ - minZ);
  });
  const mainRoom = ROOMS.find((r) => r.main);

  // ---- stěny rostou odspodu; tmavé „čepičky“ mají barvu stěn v půdorysu ----
  const wallMat = new THREE.MeshStandardMaterial({ color: C.wall, roughness: 0.9 });
  const capMat = new THREE.MeshBasicMaterial({ color: C.cap });
  const glassMat = new THREE.MeshStandardMaterial({ color: C.glass, roughness: 0.2, transparent: true, opacity: 0.55 });
  const walls = new THREE.Group();
  const caps = new THREE.Group();
  const addWall = ([x1, z1, x2, z2], mat, withCap) => {
    const sx = x2 - x1, sz = z2 - z1;
    const g = new THREE.BoxGeometry(sx, WALL_H, sz);
    g.translate(0, WALL_H / 2, 0);
    const mesh = new THREE.Mesh(g, mat);
    mesh.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
    mesh.castShadow = withCap;
    mesh.receiveShadow = withCap;
    walls.add(mesh);
    if (withCap) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(sx + 0.004, 0.04, sz + 0.004), capMat);
      cap.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
      caps.add(cap);
    }
  };
  WALLS.forEach((w) => addWall(w, wallMat, true));
  GLASS.forEach((w) => addWall(w, glassMat, false));
  scene.add(walls, caps);

  // ---- zařizovací předměty a schodiště ----
  const things = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: C.white, roughness: 0.7 });
  const stepMat = new THREE.MeshStandardMaterial({ color: C.step, roughness: 1 });
  const addBox = (x1, z1, x2, z2, h, mat) => {
    const g = new THREE.BoxGeometry(x2 - x1, h, z2 - z1);
    g.translate(0, h / 2, 0);
    const mesh = new THREE.Mesh(g, mat);
    mesh.position.set((x1 + x2) / 2, 0.006, (z1 + z2) / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    things.add(mesh);
  };
  BOXES.forEach(([x1, z1, x2, z2, h]) => addBox(x1, z1, x2, z2, h, white));
  // dvě ramena schodiště po devíti stupních
  const SX0 = 5.86, SX1 = 7.6, N = 9, sw = (SX1 - SX0) / N;
  for (let i = 0; i < N; i += 1) {
    addBox(SX0 + i * sw, 0.3, SX0 + (i + 1) * sw, 1.4, 0.06 + i * 0.06, stepMat);                 // horní rameno stoupá doprava
    addBox(SX1 - (i + 1) * sw, 1.46, SX1 - i * sw, 2.66, 0.6 + i * 0.06, stepMat);                // spodní pokračuje doleva
  }
  scene.add(things);

  // ---- kóty: pásky na podlaze, vždy viditelné i přes stěny ----
  const stripGeo = (x1, z1, x2, z2, w = 0.05) => {
    const dx = x2 - x1, dz = z2 - z1;
    const g = new THREE.PlaneGeometry(Math.hypot(dx, dz) + w, w);
    g.rotateX(-Math.PI / 2);
    g.rotateY(-Math.atan2(dz, dx));
    g.translate((x1 + x2) / 2, 0.03, (z1 + z2) / 2);
    return g;
  };
  const dimMat = new THREE.MeshBasicMaterial({ color: C.ink, transparent: true, opacity: 0, depthTest: false });
  const dimLines = new THREE.Group();
  DIMS.forEach(([x1, z1, x2, z2]) => {
    const k = 0.2, horizontal = z1 === z2;
    const add = (...a) => { const m = new THREE.Mesh(stripGeo(...a), dimMat); m.renderOrder = 10; dimLines.add(m); };
    add(x1, z1, x2, z2);
    [[x1, z1], [x2, z2]].forEach(([x, z]) => (horizontal ? add(x, z - k, x, z + k) : add(x - k, z, x + k, z)));
  });
  scene.add(dimLines);

  // ---- vlastní měření ----
  const measureMat = new THREE.MeshBasicMaterial({ color: C.ink, depthTest: false });
  const measure = { a: null, b: null, fixed: false, line: null, group: new THREE.Group() };
  const dotGeo = new THREE.CircleGeometry(0.13, 24);
  dotGeo.rotateX(-Math.PI / 2);
  const dotA = new THREE.Mesh(dotGeo, measureMat), dotB = new THREE.Mesh(dotGeo, measureMat);
  [dotA, dotB].forEach((d) => { d.renderOrder = 12; d.visible = false; d.position.y = 0.035; measure.group.add(d); });
  scene.add(measure.group);

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
  const areaHtml = (r) => (r.area ? `<span>${r.area}</span>` : '');
  DIMS.forEach(([x1, z1, x2, z2, text]) => addTag('tag--dim', text, [(x1 + x2) / 2, 0.02, (z1 + z2) / 2], 'dim'));
  const measureTag = addTag('tag--dim tag--measure', '', [0, 0.02, 0], 'measure');
  const focusTag = addTag('tag--focus', '', [0, 0, 0], 'focus');
  SPOTS.forEach((s) => {
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
  });
  function closeSpots() {
    overlay.querySelectorAll('.spot').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    overlay.querySelectorAll('.spot-card').forEach((c) => { c.hidden = true; });
  }

  // ---- stav ----
  let progress = reduceMotion ? 0.4 : 0;
  let beat = reduceMotion ? 1 : 0;
  let width = 1, height = 1, baseRadius = 24;
  const cur = { rise: reduceMotion ? 1 : 0, az: 0, pol: 0.001, rad: 1, dim: 0, spot: 0, sun: 0, tx: CENTER.x, tz: CENTER.z, focus: 0 };
  const user = { az: 0, pol: 0 };
  let focused = null, hovered = null, autoFocus = false;
  let visible = true, needsFrame = true, lastInteraction = 0, lastTime = 0, shadowRise = -1, ready = false;
  let flat = false;                       // ručně přepnuto na 2D půdorys

  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => a + (b - a) * t;
  const deg = (d) => (d * Math.PI) / 180;
  const fmt = (m) => `${m.toFixed(2).replace('.', ',')} m`;
  const TAN = Math.tan(deg(15));

  function targets(p) {
    const rise = smooth(0.06, 0.26, p);
    const s2 = smooth(0.36, 0.45, p);
    const sIn = smooth(0.57, 0.64, p), sOut = smooth(0.78, 0.83, p);
    const sSun = reduceMotion ? (sunState.manual ? 1 : 0) : sIn * (1 - sOut);
    const s3 = smooth(0.83, 0.93, p);
    const narrow = camera.aspect < 1.2;
    const t = {
      rise,
      pol: mix(mix(mix(0.001, deg(46), rise), deg(38), s2), deg(40), sSun),
      az: mix(mix(mix(0, deg(-26), rise), deg(16), s2), deg(-8), sIn) + s3 * deg(38),
      rad: mix(mix(1, narrow ? 1.16 : 1.42, rise), narrow ? 1.6 : 1.68, sSun),
      dim: s2 * (1 - smooth(0.55, 0.59, p)) * (measure.a ? 0 : 1),
      spot: s3,
      sun: sSun,
      tx: CENTER.x,
      tz: mix(CENTER.z, CENTER.z + 0.45, rise),
      focus: 0,
    };
    if (flat) { t.rise = 0; t.pol = 0.001; t.az = 0; t.rad = mix(1, narrow ? 1.5 : 1.6, sSun); t.tz = mix(CENTER.z, SUN_C[1], sSun); }
    if (focused) {
      t.tx = focused.center[0];
      t.tz = focused.center[1];
      t.rad = ((focused.size * 2.3 + 9) / baseRadius) * (narrow ? 1.15 : 1);
      t.pol = deg(44);
      t.focus = autoFocus ? 0 : 1;
    }
    return t;
  }

  // Kamera se v pohledu shora nastaví tak, aby model přesně překryl statický obrázek půdorysu.
  function resize() {
    const r = view.getBoundingClientRect();
    width = Math.max(1, r.width); height = Math.max(1, r.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const ir = planImg?.getBoundingClientRect();
    const shown = ir && ir.height > 20 && !stage.classList.contains('is-static') ? ir.height : Math.min(height * 0.8, (width * 0.86 * PLANE_H) / PLANE_W);
    baseRadius = (PLANE_H * (height / shown)) / (2 * TAN);
    needsFrame = true;
  }

  function setBeat(next) {
    if (next === beat) return;
    beat = next;
    autoFocus = beat === SPOT_BEAT;
    setFocus(autoFocus ? mainRoom : null);
    if (beat !== 2) clearMeasure();
    if (beat !== SPOT_BEAT) closeSpots();
    if (beat !== SUN_BEAT) sunState.manual = false;
    setFlat(false);
    setHover(null);
    updateUi();
  }

  function updateUi() {
    if (hintEl) hintEl.textContent = focused && !autoFocus ? [focused.name, focused.area].filter(Boolean).join(', ') : HINTS[beat] || HINTS[0];
    if (resetBtn) {
      const show = (!!focused && !autoFocus) || (!!measure.a && beat === 2);
      resetBtn.hidden = !show;
      resetBtn.textContent = focused ? 'Zpět na celý byt' : 'Smazat měření';
    }
    stage.dataset.mode = MODES[beat];
  }

  function readScroll() {
    if (reduceMotion) return;
    const r = stage.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    progress = total > 0 ? clamp01(-r.top / total) : 0;
    const b = Math.min(beats.length - 1, Math.floor(progress * beats.length * 0.999));
    beats.forEach((el, i) => el.classList.toggle('is-active', i === b));
    dots.forEach((d, i) => d.setAttribute('aria-current', String(i === b)));
    setBeat(b);
    // v kroku se sluncem posouvá čas samotný scroll, dokud si ho návštěvník nenastaví sám
    if (beat === SUN_BEAT && !sunState.manual) {
      const [lo, hi] = sunState.range;
      setSunTime(mix(lo + 40, hi - 40, clamp01((progress - 0.62) / 0.15)), false);
    }
    needsFrame = true;
  }

  // ---- přepínač 2D / 3D ----
  function setFlat(on) {
    if (flat === on) return;
    flat = on;
    user.az = 0; user.pol = 0;
    if (on) setFocus(null);
    modeBox?.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.view === '2d') === on)));
    needsFrame = true;
  }
  modeBox?.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-view]');
    if (b) setFlat(b.dataset.view === '2d');
  });

  // ---- slunce: poloha podle času, stíny a světlo dopadající okny ----
  const rad2 = (d) => (d * Math.PI) / 180;
  const NORTH = [Math.sin(rad2(NORTH_DEG)), -Math.cos(rad2(NORTH_DEG))];   // směr k severu v rovině půdorysu [x, z]
  const EAST = [Math.cos(rad2(NORTH_DEG)), Math.sin(rad2(NORTH_DEG))];
  const sunState = { season: 'leto', minutes: 9 * 60, manual: false, range: [300, 1260], dir: new THREE.Vector3(0, 1, 0), elev: 1 };
  // výška a směr slunce pro místní čas v minutách
  function sunAt(minutes, season) {
    const { decl, tz } = SEASONS[season];
    const H = rad2(15 * (minutes / 60 - tz + LON / 15 - 12));
    const f = rad2(LAT), d = rad2(decl);
    const elev = Math.asin(Math.sin(f) * Math.sin(d) + Math.cos(f) * Math.cos(d) * Math.cos(H));
    const azim = Math.atan2(-Math.sin(H) * Math.cos(d), Math.cos(f) * Math.sin(d) - Math.sin(f) * Math.cos(d) * Math.cos(H));
    const hx = NORTH[0] * Math.cos(azim) + EAST[0] * Math.sin(azim), hz = NORTH[1] * Math.cos(azim) + EAST[1] * Math.sin(azim);
    return { elev, hx, hz };
  }
  // východ a západ slunce v místním čase (minuty), zaokrouhleno dovnitř na 10 minut
  function dayRange(season) {
    const { decl, tz } = SEASONS[season];
    const H0 = Math.acos(-Math.tan(rad2(LAT)) * Math.tan(rad2(decl))) * 180 / Math.PI / 15;
    const noon = (12 + tz - LON / 15) * 60;
    return [Math.ceil((noon - H0 * 60) / 10) * 10, Math.floor((noon + H0 * 60) / 10) * 10];
  }
  const sunPoint = (o, out) => out.set(SUN_C[0] + SUN_R * Math.cos(o.elev) * o.hx, 0.25 + SUN_R * 0.62 * Math.sin(Math.max(0, o.elev)), SUN_C[1] + SUN_R * Math.cos(o.elev) * o.hz);

  const sunGroup = new THREE.Group();
  const sunLineMat = new THREE.MeshBasicMaterial({ color: 0x415a77, transparent: true, opacity: 0, depthWrite: false });
  const sunBallMat = new THREE.MeshBasicMaterial({ color: C.accent, transparent: true, opacity: 0 });
  const sunRimMat = new THREE.MeshBasicMaterial({ color: C.ink, transparent: true, opacity: 0, side: THREE.BackSide });
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xf4e23a, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const ringGeo = new THREE.RingGeometry(SUN_R - 0.025, SUN_R + 0.025, 96);
  ringGeo.rotateX(-Math.PI / 2);
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x9fb0c5, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  ring.position.set(SUN_C[0], 0.01, SUN_C[1]);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), sunBallMat);
  const rim = new THREE.Mesh(new THREE.SphereGeometry(0.47, 24, 16), sunRimMat);
  // šipka k severu na obvodu kruhu
  const arrowShape = new THREE.Shape([new THREE.Vector2(0, 0.55), new THREE.Vector2(0.3, -0.2), new THREE.Vector2(0, -0.05), new THREE.Vector2(-0.3, -0.2)]);
  const arrowGeo = new THREE.ShapeGeometry(arrowShape);
  arrowGeo.rotateX(-Math.PI / 2);                 // špička míří k -z
  arrowGeo.rotateY(-rad2(NORTH_DEG));             // a pak k severu
  const arrow = new THREE.Mesh(arrowGeo, new THREE.MeshBasicMaterial({ color: C.ink, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  arrow.position.set(SUN_C[0] + NORTH[0] * (SUN_R + 0.55), 0.02, SUN_C[1] + NORTH[1] * (SUN_R + 0.55));
  let arc = null;
  // světlo z oken: jeden mesh, trojúhelníky se přepočítají při změně času
  const lightGeo = new THREE.BufferGeometry();
  const lightPos = new Float32Array(600 * 3);
  lightGeo.setAttribute('position', new THREE.BufferAttribute(lightPos, 3));
  lightGeo.setDrawRange(0, 0);
  const lightMesh = new THREE.Mesh(lightGeo, lightMat);
  lightMesh.frustumCulled = false;
  lightMesh.renderOrder = 3;
  sunGroup.add(ring, arrow, rim, ball, lightMesh);
  sunGroup.visible = false;
  scene.add(sunGroup);
  const northTag = addTag('tag--north', 'Sever', [SUN_C[0] + NORTH[0] * (SUN_R + 1.5), 0, SUN_C[1] + NORTH[1] * (SUN_R + 1.5)], 'sun');
  const sunTag = addTag('tag--sun', '', [0, 0, 0], 'sun');

  function buildArc() {
    if (arc) { sunGroup.remove(arc); arc.geometry.dispose(); }
    const [lo, hi] = dayRange(sunState.season);
    const pts = [];
    for (let i = 0; i <= 48; i += 1) pts.push(sunPoint(sunAt(mix(lo - 10, hi + 10, i / 48), sunState.season), new THREE.Vector3()));
    arc = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 96, 0.035, 6, false), sunLineMat);
    sunGroup.add(arc);
  }

  // oříznutí mnohoúhelníku obdélníkem [x1, z1, x2, z2]
  function clipRect(poly, [x1, z1, x2, z2]) {
    const edges = [[0, x1, 1], [0, x2, -1], [1, z1, 1], [1, z2, -1]];
    let out = poly;
    for (const [ax, lim, sign] of edges) {
      const src = out; out = [];
      for (let i = 0; i < src.length; i += 1) {
        const p = src[i], q = src[(i + 1) % src.length];
        const pin = (p[ax] - lim) * sign >= 0, qin = (q[ax] - lim) * sign >= 0;
        if (pin) out.push(p);
        if (pin !== qin) { const k = (lim - p[ax]) / (q[ax] - p[ax]); out.push([p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k]); }
      }
      if (!out.length) break;
    }
    return out;
  }

  const fmtTime = (m) => `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, '0')}`;
  const sunEls = sunBox ? { range: sunBox.querySelector('input[type="range"]'), out: sunBox.querySelector('output'), rooms: sunBox.querySelector('.sun__rooms'), seasons: [...sunBox.querySelectorAll('[data-season]')] } : null;

  function updateSun() {
    const o = sunAt(sunState.minutes, sunState.season);
    sunState.elev = o.elev;
    sunPoint(o, ball.position); rim.position.copy(ball.position);
    sunTag.pos.copy(ball.position); sunTag.pos.y += 0.95;
    sunTag.el.textContent = fmtTime(sunState.minutes);
    // světlo pro stíny: u obzoru ho držíme aspoň 6° nad zemí, aby stíny nebyly nekonečné
    const e = Math.max(rad2(6), o.elev);
    sunState.dir.set(Math.cos(e) * o.hx, Math.sin(e), Math.cos(e) * o.hz);
    // dopad světla z oken na podlahu
    let n = 0;
    const lit = [];
    if (o.elev > rad2(1.5)) {
      const k = 1 / Math.tan(o.elev);
      for (const w of WINDOWS) {
        const facing = o.hx * w.n[0] + o.hz * w.n[1];
        if (facing < 0.08) continue;
        const d1 = Math.min(14, w.sill * k), d2 = Math.min(14, w.top * k);
        const quad = [[w.a[0] - o.hx * d1, w.a[1] - o.hz * d1], [w.b[0] - o.hx * d1, w.b[1] - o.hz * d1], [w.b[0] - o.hx * d2, w.b[1] - o.hz * d2], [w.a[0] - o.hx * d2, w.a[1] - o.hz * d2]];
        for (const rect of ROOMS[w.room].rects) {
          const poly = clipRect(quad, rect);
          if (poly.length < 3) continue;
          for (let i = 1; i < poly.length - 1 && n < 597; i += 1) {
            for (const q of [poly[0], poly[i], poly[i + 1]]) { lightPos[n * 3] = q[0]; lightPos[n * 3 + 1] = 0.016; lightPos[n * 3 + 2] = q[1]; n += 1; }
          }
        }
        const r = ROOMS[w.room];
        const label = r.name === 'Pokoj' ? `pokoj ${r.area}` : r.name.charAt(0).toLowerCase() + r.name.slice(1);
        if (!lit.includes(label)) lit.push(label);   // okno je ke slunci natočené, i když světlo dopadá jen na stěnu
      }
    }
    lightGeo.setDrawRange(0, n);
    lightGeo.attributes.position.needsUpdate = true;
    if (sunEls) {
      sunEls.out.textContent = fmtTime(sunState.minutes);
      if (+sunEls.range.value !== Math.round(sunState.minutes)) sunEls.range.value = Math.round(sunState.minutes);
      sunEls.range.setAttribute('aria-valuetext', `${fmtTime(sunState.minutes)}, ${SEASONS[sunState.season].label}`);
      sunEls.rooms.innerHTML = lit.length ? `Slunce svítí do oken: <strong>${lit.join(', ')}</strong>` : 'Do oken teď přímé slunce nesvítí';
    }
    shadowRise = -1;        // vynutí přepočet stínů
    needsFrame = true;
  }
  function setSunTime(minutes, manual) {
    const [lo, hi] = sunState.range;
    const m = Math.min(hi, Math.max(lo, minutes));
    if (manual) sunState.manual = true;
    if (Math.abs(m - sunState.minutes) < 0.5 && !manual) return;
    sunState.minutes = m;
    updateSun();
  }
  function setSeason(name) {
    const [lo0, hi0] = sunState.range;
    const part = clamp01((sunState.minutes - lo0) / (hi0 - lo0));
    sunState.season = name;
    sunState.range = dayRange(name);
    const [lo, hi] = sunState.range;
    if (sunEls) {
      sunEls.range.min = lo; sunEls.range.max = hi;
      sunEls.seasons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.season === name)));
    }
    sunState.minutes = Math.round(mix(lo, hi, part) / 10) * 10;   // stejná část dne i v jiném období
    buildArc();
    updateSun();
  }
  if (sunEls) {
    sunEls.range.addEventListener('input', () => setSunTime(+sunEls.range.value, true));
    sunEls.seasons.forEach((b) => b.addEventListener('click', () => { sunState.manual = true; setSeason(b.dataset.season); }));
  }
  sunState.range = dayRange('leto');
  setSeason('leto');

  // ---- interakce ----
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();

  function pointerNdc(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  }
  function roomAt(e) {
    pointerNdc(e);
    const hits = ray.intersectObjects(pickMeshes, false);
    return hits.length ? hits[0].object.userData.room : null;
  }
  function groundAt(e) {
    pointerNdc(e);
    if (!ray.ray.intersectPlane(ground, hit)) return null;
    if (hit.x < 0.2 || hit.x > 9.65 || hit.z < 0.2 || hit.z > 9.15) return null;
    return [hit.x, hit.z];
  }
  function setHover(room) {
    if (hovered === room) return;
    hovered = room;
    canvas.style.cursor = room ? 'pointer' : '';
    needsFrame = true;
  }
  function setFocus(room) {
    if (focused === room) return;
    focused = room;
    user.pol = 0;
    if (room) { focusTag.el.innerHTML = `${room.name}${areaHtml(room)}`; focusTag.pos.set(room.center[0], 0.05, room.center[1]); }
    updateUi();
    needsFrame = true;
  }
  function clearMeasure() {
    measure.a = measure.b = null; measure.fixed = false;
    dotA.visible = dotB.visible = false;
    if (measure.line) { measure.group.remove(measure.line); measure.line.geometry.dispose(); measure.line = null; }
    updateUi();
    needsFrame = true;
  }
  function drawMeasure() {
    const { a, b } = measure;
    dotA.visible = !!a; dotB.visible = !!b;
    if (a) dotA.position.set(a[0], 0.035, a[1]);
    if (b) dotB.position.set(b[0], 0.035, b[1]);
    if (measure.line) { measure.group.remove(measure.line); measure.line.geometry.dispose(); measure.line = null; }
    if (a && b) {
      measure.line = new THREE.Mesh(stripGeo(a[0], a[1], b[0], b[1], 0.07), measureMat);
      measure.line.renderOrder = 11;
      measure.group.add(measure.line);
      measureTag.pos.set((a[0] + b[0]) / 2, 0.02, (a[1] + b[1]) / 2);
      measureTag.el.textContent = fmt(Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    needsFrame = true;
  }

  function onClick(e) {
    if (cur.rise < 0.6 && !flat) return;
    if (beat === 1 || (reduceMotion && beat !== 2)) {
      const room = roomAt(e);
      setFocus(room && room !== focused ? room : null);
    } else if (beat === 2) {
      const p = groundAt(e);
      if (!p) return;
      if (!measure.a || measure.fixed) { measure.a = p; measure.b = null; measure.fixed = false; } else { measure.b = p; measure.fixed = true; }
      drawMeasure();
      updateUi();
    }
  }

  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, az: user.az, pol: user.pol, moved: false, id: e.pointerId };
  });
  canvas.addEventListener('pointermove', (e) => {
    lastInteraction = performance.now();
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > 6 && cur.rise > 0.5 && !flat) {
        drag.moved = true;
        canvas.setPointerCapture(drag.id);
        canvas.classList.add('is-dragging');
      }
      if (drag.moved) {
        user.az = drag.az - (dx / width) * Math.PI * 1.2;
        if (e.pointerType === 'mouse') user.pol = Math.min(0.5, Math.max(-0.6, drag.pol - (dy / height) * 1.2));
        needsFrame = true;
      }
      return;
    }
    if (e.pointerType !== 'mouse' || (cur.rise < 0.6 && !flat)) return;
    if (beat === 1) setHover(roomAt(e));
    else if (beat === 2) {
      const p = groundAt(e);
      canvas.style.cursor = p ? 'crosshair' : '';
      if (measure.a && !measure.fixed && p) { measure.b = p; drawMeasure(); }
    }
  });
  const endDrag = (e) => {
    if (drag && !drag.moved && e.type === 'pointerup') onClick(e);
    drag = null;
    canvas.classList.remove('is-dragging');
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', () => { if (!drag) setHover(null); });

  resetBtn?.addEventListener('click', () => { if (focused) setFocus(null); else clearMeasure(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeSpots(); if (!autoFocus) setFocus(null); } });

  dots.forEach((d, i) => d.addEventListener('click', () => {
    const r = stage.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    window.scrollTo({ top: window.scrollY + r.top + total * ((i + 0.5) / beats.length), behavior: 'smooth' });
  }));

  // ---- vykreslení ----
  const v = new THREE.Vector3();
  const SUN_BASE = sun.position.clone();
  let sunWas = false, sunShadow = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) return;
    const dt = Math.min(0.05, (now - lastTime) / 1000 || 0.016);
    lastTime = now;
    const ease = reduceMotion ? 1 : 1 - Math.exp(-dt * 7); // stejně plynulé na 60 i 120 Hz
    const t = targets(progress);
    let moving = false;
    for (const k of Object.keys(t)) {
      const d = t[k] - cur[k];
      if (Math.abs(d) > 0.0005) { cur[k] += d * ease; moving = true; } else cur[k] = t[k];
    }
    for (const room of ROOMS) {
      const want = room === focused && !autoFocus ? 0.5 : room === hovered ? 0.4 : 0;
      if (Math.abs(want - room.glow) > 0.01) { room.glow += (want - room.glow) * Math.min(1, ease * 2); moving = true; } else room.glow = want;
      room.mat.opacity = room.glow;
    }
    const idle = !reduceMotion && cur.rise > 0.9 && !drag && now - lastInteraction > 1800;
    const sway = idle ? Math.sin(now / 2600) * deg(2) : 0;
    if (idle) moving = true;
    if (!moving && !needsFrame) return;
    needsFrame = false;

    const h = Math.max(0.004, cur.rise);
    walls.scale.y = h;
    caps.position.y = WALL_H * h + 0.02;
    things.scale.y = Math.max(0.002, smooth(0.2, 1, cur.rise));
    shadowMat.opacity = mix(0.22, 0.42, cur.sun) * cur.rise;
    dimMat.opacity = cur.dim;
    // slunce: světlo se přesune z výchozí polohy na skutečný směr slunce
    sunGroup.visible = cur.sun > 0.01;
    if (sunGroup.visible || sunWas) {
      sunWas = sunGroup.visible;
      sun.position.copy(SUN_BASE).lerp(v.copy(sunState.dir).multiplyScalar(26).add(CENTER), cur.sun);
      const low = 1 - smooth(0, deg(14), sunState.elev);
      sun.color.setRGB(1, mix(0.957, mix(0.957, 0.78, low), cur.sun), mix(0.9, mix(0.9, 0.55, low), cur.sun));
      sunLineMat.opacity = 0.9 * cur.sun; ring.material.opacity = 0.8 * cur.sun; arrow.material.opacity = cur.sun;
      sunBallMat.opacity = cur.sun; sunRimMat.opacity = cur.sun;
      lightMat.opacity = 0.62 * cur.sun * smooth(deg(1.5), deg(7), sunState.elev);
      if (Math.abs(cur.sun - sunShadow) > 0.002) { sunShadow = cur.sun; shadowRise = -1; }
    }
    if (Math.abs(cur.rise - shadowRise) > 0.002) { shadowRise = cur.rise; renderer.shadowMap.needsUpdate = true; }

    const pol = Math.min(deg(80), Math.max(0.001, cur.pol + user.pol * cur.rise));
    const az = cur.az + (user.az + sway) * cur.rise;
    const rad = baseRadius * cur.rad;
    camera.position.set(cur.tx + rad * Math.sin(pol) * Math.sin(az), rad * Math.cos(pol), cur.tz + rad * Math.sin(pol) * Math.cos(az));
    camera.lookAt(cur.tx, 0, cur.tz);
    renderer.render(scene, camera);

    // první snímek s texturou: 3D půdorys nahradí statický obrázek
    if (!ready && textureReady) { ready = true; stage.classList.add('is-ready'); }

    for (const tag of tags) {
      v.copy(tag.pos);
      if (tag.group === 'spot') v.y *= cur.rise;
      v.project(camera);
      const x = (v.x * 0.5 + 0.5) * width, y = (-v.y * 0.5 + 0.5) * height;
      let a = 0;
      if (tag.group === 'dim') a = cur.dim;
      else if (tag.group === 'spot') a = cur.spot;
      else if (tag.group === 'measure') a = measure.a && measure.b ? 1 : 0;
      else if (tag.group === 'focus') a = cur.focus;
      else if (tag.group === 'sun') a = cur.sun;
      tag.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      tag.el.style.opacity = a.toFixed(2);
      tag.el.style.visibility = a < 0.03 ? 'hidden' : 'visible';
    }
  }

  new ResizeObserver(resize).observe(view);
  planImg?.addEventListener('load', resize);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; needsFrame = true; }).observe(stage);
  window.addEventListener('scroll', readScroll, { passive: true });
  resize();
  readScroll();
  if (reduceMotion) beats.forEach((b) => b.classList.add('is-active'));
  updateUi();
  requestAnimationFrame(frame);

  // pro testy
  window.__showspaceModel = {
    project(x, z) { const r = canvas.getBoundingClientRect(); const q = new THREE.Vector3(x, 0, z).project(camera); return [r.left + (q.x * 0.5 + 0.5) * r.width, r.top + (-q.y * 0.5 + 0.5) * r.height]; },
    get beat() { return beat; },
    get flat() { return flat; },
    get sun() { return { on: +cur.sun.toFixed(2), time: fmtTime(sunState.minutes), season: sunState.season, elev: +(sunState.elev * 180 / Math.PI).toFixed(1), range: sunState.range.map(fmtTime), tris: lightGeo.drawRange.count / 3 }; },
    get focused() { return focused?.name || null; },
    get measured() { return measure.fixed ? measureTag.el.textContent : null; },
  };
}
