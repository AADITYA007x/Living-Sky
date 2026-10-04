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
let selected = -1;
let current = null;

const isNarrow = () => window.innerWidth < 720;

function select(index, { center = null } = {}) {
  selected = index;
  const star = getStar(field, index);
  const info = describeStar(star);
  current = { ra: star.ra, dec: star.dec, name: info.name, key: `${star.id}`, star, info };
  sound.setStar(info.temperature);
  hideHover();
  chat.close();
  panel.show(info, { images: imagesForStar(star) });
  focus.setFocus(CON_INDEX[star.con] ?? -1);
  ring.classList.remove('is-visible');
  void ring.offsetWidth;
  ring.classList.add('is-visible');
  const target = center ?? { ra: star.ra, dec: star.dec };
  controls.flyTo(target.ra, target.dec, {
    fov: Math.min(controls.targetFov, 55),
    offsetY: isNarrow() ? 0.22 : 0,
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
  };
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
  scene.add(field.points);
  setupObservations();

  try {
    const conData = await loadJson('constellations.json');
    constellations = createConstellations(conData);
    scene.add(constellations.group);
    labels = new ConstellationLabels(labelRoot, constellations.labels);
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
    const name = describeStar(getStar(field, index)).name;
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
  markers = new ObservationMarkers(document.querySelector('.markers'), observations, goTo);
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
  field?.update(dt, camera.fov, focus);
  milkyWay.update(dt, focus);
  constellations?.update(focus, camera.fov);
  labels?.update(camera, focus, window.innerWidth, window.innerHeight);
  markers?.update(camera, window.innerWidth, window.innerHeight, focus.dim);
  updateRing();
  renderer.render(scene, camera);
});

loadSky();
