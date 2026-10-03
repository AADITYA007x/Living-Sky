import * as THREE from 'three';

const v = new THREE.Vector3();
const forward = new THREE.Vector3();

// Returns the index of the star closest to a screen point, favoring brighter
// stars when several are near. Returns -1 when nothing is close enough.
export function pickStar(field, camera, x, y, width, height, { touch = false } = {}) {
  const { positions, mags, count } = field;
  const reach = touch ? 26 : 16;
  camera.getWorldDirection(forward);

  let best = -1;
  let bestScore = Infinity;

  for (let i = 0; i < count; i++) {
    v.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
    if (v.dot(forward) <= 0) continue;
    v.project(camera);
    const sx = (v.x * 0.5 + 0.5) * width;
    const sy = (-v.y * 0.5 + 0.5) * height;
    const d = Math.hypot(sx - x, sy - y);
    if (d > reach) continue;
    const score = d - (6.5 - mags[i]) * 2.2;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

export function projectToScreen(field, index, camera, width, height) {
  const { positions } = field;
  v.set(positions[index * 3], positions[index * 3 + 1], positions[index * 3 + 2]);
  camera.getWorldDirection(forward);
  if (v.dot(forward) <= 0) return null;
  v.project(camera);
  return { x: (v.x * 0.5 + 0.5) * width, y: (-v.y * 0.5 + 0.5) * height };
}
