// ShowSpace – interaktivní 3D model bytu na úvodní stránce.
//
// Scrollem se z půdorysu zvednou stěny. Podle kroku pak model reaguje jinak:
//   krok 1 – kliknutím na místnost do ní kamera vletí
//   krok 2 – kliknutím na dvě místa se změří vzdálenost
//   krok 3 – informační body s popiskem
// Model je ilustrační (není to konkrétní zakázka). Rozměry jsou v metrech.
import * as THREE from '../vendor/three.module.min.js';

const stage = document.querySelector('.stage');
const view = stage?.querySelector('.stage__view');
const canvas = view?.querySelector('canvas');
const overlay = view?.querySelector('.stage__overlay');
const beats = stage ? [...stage.querySelectorAll('.beat')] : [];
const dots = stage ? [...stage.querySelectorAll('.stage__progress button')] : [];
const resetBtn = stage?.querySelector('.stage__reset');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const C = {
  wall: 0xe9e5d8, cap: 0x415a77, floor: 0xf8e6d4, floorAlt: 0xf4dcc5, floorHover: 0xeae151,
  slate: 0x415a77, white: 0xffffff, wood: 0xc99b6b, plant: 0x5f8f6a, pot: 0xd9c4ae, rug: 0xe9e4d2, ink: 0x18212f, sofa: 0xe2c64a,
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

// kvádry: [x1, z1, x2, z2, výška, barva, odspodu]
const BOXES = [
  [1.0, 0.5, 3.5, 1.45, 0.42, 'sofa'], [1.0, 0.5, 3.5, 0.72, 0.8, 'sofa'],     // pohovka + opěradlo
  [1.7, 2.1, 2.8, 2.75, 0.36, 'white'],                                        // konferenční stolek
  [5.75, 0.35, 6.35, 3.7, 0.9, 'white'], [5.72, 0.32, 6.38, 3.73, 0.05, 'wood', 0.9], // linka + deska
  [3.9, 1.4, 4.9, 3.0, 0.06, 'wood', 0.7],                                     // jídelní stůl (deska)
  [3.98, 1.48, 4.06, 1.56, 0.7, 'wood'], [4.74, 1.48, 4.82, 1.56, 0.7, 'wood'],
  [3.98, 2.84, 4.06, 2.92, 0.7, 'wood'], [4.74, 2.84, 4.82, 2.92, 0.7, 'wood'],
  [7.9, 0.45, 9.9, 2.5, 0.45, 'white'], [7.9, 0.33, 9.9, 0.47, 0.95, 'slate'], // postel + čelo
  [8.05, 0.6, 8.8, 1.05, 0.12, 'rug', 0.45], [9.0, 0.6, 9.75, 1.05, 0.12, 'rug', 0.45], // polštáře
  [7.35, 0.4, 7.8, 0.85, 0.5, 'wood'], [10.0, 0.4, 10.45, 0.85, 0.5, 'wood'],  // noční stolky
  [10.25, 1.4, 10.82, 4.1, 1.15, 'white'],                                     // skříň
  [0.3, 4.8, 1.3, 6.8, 0.42, 'white'], [0.42, 4.9, 1.18, 5.3, 0.1, 'rug', 0.42], // postel v pokoji
  [0.3, 7.1, 1.9, 7.75, 0.06, 'wood', 0.7], [0.36, 7.16, 0.44, 7.24, 0.7, 'wood'], [1.76, 7.16, 1.84, 7.24, 0.7, 'wood'], // psací stůl
  [7.7, 6.1, 8.45, 7.8, 0.55, 'white'],                                        // vana
  [6.2, 7.3, 6.9, 7.8, 0.85, 'white'],                                         // umyvadlo
  [8.8, 7.4, 10.8, 7.85, 1.1, 'white'],                                        // šatní police
];
// koberce: [x1, z1, x2, z2, barva]
const RUGS = [[0.8, 1.7, 3.6, 3.3, 'rug'], [7.5, 2.7, 10.1, 3.9, 'rug'], [1.6, 5.2, 3.5, 6.6, 'rug']];
// květiny: [x, z, velikost]
const PLANTS = [[0.45, 0.45, 1], [6.05, 4.1, 0.8], [6.95, 4.05, 0.9], [3.55, 7.55, 0.8], [5.0, 5.0, 0.7]];

// ukázkové kóty: [x1, z1, x2, z2, text]
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

const HINTS = [
  'Ilustrační model bytu 3+kk, 88 m²',
  'Klikněte na místnost. Tažením model otočíte.',
  'Klikněte na dvě místa a změřte vzdálenost.',
  'Klikněte na bod v modelu.',
];

const CENTER = new THREE.Vector3(5.5, 0, 4);
const WALL_H = 1.25;

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

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xe6ebf1, 2.3));
  const sun = new THREE.DirectionalLight(0xfff4e6, 1.5);
  sun.position.set(-3, 13, -4);
  sun.target.position.copy(CENTER);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  sun.shadow.bias = -0.0006;
  sun.shadow.radius = 6;
  scene.add(sun, sun.target);

  const std = (c, rough = 0.9) => new THREE.MeshStandardMaterial({ color: C[c], roughness: rough, metalness: 0 });
  const mats = { wall: std('wall'), sofa: std('sofa'), slate: std('slate'), white: std('white', 0.7), wood: std('wood'), rug: std('rug', 1), plant: std('plant', 1), pot: std('pot') };
  const capMat = new THREE.MeshBasicMaterial({ color: C.cap });

  // měkký stín pod celým bytem
  const blobCanvas = document.createElement('canvas');
  blobCanvas.width = blobCanvas.height = 256;
  const bctx = blobCanvas.getContext('2d');
  const grad = bctx.createRadialGradient(128, 128, 40, 128, 128, 128);
  grad.addColorStop(0, 'rgba(22,29,43,0.34)');
  grad.addColorStop(1, 'rgba(22,29,43,0)');
  bctx.fillStyle = grad;
  bctx.fillRect(0, 0, 256, 256);
  const blobMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(blobCanvas), transparent: true, opacity: 0, depthWrite: false });
  const blobGeo = new THREE.PlaneGeometry(19, 15);
  blobGeo.rotateX(-Math.PI / 2);
  const blob = new THREE.Mesh(blobGeo, blobMat);
  blob.position.set(CENTER.x + 0.5, -0.03, CENTER.z + 0.6);
  scene.add(blob);

  // podlahy – každá místnost má vlastní materiál kvůli zvýraznění
  const floorMeshes = [];
  ROOMS.forEach((room, i) => {
    room.base = new THREE.Color(i % 2 ? C.floorAlt : C.floor);
    room.mat = new THREE.MeshStandardMaterial({ color: room.base.clone(), roughness: 1 });
    room.glow = 0;
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    room.rects.forEach(([x1, z1, x2, z2]) => {
      const g = new THREE.PlaneGeometry(x2 - x1, z2 - z1);
      g.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(g, room.mat);
      mesh.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
      mesh.receiveShadow = true;
      mesh.userData.room = room;
      scene.add(mesh);
      floorMeshes.push(mesh);
      minX = Math.min(minX, x1); minZ = Math.min(minZ, z1); maxX = Math.max(maxX, x2); maxZ = Math.max(maxZ, z2);
    });
    room.center = [(minX + maxX) / 2, (minZ + maxZ) / 2];
    room.size = Math.max(maxX - minX, maxZ - minZ);
  });
  const hoverColor = new THREE.Color(C.floorHover);

  // stěny rostou odspodu, tmavé „čepičky“ drží kresbu půdorysu i při pohledu shora
  const walls = new THREE.Group();
  const caps = new THREE.Group();
  WALLS.forEach(([x1, z1, x2, z2, t]) => {
    const horizontal = z1 === z2;
    const len = (horizontal ? x2 - x1 : z2 - z1) + t;
    const sx = horizontal ? len : t, sz = horizontal ? t : len;
    const g = new THREE.BoxGeometry(sx, WALL_H, sz);
    g.translate(0, WALL_H / 2, 0);
    const mesh = new THREE.Mesh(g, mats.wall);
    mesh.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    walls.add(mesh);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(sx + 0.005, 0.045, sz + 0.005), capMat);
    cap.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
    caps.add(cap);
  });
  scene.add(walls, caps);

  // vybavení
  const furniture = new THREE.Group();
  BOXES.forEach(([x1, z1, x2, z2, h, c, y = 0]) => {
    const g = new THREE.BoxGeometry(x2 - x1, h, z2 - z1);
    g.translate(0, h / 2 + y, 0);
    const mesh = new THREE.Mesh(g, mats[c]);
    mesh.position.set((x1 + x2) / 2, 0.002, (z1 + z2) / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    furniture.add(mesh);
  });
  PLANTS.forEach(([x, z, s]) => {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.12 * s, 0.3 * s, 16), mats.pot);
    pot.position.set(x, 0.15 * s, z);
    const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34 * s, 1), mats.plant);
    leaves.position.set(x, 0.62 * s, z);
    leaves.scale.y = 1.25;
    [pot, leaves].forEach((m) => { m.castShadow = true; furniture.add(m); });
  });
  scene.add(furniture);
  RUGS.forEach(([x1, z1, x2, z2, c]) => {
    const g = new THREE.PlaneGeometry(x2 - x1, z2 - z1);
    g.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(g, mats[c]);
    mesh.position.set((x1 + x2) / 2, 0.006, (z1 + z2) / 2);
    mesh.receiveShadow = true;
    scene.add(mesh);
  });

  // pásky na podlaze (kóty), vždy viditelné i přes stěny
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

  // vlastní měření
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
  ROOMS.forEach((r) => { r.tag = addTag('tag--room', `${r.name}<span>${r.area}</span>`, [r.label[0], 0.05, r.label[1]], 'room'); });
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
  let progress = reduceMotion ? 1 : 0;
  let beat = reduceMotion ? 1 : 0;       // aktuální krok (určuje, co dělá kliknutí)
  let width = 1, height = 1, baseRadius = 20;
  const cur = { rise: reduceMotion ? 1 : 0, az: 0, pol: 0.02, rad: 1, dim: 0, spot: 0, tx: CENTER.x, tz: CENTER.z, focus: 0 };
  const user = { az: 0, pol: 0 };
  let focused = null, hovered = null;
  let visible = true, needsFrame = true, lastInteraction = 0;

  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => a + (b - a) * t;
  const deg = (d) => (d * Math.PI) / 180;
  const fmt = (m) => `${m.toFixed(2).replace('.', ',')} m`;

  function targets(p) {
    const rise = smooth(0.05, 0.3, p);
    const s2 = smooth(0.44, 0.56, p);
    const s3 = smooth(0.74, 0.9, p);
    const tiltRoom = camera.aspect < 1.2 ? 0.84 : 1; // na výšku rozhoduje šířka, model může být blíž
    const t = {
      rise,
      pol: mix(mix(0.02, deg(46), rise), deg(38), s2) + s3 * deg(8),
      az: mix(mix(0, deg(-28), rise), deg(16), s2) + s3 * deg(22),
      rad: mix(1, (mix(1.4, 1.34, s2) - s3 * 0.06) * tiltRoom, rise),
      dim: s2 * (1 - smooth(0.72, 0.78, p)) * (measure.a ? 0 : 1),
      spot: s3,
      tx: CENTER.x - s3 * 0.4,
      tz: CENTER.z - s3 * 0.2,
      focus: 0,
    };
    if (focused) {
      t.tx = focused.center[0];
      t.tz = focused.center[1];
      t.rad = (focused.size * 1.75 + 6.5) / baseRadius * (camera.aspect < 1.2 ? 1.25 : 1);
      t.pol = deg(47);
      t.focus = 1;
    }
    return t;
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

  function setBeat(next) {
    if (next === beat) return;
    beat = next;
    if (beat !== 1) setFocus(null);
    if (beat !== 2) clearMeasure();
    if (beat !== 3) closeSpots();
    setHover(null);
    updateUi();
  }

  function updateUi() {
    if (hintEl) hintEl.textContent = focused ? `${focused.name}, ${focused.area}` : HINTS[beat] || HINTS[0];
    if (resetBtn) {
      const show = !!focused || (!!measure.a && beat === 2);
      resetBtn.hidden = !show;
      resetBtn.textContent = focused ? 'Zpět na celý byt' : 'Smazat měření';
    }
    stage.dataset.mode = ['intro', 'explore', 'measure', 'spots'][beat];
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
    needsFrame = true;
  }

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
    const hits = ray.intersectObjects(floorMeshes, false);
    return hits.length ? hits[0].object.userData.room : null;
  }
  function groundAt(e) {
    pointerNdc(e);
    if (!ray.ray.intersectPlane(ground, hit)) return null;
    if (hit.x < 0.15 || hit.x > 10.85 || hit.z < 0.15 || hit.z > 7.85) return null;
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
    if (room) { focusTag.el.innerHTML = `${room.name}<span>${room.area}</span>`; focusTag.pos.set(room.center[0], 0.05, room.center[1]); }
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
    if (cur.rise < 0.6) return;
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
      if (!drag.moved && Math.hypot(dx, dy) > 6 && cur.rise > 0.5) {
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
    if (e.pointerType !== 'mouse' || cur.rise < 0.6) return;
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
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeSpots(); setFocus(null); } });

  dots.forEach((d, i) => d.addEventListener('click', () => {
    const r = stage.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    window.scrollTo({ top: window.scrollY + r.top + total * ((i + 0.5) / beats.length), behavior: 'smooth' });
  }));

  // ---- vykreslení ----
  const v = new THREE.Vector3();
  const tmpColor = new THREE.Color();
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) return;
    const t = targets(progress);
    let moving = false;
    for (const k of Object.keys(t)) {
      const d = t[k] - cur[k];
      if (Math.abs(d) > 0.0005) { cur[k] += d * (reduceMotion ? 1 : 0.09); moving = true; } else cur[k] = t[k];
    }
    // zvýraznění místností
    for (const room of ROOMS) {
      const want = room === focused ? 1 : room === hovered ? 0.7 : 0;
      if (Math.abs(want - room.glow) > 0.01) { room.glow += (want - room.glow) * 0.18; moving = true; } else room.glow = want;
      room.mat.color.copy(tmpColor.copy(room.base).lerp(hoverColor, room.glow));
    }
    // jemné pohupování, když se s modelem nic neděje
    const idle = !reduceMotion && cur.rise > 0.9 && !drag && now - lastInteraction > 1800;
    const sway = idle ? Math.sin(now / 2600) * deg(2.2) : 0;
    if (idle) moving = true;
    if (!moving && !needsFrame) return;
    needsFrame = false;

    const h = Math.max(0.012, cur.rise);
    walls.scale.y = h;
    caps.position.y = WALL_H * h + 0.02;
    furniture.scale.y = Math.max(0.004, smooth(0.25, 1, cur.rise));
    blobMat.opacity = cur.rise;
    dimMat.opacity = cur.dim;

    const pol = Math.min(deg(80), Math.max(0.02, cur.pol + user.pol * cur.rise));
    const az = cur.az + (user.az + sway) * cur.rise;
    const rad = baseRadius * cur.rad;
    camera.position.set(cur.tx + rad * Math.sin(pol) * Math.sin(az), rad * Math.cos(pol), cur.tz + rad * Math.sin(pol) * Math.cos(az));
    camera.lookAt(cur.tx, 0, cur.tz);
    renderer.render(scene, camera);

    const small = width < 520;
    const roomAlpha = (1 - Math.max(cur.spot, cur.dim * 0.6, cur.focus)) * (small ? 1 - cur.rise : 1) * (measure.a ? 0.25 : 1);
    for (const tag of tags) {
      v.copy(tag.pos);
      if (tag.group === 'spot') v.y *= cur.rise;
      v.project(camera);
      const x = (v.x * 0.5 + 0.5) * width, y = (-v.y * 0.5 + 0.5) * height;
      let a = 0;
      if (tag.group === 'room') a = roomAlpha;
      else if (tag.group === 'dim') a = cur.dim;
      else if (tag.group === 'spot') a = cur.spot;
      else if (tag.group === 'measure') a = measure.a && measure.b ? 1 : 0;
      else if (tag.group === 'focus') a = cur.focus;
      tag.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      tag.el.style.opacity = a.toFixed(2);
      tag.el.style.visibility = a < 0.03 ? 'hidden' : 'visible';
    }
  }

  new ResizeObserver(resize).observe(view);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; needsFrame = true; }).observe(stage);
  window.addEventListener('scroll', readScroll, { passive: true });
  resize();
  readScroll();
  if (reduceMotion) beats.forEach((b) => b.classList.add('is-active'));
  updateUi();
  requestAnimationFrame(frame);

  // pro testy
  window.__showspaceModel = { get beat() { return beat; }, get focused() { return focused?.name || null; }, get measured() { return measure.fixed ? measureTag.el.textContent : null; } };
}
