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

const canvas = document.querySelector('#sky');
const hint = document.querySelector('.hint');
const status = document.querySelector('.status');
const ring = document.querySelector('.ring');
const labelRoot = document.querySelector('.labels');
const linesToggle = document.querySelector('.toggle-lines');
const panel = new StarPanel(document.querySelector('.panel'));

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
const pixelRatio = () => Math.min(window.devicePixelRatio, 2);
renderer.setPixelRatio(pixelRatio());
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x03050b, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);

// Open facing Orion
const controls = new SkyControls(camera, canvas, { raDeg: 84, decDeg: 2, fov: 70 });
controls.onFirstInteraction = () => hint?.classList.add('is-hidden');

const focus = new FocusState();
let field = null;
let constellations = null;
let labels = null;
let selected = -1;

const isNarrow = () => window.innerWidth < 720;

function select(index) {
  selected = index;
  const star = getStar(field, index);
  panel.show(describeStar(star));
  focus.setFocus(CON_INDEX[star.con] ?? -1);
  ring.classList.remove('is-visible');
  void ring.offsetWidth;
  ring.classList.add('is-visible');
  controls.flyTo(star.ra, star.dec, {
    fov: Math.min(controls.targetFov, 55),
    offsetY: isNarrow() ? 0.22 : 0,
  });
}

function deselect() {
  selected = -1;
  focus.setFocus(-1);
  ring.classList.remove('is-visible');
}

panel.onClose = deselect;

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
  hint?.classList.add('is-visible');

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

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  controls.update(dt);
  focus.update(dt);
  field?.update(dt, camera.fov, focus);
  constellations?.update(focus, camera.fov);
  labels?.update(camera, focus, window.innerWidth, window.innerHeight);
  updateRing();
  renderer.render(scene, camera);
});

loadSky();
