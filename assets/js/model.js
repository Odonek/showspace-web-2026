// ShowSpace – interaktivní 3D model na úvodní stránce.
//
// Model je postavený podle půdorysu z naší zakázky Houseboat, Praha
// (interiér 23,6 m²: obytný prostor 21,6 m² a koupelna). Rozměry jsou v metrech
// a vycházejí z měřítka půdorysu; terasa je doplněná podle fotek a je jen orientační.
//
// Scrollem se z půdorysu zvednou stěny. Podle kroku pak model reaguje jinak:
//   krok 1 – kliknutím na část prostoru do ní kamera vletí
//   krok 2 – kliknutím na dvě místa se změří vzdálenost
//   krok 3 – informační body s popiskem
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
  wall: 0xf7f7f4, cap: 0x141c2b, floor: 0xf9dcbd, bath: 0xc9d6ea, deck: 0xc58a55, floorHover: 0xeae151,
  slate: 0x415a77, white: 0xffffff, wood: 0xc99b6b, linen: 0xe9e4d2, ink: 0x18212f, sofa: 0xe6c93f, glass: 0xa9c6e3,
};

// vnitřní rozměr: 11,47 × 2,145 m
const L = 11.47, W = 2.145;

// klikací části prostoru
const ROOMS = [
  { name: 'Obývací část', rects: [[0, 0, 5.3, W]], label: [2.6, 1.45] },
  { name: 'Kuchyňka a vstup', rects: [[5.3, 0, 6.81, W], [6.81, 1.5, 8.81, W]], label: [5.9, 1.75] },
  { name: 'Koupelna', area: '2,0 m²', rects: [[6.97, 0.16, 8.67, 1.36]], label: [7.82, 0.76], color: 'bath' },
  { name: 'Spací část', rects: [[8.81, 0, L, W]], label: [10.0, 1.8] },
  { name: 'Terasa', rects: [[0.4, 2.5, 5.7, 3.95]], label: [3.05, 3.5], color: 'deck', outside: true },
];

// [x1, z1, x2, z2, tloušťka, druh] – mezery jsou dveře, 'glass' jsou okna
const WALLS = [
  // horní stěna s okny
  [-0.17, -0.175, 6.13, -0.175, 0.35], [6.13, -0.175, 6.63, -0.175, 0.12, 'glass'], [6.63, -0.175, 9.33, -0.175, 0.35],
  [9.33, -0.175, 10.99, -0.175, 0.12, 'glass'], [10.99, -0.175, 11.84, -0.175, 0.35],
  // spodní stěna: okno, posuvné dveře na terasu, okno, vchod
  [-0.17, 2.325, 0.46, 2.325, 0.36], [0.46, 2.325, 1.89, 2.325, 0.12, 'glass'], [3.62, 2.325, 5.3, 2.325, 0.12, 'glass'], [6.14, 2.325, 11.84, 2.325, 0.36],
  // čela
  [11.655, -0.35, 11.655, 2.5, 0.37], [-0.085, 0, -0.085, W, 0.1, 'glass'],
  // koupelna
  [6.89, 0, 6.89, 1.43, 0.16], [8.74, 0, 8.74, 1.43, 0.16], [6.81, 1.43, 7.77, 1.43, 0.14], [8.3, 1.43, 8.81, 1.43, 0.14], [6.97, 0.08, 8.67, 0.08, 0.16],
];

// kvádry: [x1, z1, x2, z2, výška, barva, odspodu, otočení ve stupních]
const BOXES = [
  [0.61, 0.02, 2.37, 0.9, 0.42, 'sofa'], [0.61, 0.02, 2.37, 0.24, 0.78, 'sofa'],       // pohovka + opěradlo
  [2.72, 0.24, 3.44, 0.98, 0.4, 'slate', 0, -15], [2.66, 0.2, 3.38, 0.4, 0.75, 'slate', 0, -15], // křeslo
  [3.94, 0.02, 4.97, 0.53, 0.85, 'wood'],                                              // komoda
  [6.21, 0, 6.81, 1.5, 0.9, 'white'], [6.19, 0, 6.83, 1.52, 0.04, 'wood', 0.9],        // kuchyňka + deska
  [6.97, 0.16, 7.7, 1.36, 0.08, 'white'],                                              // sprchová vanička
  [7.92, 0.2, 8.3, 0.72, 0.42, 'white'],                                               // WC
  [8.4, 1.0, 8.67, 1.36, 0.85, 'white'],                                               // umyvadlo
  [9.54, 0.02, 11.12, 1.48, 0.45, 'white'], [9.6, 0.1, 10.3, 0.5, 0.12, 'linen', 0.45], [9.6, 0.95, 10.3, 1.35, 0.12, 'linen', 0.45], // postel + polštáře
  [11.12, 0.02, L, 1.48, 0.95, 'wood'],                                                // čelo s policemi
  [1.2, 2.95, 1.75, 3.5, 0.45, 'slate'], [2.5, 2.95, 3.05, 3.5, 0.45, 'slate'], [1.95, 3.05, 2.3, 3.4, 0.4, 'wood'], // terasa: židle a stolek
];
// ukázkové kóty: [x1, z1, x2, z2, text] – délka a šířka interiéru podle půdorysu
const DIMS = [
  [0.05, 1.85, L - 0.05, 1.85, '11,5 m'],
  [5.0, 0.05, 5.0, W - 0.05, '2,1 m'],
];

const SPOTS = [
  { at: [4.3, 0.4, 3.3], title: 'Terasa', text: 'Krytá terasa s výhledem na Vltavu.' },
  { at: [7.8, 0.8, 0.75], title: 'Koupelna', text: 'Sprchový kout, WC a umyvadlo.' },
  { at: [10.3, 0.75, 0.75], title: 'Spací část', text: 'Manželská postel s úložným čelem.' },
];

const HINTS = [
  'Houseboat, Praha: model podle půdorysu z naší zakázky',
  'Klikněte na část prostoru. Tažením model otočíte.',
  'Klikněte na dvě místa a změřte vzdálenost.',
  'Klikněte na bod v modelu.',
];

const CENTER = new THREE.Vector3(5.7, 0, 1.75);
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
  renderer.shadowMap.autoUpdate = false; // stíny se přepočítají jen při změně výšky stěn

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
  const mats = { wall: std('wall'), sofa: std('sofa'), slate: std('slate'), white: std('white', 0.7), wood: std('wood'), linen: std('linen', 1) };
  const glassMat = new THREE.MeshStandardMaterial({ color: C.glass, roughness: 0.2, transparent: true, opacity: 0.55 });
  const capMat = new THREE.MeshBasicMaterial({ color: C.cap });

  // měkký stín pod celým bytem
  const blobCanvas = document.createElement('canvas');
  blobCanvas.width = blobCanvas.height = 256;
  const bctx = blobCanvas.getContext('2d');
  const grad = bctx.createRadialGradient(128, 128, 40, 128, 128, 128);
  grad.addColorStop(0, 'rgba(22,29,43,0.2)');
  grad.addColorStop(1, 'rgba(22,29,43,0)');
  bctx.fillStyle = grad;
  bctx.fillRect(0, 0, 256, 256);
  const blobMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(blobCanvas), transparent: true, opacity: 0, depthWrite: false });
  const blobGeo = new THREE.PlaneGeometry(15, 7.5);
  blobGeo.rotateX(-Math.PI / 2);
  const blob = new THREE.Mesh(blobGeo, blobMat);
  blob.position.set(CENTER.x + 0.3, -0.03, CENTER.z + 0.5);
  scene.add(blob);

  // podlahy – každá místnost má vlastní materiál kvůli zvýraznění
  const floorMeshes = [];
  ROOMS.forEach((room, i) => {
    room.base = new THREE.Color(C[room.color || 'floor']);
    room.mat = new THREE.MeshStandardMaterial({ color: room.base.clone(), roughness: 1 });
    room.glow = 0;
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    room.rects.forEach(([x1, z1, x2, z2]) => {
      const g = new THREE.PlaneGeometry(x2 - x1, z2 - z1);
      g.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(g, room.mat);
      mesh.position.set((x1 + x2) / 2, room.color === 'bath' ? 0.004 : room.outside ? -0.02 : 0, (z1 + z2) / 2);
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
  WALLS.forEach(([x1, z1, x2, z2, t, kind]) => {
    const horizontal = z1 === z2;
    const glass = kind === 'glass';
    const len = (horizontal ? x2 - x1 : z2 - z1) + (glass ? 0 : 0);
    const sx = horizontal ? len : t, sz = horizontal ? t : len;
    const g = new THREE.BoxGeometry(sx, WALL_H, sz);
    g.translate(0, WALL_H / 2, 0);
    const mesh = new THREE.Mesh(g, glass ? glassMat : mats.wall);
    mesh.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
    mesh.castShadow = !glass;
    mesh.receiveShadow = !glass;
    walls.add(mesh);
    // okna mají v půdorysu jen tenkou linku, stěny plnou
    const cap = new THREE.Mesh(new THREE.BoxGeometry(sx + 0.005, 0.045, glass ? Math.min(sz, 0.06) : sz + 0.005), capMat);
    if (glass && !horizontal) cap.scale.set(0.6, 1, 1);
    cap.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
    caps.add(cap);
  });
  scene.add(walls, caps);

  // vybavení
  const furniture = new THREE.Group();
  BOXES.forEach(([x1, z1, x2, z2, h, c, y = 0, turn = 0]) => {
    const g = new THREE.BoxGeometry(x2 - x1, h, z2 - z1);
    g.translate(0, h / 2 + y, 0);
    const mesh = new THREE.Mesh(g, mats[c]);
    mesh.position.set((x1 + x2) / 2, 0.002, (z1 + z2) / 2);
    mesh.rotation.y = (turn * Math.PI) / 180;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    furniture.add(mesh);
  });
  scene.add(furniture);
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
  const areaHtml = (r) => (r.area ? `<span>${r.area}</span>` : '');
  ROOMS.forEach((r) => { r.tag = addTag('tag--room', `${r.name}${areaHtml(r)}`, [r.label[0], 0.05, r.label[1]], 'room'); });
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
  let visible = true, needsFrame = true, lastInteraction = 0, lastTime = 0, shadowRise = -1;

  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => a + (b - a) * t;
  const deg = (d) => (d * Math.PI) / 180;
  const fmt = (m) => `${m.toFixed(2).replace('.', ',')} m`;

  function targets(p) {
    const rise = smooth(0.05, 0.3, p);
    const s2 = smooth(0.44, 0.56, p);
    const s3 = smooth(0.74, 0.9, p);
    const tiltRoom = camera.aspect < 1.2 ? 0.95 : 1; // na výšku rozhoduje šířka, model může být blíž
    const t = {
      rise,
      pol: mix(mix(0.02, deg(50), rise), deg(40), s2) + s3 * deg(10),
      az: mix(mix(0, deg(-32), rise), deg(14), s2) + s3 * deg(12),
      rad: mix(1, (mix(0.96, 1.04, s2) + s3 * 0.03) * tiltRoom, rise),
      dim: s2 * (1 - smooth(0.72, 0.78, p)) * (measure.a ? 0 : 1),
      spot: s3,
      tx: CENTER.x,
      tz: CENTER.z,
      focus: 0,
    };
    if (focused) {
      t.tx = focused.center[0];
      t.tz = focused.center[1];
      t.rad = (focused.size * 1.6 + 5) / baseRadius * (camera.aspect < 1.2 ? 1.25 : 1);
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
    baseRadius = Math.max(6.2 / (2 * t), 13.5 / (2 * t * camera.aspect));
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
    if (hintEl) hintEl.textContent = focused ? [focused.name, focused.area].filter(Boolean).join(', ') : HINTS[beat] || HINTS[0];
    if (resetBtn) {
      const show = !!focused || (!!measure.a && beat === 2);
      resetBtn.hidden = !show;
      resetBtn.textContent = focused ? 'Zpět na celý prostor' : 'Smazat měření';
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
    if (hit.x < 0.05 || hit.x > L - 0.05 || hit.z < 0.05 || hit.z > W - 0.05) return null;
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
    const dt = Math.min(0.05, (now - lastTime) / 1000 || 0.016);
    lastTime = now;
    const ease = reduceMotion ? 1 : 1 - Math.exp(-dt * 7); // stejně plynulé na 60 i 120 Hz
    const t = targets(progress);
    let moving = false;
    for (const k of Object.keys(t)) {
      const d = t[k] - cur[k];
      if (Math.abs(d) > 0.0005) { cur[k] += d * ease; moving = true; } else cur[k] = t[k];
    }
    // zvýraznění místností
    for (const room of ROOMS) {
      const want = room === focused ? 1 : room === hovered ? 0.7 : 0;
      if (Math.abs(want - room.glow) > 0.01) { room.glow += (want - room.glow) * Math.min(1, ease * 2); moving = true; } else room.glow = want;
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
    if (Math.abs(cur.rise - shadowRise) > 0.002) { shadowRise = cur.rise; renderer.shadowMap.needsUpdate = true; }
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
  window.__showspaceModel = {
    project(x, z) { const r = canvas.getBoundingClientRect(); const q = new THREE.Vector3(x, 0, z).project(camera); return [r.left + (q.x * 0.5 + 0.5) * r.width, r.top + (-q.y * 0.5 + 0.5) * r.height]; },
    get beat() { return beat; }, get focused() { return focused?.name || null; }, get measured() { return measure.fixed ? measureTag.el.textContent : null; } };
}
