import * as THREE from 'three';
import { raDecToVector, bvToDisplayRGB } from './astro.js';
import { focusGLSL, focusUniforms } from './focus.js';
import { CON_INDEX } from '../data/constellations.js';

export const SKY_RADIUS = 100;

const vertexShader = /* glsl */ `
  attribute float aMag;
  attribute vec3 aColor;
  attribute float aSeed;
  attribute float aCon;

  uniform float uPixelRatio;
  uniform float uZoom;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uTwinkle;
  uniform float uDim;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vSize;
  varying float vCore;
  varying float vHalo;
  ${focusGLSL}

  void main() {
    // Brightest stars (mag ~ -1.5) -> 0, naked-eye limit (6.5) -> 1
    float t = clamp((aMag + 1.5) / 8.0, 0.0, 1.0);
    float scale = uZoom * uPixelRatio;

    float size = mix(34.0, 4.0, pow(t, 0.45)) * scale;
    float core = mix(3.0, 0.75, pow(t, 0.75)) * scale;
    float halo = mix(0.30, 0.0, pow(t, 0.5));
    float alpha = mix(1.0, 0.2, pow(t, 0.85));

    float twinkle = 1.0 + uTwinkle * sin(uTime * (1.3 + aSeed * 2.1) + aSeed * 40.0) * 0.06;

    // Stars outside the focused constellation fade back
    float inFocus = focusAmount(aCon);
    float dimmed = mix(1.0, 0.28, uDim);

    vColor = aColor;
    vAlpha = alpha * twinkle * uOpacity * mix(dimmed, 1.0, inFocus);
    vSize = size;
    vCore = core;
    vHalo = halo;
    gl_PointSize = size;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSize;
  varying float vCore;
  varying float vHalo;

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p) * 2.0;
    if (d > 1.0) discard;

    float rPx = d * vSize * 0.5;
    float core = exp(-pow(rPx / vCore, 2.0));
    float halo = exp(-pow(d / 0.38, 2.0)) * vHalo;
    float edge = 1.0 - smoothstep(0.75, 1.0, d);

    float a = (core + halo) * vAlpha * edge;
    vec3 color = mix(vColor, vec3(1.0), core * 0.3);
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
  const cons = new Float32Array(count);

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
    cons[i] = CON_INDEX[s[f.con]] ?? -10;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aMag', new THREE.BufferAttribute(mags, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute('aCon', new THREE.BufferAttribute(cons, 1));

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      ...focusUniforms(),
      uDim: { value: 0 },
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
    rows,
    fieldIndex: f,
    positions,
    mags,
    conIndexOf(index) {
      return cons[index];
    },
    setPixelRatio(pr) {
      material.uniforms.uPixelRatio.value = pr;
    },
    update(dt, fov, focus) {
      elapsed += dt;
      const u = material.uniforms;
      if (focus) focus.apply(u);
      u.uTime.value = elapsed;
      u.uZoom.value = Math.min(Math.max(Math.pow(60 / fov, 0.35), 0.8), 2.6);
      u.uOpacity.value = reducedMotion ? 1 : Math.min(1, u.uOpacity.value + dt / 2.5);
    },
  };
}
