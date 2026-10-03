import * as THREE from 'three';
import './style.css';
import { createStarField } from './sky/stars.js';
import { SkyControls } from './sky/controls.js';
import { pickStar, projectToScreen } from './sky/picking.js';
import { getStar, describeStar } from './sky/describe.js';
import { StarPanel } from './ui/panel.js';

const canvas = document.querySelector('#sky');
const hint = document.querySelector('.hint');
const status = document.querySelector('.status');
const ring = document.querySelector('.ring');
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

let field = null;
let selected = -1;

const isNarrow = () => window.innerWidth < 720;

function select(index) {
  selected = index;
  const star = getStar(field, index);
  panel.show(describeStar(star));
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

async function loadStars() {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/stars.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    field = createStarField(data, { pixelRatio: pixelRatio() });
    scene.add(field.points);
    hint?.classList.add('is-visible');
  } catch (err) {
    console.error('Could not load star data', err);
    if (status) {
      status.textContent = 'Star data did not load. Run "npm run data:stars", then reload.';
      status.classList.add('is-visible');
    }
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
  field?.update(dt, camera.fov);
  updateRing();
  renderer.render(scene, camera);
});

loadStars();
