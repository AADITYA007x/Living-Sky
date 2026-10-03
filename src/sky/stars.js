import * as THREE from 'three';
import { raDecToVector, bvToDisplayRGB } from './astro.js';

export const SKY_RADIUS = 100;

const vertexShader = /* glsl */ `
  attribute float aMag;
  attribute vec3 aColor;
  attribute float aSeed;

  uniform float uPixelRatio;
  uniform float uZoom;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uTwinkle;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Brightest stars (mag ~ -1.5) -> 1, naked-eye limit (6.5) -> 0
    float t = clamp((aMag + 1.5) / 8.0, 0.0, 1.0);
    float size = mix(15.0, 3.2, pow(t, 0.55));
    float alpha = mix(1.0, 0.32, t);

    float twinkle = 1.0 + uTwinkle * sin(uTime * (1.3 + aSeed * 2.1) + aSeed * 40.0) * 0.06;

    vColor = aColor;
    vAlpha = alpha * twinkle * uOpacity;
    gl_PointSize = size * uZoom * uPixelRatio;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d2 = dot(p, p) * 4.0;
    if (d2 > 1.0) discard;

    float core = exp(-d2 * 14.0);
    float halo = exp(-d2 * 3.5) * 0.22;
    float a = (core + halo) * vAlpha;

    vec3 color = mix(vColor, vec3(1.0), core * 0.55);
    gl_FragColor = vec4(color, a);
  }
`;

export function createStarField(data, { pixelRatio = 1 } = {}) {
  const f = Object.fromEntries(data.meta.fields.map((name, i) => [name, i]));
  const rows = data.stars;
  const count = rows.length;

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const mags = new Float32Array(count);
  const seeds = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const s = rows[i];
    const [x, y, z] = raDecToVector(s[f.ra], s[f.dec], SKY_RADIUS);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    const [r, g, b] = bvToDisplayRGB(s[f.ci]);
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;

    mags[i] = s[f.mag];
    seeds[i] = Math.random();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aMag', new THREE.BufferAttribute(mags, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uPixelRatio: { value: pixelRatio },
      uZoom: { value: 1 },
      uOpacity: { value: 0 },
      uTime: { value: 0 },
      uTwinkle: { value: reducedMotion ? 0 : 1 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  let elapsed = 0;

  return {
    points,
    count,
    setPixelRatio(pr) {
      material.uniforms.uPixelRatio.value = pr;
    },
    update(dt, fov) {
      elapsed += dt;
      const u = material.uniforms;
      u.uTime.value = elapsed;
      u.uZoom.value = Math.min(Math.max(Math.pow(60 / fov, 0.35), 0.8), 2.6);
      u.uOpacity.value = reducedMotion ? 1 : Math.min(1, u.uOpacity.value + dt / 2.5);
    },
  };
}
