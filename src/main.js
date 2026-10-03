import * as THREE from 'three';
import './style.css';
import { createStarField } from './sky/stars.js';
import { SkyControls } from './sky/controls.js';

const canvas = document.querySelector('#sky');
const hint = document.querySelector('.hint');
const status = document.querySelector('.status');

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
  renderer.render(scene, camera);
});

loadStars();
