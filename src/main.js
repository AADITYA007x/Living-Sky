import * as THREE from 'three';
import './style.css';
import { createStarField } from './sky/stars.js';
import { SkyControls } from './sky/controls.js';
import { pickStar, projectToScreen } from './sky/picking.js';
import { getStar, describeStar } from './sky/describe.js';
import { createConstellations, ConstellationLabels } from './sky/constellations.js';
import { FocusState } from './sky/focus.js';
import { CON_INDEX } from './data/constellations.js';
import { StarPanel } from './ui/panel.js';
import { Telescope } from './ui/telescope.js';
import { Gallery } from './ui/gallery.js';
import { StarChat } from './ui/chat.js';
import { formatDistance } from './sky/describe.js';
import { CONSTELLATIONS } from './data/constellations.js';
import { imagesForStar } from './data/imagery.js';
import { resolveObservations, ObservationMarkers, ObservationList } from './ui/observations.js';
import { createMilkyWay } from './sky/milkyway.js';
import { AmbientSound } from './audio/ambient.js';
import { Meteors } from './ui/meteors.js';
import { showIntro } from './ui/intro.js';
import { TimeBar } from './ui/timebar.js';
import { EPOCH, currentYear, polesAt, formatEra } from './sky/timetravel.js';
import { resolveIndianSky } from './data/indian.js';
import { IndianSky, indianLore } from './ui/indian.js';

const canvas = document.querySelector('#sky');
const hint = document.querySelector('.hint');
const status = document.querySelector('.status');
const ring = document.querySelector('.ring');
const labelRoot = document.querySelector('.labels');
const linesToggle = document.querySelector('.toggle-lines');
const panel = new StarPanel(document.querySelector('.panel'));
const telescope = new Telescope(document.querySelector('.scope'));
const gallery = new Gallery(document.querySelector('.gallery'));
const chat = new StarChat(document.querySelector('.chat'));

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
const pixelRatio = () => Math.min(window.devicePixelRatio, 2);
renderer.setPixelRatio(pixelRatio());
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x03050b, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);

const milkyWay = createMilkyWay();
scene.add(milkyWay.mesh);

// Music
const sound = new AmbientSound();
const soundToggle = document.querySelector('.sound-toggle');
function setSound(on) {
  soundToggle.setAttribute('aria-pressed', String(on));
  if (on) sound.start();
  else sound.stop();
}
if (!sound.supported) soundToggle.hidden = true;
soundToggle.addEventListener('click', () => setSound(soundToggle.getAttribute('aria-pressed') !== 'true'));

new Meteors(document.querySelector('.meteors'), { onMeteor: () => sound.glint() });

// Open facing Orion
const controls = new SkyControls(camera, canvas, { raDeg: 84, decDeg: 2, fov: 70 });
controls.onFirstInteraction = () => hint?.classList.add('is-hidden');

const focus = new FocusState();
let field = null;
let constellations = null;
let labels = null;
let markers = null;
let indianSky = null;
let indianResolved = null;
const indianToggle = document.querySelector('.indian-toggle');
let selected = -1;
let current = null;

// Time machine
let timeOffset = 0; // years from tonight currently shown
let appliedOffset = null;
const poleMarkers = {
  north: document.querySelector('.pole-north'),
  south: document.querySelector('.pole-south'),
};
const timeButton = document.querySelector('.time-button');
const timebar = new TimeBar(document.querySelector('.timebar'), timeButton, {
  onOpen: () => {
    hint?.classList.add('is-hidden');
    document.body.classList.add('is-time-travelling');
  },
  onClose: () => document.body.classList.remove('is-time-travelling'),
  onMoment: () => sound.glint(),
});

const isNarrow = () => window.innerWidth < 720;

function select(index, { center = null } = {}) {
  selected = index;
  const star = getStar(field, index);
  const info = describeStar(star);
  current = { ra: star.ra, dec: star.dec, name: info.name, key: `${star.id}`, star, info };
  sound.setStar(info.temperature);
  hideHover();
  chat.close();
  panel.show(info, { images: imagesForStar(star), indian: indianLore(indianResolved, index) });
  updateThen(timeOffset);
  focus.setFocus(CON_INDEX[star.con] ?? -1);
  ring.classList.remove('is-visible');
  void ring.offsetWidth;
  ring.classList.add('is-visible');
  const target = center ?? { ra: star.ra, dec: star.dec };
  controls.flyTo(target.ra, target.dec, {
    fov: Math.min(controls.targetFov, 55),
    offsetY: isNarrow() ? 0.22 : timebar.isOpen ? 0.12 : 0,
  });
}

function deselect() {
  selected = -1;
  chat.close();
  focus.setFocus(-1);
  ring.classList.remove('is-visible');
}

panel.onClose = deselect;
panel.onOpenImage = (entry) => gallery.open(entry);
panel.onTalk = () => {
  if (!current) return;
  chat.open(current.key, {
    name: current.info.name,
    lightYear: current.info.lightYear,
    facts: chatFacts(current.star, current.info),
  });
};
chat.onBack = () => document.querySelector('.panel-talk')?.focus({ preventScroll: true });

// The catalog facts the star is allowed to speak from
function chatFacts(star, info) {
  const round = (n, d = 2) => (n == null ? null : Number(n.toFixed(d)));
  return {
    name: info.name,
    designation: info.subtitle[0] && info.subtitle[0] !== CONSTELLATIONS[star.con]?.[0] ? info.subtitle[0] : null,
    constellation: CONSTELLATIONS[star.con]?.[0] ?? null,
    catalog: info.catalog,
    spect: star.spect,
    type: info.type.label,
    magnitude: round(star.mag),
    distance: info.distance ? formatDistance(info.distance) : 'Unknown',
    distanceNote: info.distance?.note ?? null,
    lightYear: info.lightYear,
    size: info.size?.text ?? null,
    sizeNote: info.size?.note ?? null,
    temperature: info.temperature ? `About ${Math.round(info.temperature / 100) * 100} K (estimated from color index B-V ${star.ci})` : null,
    luminosity: star.lum != null ? `${star.lum} times the Sun` : null,
    origin: info.origin,
    fact: info.fact,
    position: `RA ${round(star.ra, 3)}°, Dec ${round(star.dec, 3)}°`,
    viewing: Math.abs(timeOffset) >= 50 ? viewingFact() : null,
    indian: indianLore(indianResolved, selected).map((e) => `${e.title} (${e.deva}): ${e.text}`).join(' ') || null,
  };
}
function viewingFact() {
  const s = field.stateAt(selected);
  const era = formatEra(currentYear() + timeOffset);
  const where = s.distLy != null ? `you would be ${s.distLy.toFixed(1)} light-years away and shine at magnitude ${s.mag.toFixed(1)}` : `your brightness would be magnitude ${s.mag.toFixed(1)}`;
  return `The visitor is using a time machine and viewing the sky of ${era}. Based on your measured motion, in that year ${where}.`;
}

panel.onLookCloser = () => {
  if (current) telescope.open(current);
};

// Treat a short, still press as a tap or click on the sky
const presses = new Map();
canvas.addEventListener('pointerdown', (e) => {
  presses.set(e.pointerId, { x: e.clientX, y: e.clientY, t: e.timeStamp, multi: presses.size > 0 });
});
canvas.addEventListener('pointerup', (e) => {
  const p = presses.get(e.pointerId);
  presses.delete(e.pointerId);
  if (!p || p.multi || !field) return;
  const moved = Math.hypot(e.clientX - p.x, e.clientY - p.y);
  if (moved > 6 || e.timeStamp - p.t > 600) return;

  const index = pickStar(field, camera, e.clientX, e.clientY, window.innerWidth, window.innerHeight, {
    touch: e.pointerType === 'touch',
  });
  if (index >= 0) select(index);
  else panel.close();
});
canvas.addEventListener('pointercancel', (e) => presses.delete(e.pointerId));

function setShowAll(on) {
  focus.showAllTarget = on ? 1 : 0;
  linesToggle.setAttribute('aria-pressed', String(on));
}

linesToggle.addEventListener('click', () => {
  setShowAll(linesToggle.getAttribute('aria-pressed') !== 'true');
});

window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() !== 'c' || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target instanceof HTMLElement && e.target.closest('input, textarea')) return;
  if (!linesToggle.hidden) linesToggle.click();
});

async function loadJson(name) {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${name}`);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return res.json();
}

async function loadSky() {
  let starData;
  try {
    starData = await loadJson('stars.json');
  } catch (err) {
    console.error('Could not load star data', err);
    status.textContent = 'Star data did not load. Run "npm run data:stars", then reload.';
    status.classList.add('is-visible');
    return;
  }
  field = createStarField(starData, { pixelRatio: pixelRatio() });
  field.setYears(currentYear() - EPOCH);
  scene.add(field.points);
  setupObservations();
  setupIndianSky();
  addDataMoments();
  timeButton.hidden = false;

  try {
    const conData = await loadJson('constellations.json');
    constellations = createConstellations(conData, field);
    scene.add(constellations.group);
    labels = new ConstellationLabels(labelRoot, constellations.labels);
    labels.setIndian(indianToggle.getAttribute('aria-pressed') === 'true');
    linesToggle.hidden = false;
  } catch (err) {
    console.warn('Constellation data did not load. Run "npm run data:constellations".', err);
  }
}

// Star names on hover (mouse only)
const hoverLabel = document.querySelector('.hover-label');
let hoverFrame = 0;
let hoverPoint = null;
function hideHover() {
  hoverLabel.classList.remove('is-visible');
  canvas.style.cursor = '';
}
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || e.buttons !== 0) {
    hideHover();
    return;
  }
  hoverPoint = { x: e.clientX, y: e.clientY };
  if (hoverFrame) return;
  hoverFrame = requestAnimationFrame(() => {
    hoverFrame = 0;
    if (!field || !hoverPoint) return;
    const index = pickStar(field, camera, hoverPoint.x, hoverPoint.y, window.innerWidth, window.innerHeight);
    if (index < 0 || index === selected) {
      hideHover();
      return;
    }
    const indianName = indianSky?.enabled ? indianSky.nameOf(index) : null;
    const name = indianName ?? describeStar(getStar(field, index)).name;
    const p = projectToScreen(field, index, camera, window.innerWidth, window.innerHeight);
    if (!p) return hideHover();
    canvas.style.cursor = 'pointer';
    hoverLabel.textContent = /^(HIP|HD|HYG) /.test(name) ? '' : name;
    hoverLabel.classList.toggle('is-visible', Boolean(hoverLabel.textContent));
    hoverLabel.style.transform = `translate(${p.x}px, ${p.y}px)`;
  });
});
canvas.addEventListener('pointerleave', hideHover);
canvas.addEventListener('pointerdown', hideHover);

showIntro(document.querySelector('.intro'), {
  onBegin: (withSound) => {
    if (withSound) setSound(true);
    setTimeout(() => hint?.classList.add('is-visible'), 600);
  },
});

// The Indian sky: nakshatras, Saptarishi and Hindi constellation names
function setupIndianSky() {
  indianResolved = resolveIndianSky(field);
  indianSky = new IndianSky(document.querySelector('.indian-layer'), field, indianResolved);
  scene.add(indianSky.ecliptic);
  indianToggle.hidden = false;
  indianToggle.addEventListener('click', () => {
    const on = indianToggle.getAttribute('aria-pressed') !== 'true';
    indianToggle.setAttribute('aria-pressed', String(on));
    indianSky.setEnabled(on);
    labels?.setIndian(on);
    sound.setIndian(on);
  });
}

// Moments on the time slider that come from the catalog itself
function addDataMoments() {
  const f = field.fieldIndex;
  const i = field.rows.findIndex((r) => r[f.hip] === 71683);
  if (i < 0) return;
  const c = field.closestApproach(i);
  if (!c || Math.abs(EPOCH + c.t - currentYear()) > 100000) return;
  timebar.addMoment({
    year: Math.round((EPOCH + c.t) / 100) * 100,
    label: `Alpha Centauri passes closest, ${c.distLy.toFixed(1)} light-years away`,
  });
}

// Which bright star, if any, sits near the celestial pole at the shown time
function poleStarText(year) {
  if (!field) return '';
  const { north } = polesAt(year);
  let best = -1;
  let bestAngle = Infinity;
  const limit = Math.min(field.count, 600);
  for (let i = 0; i < limit; i++) {
    if (field.stateAt(i).mag > 3.6) continue;
    const d = north.x * field.dirs[i * 3] + north.y * field.dirs[i * 3 + 1] + north.z * field.dirs[i * 3 + 2];
    const a = Math.acos(Math.min(1, d)) * (180 / Math.PI);
    if (a < bestAngle) {
      bestAngle = a;
      best = i;
    }
  }
  if (best < 0 || bestAngle > 6) return 'No bright North Star in this era';
  const name = describeStar(getStar(field, best)).name;
  return `North Star: ${name} · ${bestAngle < 1 ? 'under 1°' : `${bestAngle.toFixed(0)}°`} from the pole`;
}

let lastPoleUpdate = 0;
function applyTime(offset, now) {
  const year = currentYear() + offset;
  if (appliedOffset === null || Math.abs(offset - appliedOffset) >= 0.5) {
    appliedOffset = offset;
    field.setYears(year - EPOCH);
    constellations?.followStars(field.dirs);
    // Official boundaries are a modern convention; fade them away from today
    const away = Math.abs(offset);
    constellations?.setBoundaryFade(1 - Math.min(1, Math.max(0, (away - 300) / 1200)));
    updateThen(offset);
  }
  if (timebar.isOpen && now - lastPoleUpdate > 200) {
    lastPoleUpdate = now;
    timebar.render(offset, poleStarText(year));
  }
}

function updateThen(offset) {
  if (selected < 0) return;
  if (Math.abs(offset) < 50) {
    panel.setThen(null);
    return;
  }
  const s = field.stateAt(selected);
  const era = formatEra(currentYear() + offset);
  const parts = [];
  if (s.distLy != null) parts.push(`${s.distLy < 20 ? s.distLy.toFixed(1) : Math.round(s.distLy).toLocaleString('en-US')} light-years away`);
  parts.push(`magnitude ${s.mag.toFixed(1)}`);
  panel.setThen(`In ${era}: ${parts.join(', ')}.`);
}

function updatePoleMarkers() {
  const show = timebar.isOpen;
  const { north, south } = polesAt(currentYear() + timeOffset);
  for (const [key, dir] of [['north', north], ['south', south]]) {
    const node = poleMarkers[key];
    if (!node) continue;
    const v = dir.clone().multiplyScalar(99);
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    if (!show || v.dot(forward) <= 0) {
      node.classList.remove('is-visible');
      continue;
    }
    v.project(camera);
    node.classList.add('is-visible');
    node.style.transform = `translate(${((v.x * 0.5 + 0.5) * window.innerWidth).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * window.innerHeight).toFixed(1)}px)`;
  }
}

function setupObservations() {
  const observations = resolveObservations(field);
  if (!observations.length) return;
  const goTo = (obs) => {
    // Centre the view on the object itself; the panel shows its nearest bright star
    select(obs.index, { center: { ra: obs.ra, dec: obs.dec } });
    setTimeout(() => {
      document.querySelector('.panel-images')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 700);
  };
  markers = new ObservationMarkers(document.querySelector('.markers'), observations, goTo, field);
  const button = document.querySelector('.obs-button');
  new ObservationList(button, document.querySelector('.obs-list'), observations, {
    onSelect: goTo,
    onToggleMarkers: (on) => markers.setVisible(on),
  });
  button.hidden = false;
}

function updateRing() {
  if (selected < 0) return;
  const p = projectToScreen(field, selected, camera, window.innerWidth, window.innerHeight);
  if (!p) {
    ring.style.opacity = '0';
    return;
  }
  ring.style.opacity = '';
  ring.style.transform = `translate(${p.x}px, ${p.y}px)`;
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(pixelRatio());
  renderer.setSize(window.innerWidth, window.innerHeight);
  field?.setPixelRatio(pixelRatio());
}
window.addEventListener('resize', resize);

const timer = new THREE.Timer();
timer.connect(document);
renderer.setAnimationLoop((time) => {
  timer.update(time);
  const dt = Math.min(timer.getDelta(), 0.1);
  controls.update(dt);
  focus.update(dt);
  timeOffset = timebar.update(dt);
  document.body.classList.toggle('is-dragging-sky', controls.pointers.size > 0);
  if (field) applyTime(timeOffset, time);
  field?.update(dt, camera.fov, focus);
  milkyWay.update(dt, focus);
  constellations?.update(focus, camera.fov);
  labels?.update(camera, focus, window.innerWidth, window.innerHeight);
  markers?.update(camera, window.innerWidth, window.innerHeight, focus.dim);
  indianSky?.update(camera, window.innerWidth, window.innerHeight, dt, focus.dim);
  updateRing();
  updatePoleMarkers();
  renderer.render(scene, camera);
});

loadSky();
