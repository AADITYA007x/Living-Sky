import * as THREE from 'three';
import './style.css';

const canvas = document.querySelector('#sky');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

// Placeholder: random points on a sphere (replaced by real stars in Milestone 1)
const COUNT = 3000;
const RADIUS = 100;
const positions = new Float32Array(COUNT * 3);
for (let i = 0; i < COUNT; i++) {
  const u = Math.random() * 2 - 1;
  const theta = Math.random() * Math.PI * 2;
  const r = Math.sqrt(1 - u * u);
  positions[i * 3] = r * Math.cos(theta) * RADIUS;
  positions[i * 3 + 1] = u * RADIUS;
  positions[i * 3 + 2] = r * Math.sin(theta) * RADIUS;
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const material = new THREE.PointsMaterial({
  color: 0xdfe8ff,
  size: 0.6,
  sizeAttenuation: true,
  transparent: true,
  opacity: 0.85,
});

const stars = new THREE.Points(geometry, material);
scene.add(stars);

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);

renderer.setAnimationLoop(() => {
  stars.rotation.y += 0.0003;
  renderer.render(scene, camera);
});