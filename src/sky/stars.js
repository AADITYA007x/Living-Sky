import * as THREE from 'three';
import { raDecToVector, bvToDisplayRGB } from './astro.js';
import { focusGLSL, focusUniforms } from './focus.js';
import { CON_INDEX } from '../data/constellations.js';

export const SKY_RADIUS = 100;

const LY_PER_PC = 3.261563777;
const MAS_TO_RAD = Math.PI / (180 * 3600 * 1000);

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
  const dirs = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const mags = new Float32Array(count);
  const baseMags = new Float32Array(count);
  const seeds = new Float32Array(count);
  const cons = new Float32Array(count);
  // Motion model: position p(t) = p0 + v * t, in parsecs for stars with a
  // known distance, or on the unit sphere (angular motion only) otherwise.
  const p0 = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);
  const baseDist = new Float32Array(count);
  const motion3d = new Uint8Array(count);
  const has = (k) => k in f;

  for (let i = 0; i < count; i++) {
    const s = rows[i];
    const [ux, uy, uz] = raDecToVector(s[f.ra], s[f.dec], 1);
    dirs.set([ux, uy, uz], i * 3);
    positions.set([ux * SKY_RADIUS, uy * SKY_RADIUS, uz * SKY_RADIUS], i * 3);

    const [r, g, b] = bvToDisplayRGB(s[f.ci]);
    colors.set([r, g, b], i * 3);

    mags[i] = baseMags[i] = s[f.mag];
    seeds[i] = Math.random();
    cons[i] = CON_INDEX[s[f.con]] ?? -10;

    const distPc = s[f.distLy] != null ? s[f.distLy] / LY_PER_PC : null;
    const vx = has('vx') ? s[f.vx] : null;
    if (distPc && vx != null) {
      // HYG equatorial x, y, z -> this scene's frame (x, z, -y), micro-parsecs/yr -> parsecs/yr
      baseDist[i] = distPc;
      motion3d[i] = 1;
      p0.set([ux * distPc, uy * distPc, uz * distPc], i * 3);
      vel.set([vx * 1e-6, s[f.vz] * 1e-6, -s[f.vy] * 1e-6], i * 3);
    } else {
      baseDist[i] = 1;
      p0.set([ux, uy, uz], i * 3);
      const pmra = has('pmra') ? (s[f.pmra] ?? 0) * MAS_TO_RAD : 0;
      const pmdec = has('pmdec') ? (s[f.pmdec] ?? 0) * MAS_TO_RAD : 0;
      const ra = s[f.ra] * (Math.PI / 180);
      const dec = s[f.dec] * (Math.PI / 180);
      // pmra already includes cos(dec), so this stays finite near the poles
      vel.set([
        -pmra * Math.sin(ra) - pmdec * Math.sin(dec) * Math.cos(ra),
        pmdec * Math.cos(dec),
        -pmra * Math.cos(ra) + pmdec * Math.sin(dec) * Math.sin(ra),
      ], i * 3);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  const magAttr = new THREE.BufferAttribute(mags, 1);
  geometry.setAttribute('aMag', magAttr);
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
  let years = 0;
  const hasDistance = (i) => motion3d[i] === 1;

  return {
    points,
    count,
    rows,
    fieldIndex: f,
    positions,
    mags,
    dirs,
    // Move every star to where it will be `t` years after the catalog epoch (J2000)
    setYears(t) {
      if (Math.abs(t - years) < 0.5) return;
      years = t;
      for (let i = 0; i < count; i++) {
        const k = i * 3;
        const x = p0[k] + vel[k] * t;
        const y = p0[k + 1] + vel[k + 1] * t;
        const z = p0[k + 2] + vel[k + 2] * t;
        const len = Math.hypot(x, y, z) || 1;
        dirs[k] = x / len;
        dirs[k + 1] = y / len;
        dirs[k + 2] = z / len;
        positions[k] = dirs[k] * SKY_RADIUS;
        positions[k + 1] = dirs[k + 1] * SKY_RADIUS;
        positions[k + 2] = dirs[k + 2] * SKY_RADIUS;
        // Brightness follows distance: 5 magnitudes per factor of 10
        mags[i] = hasDistance(i) ? baseMags[i] + 5 * Math.log10(len / baseDist[i]) : baseMags[i];
      }
      geometry.attributes.position.needsUpdate = true;
      magAttr.needsUpdate = true;
    },
    // Distance and brightness of one star at the current time
    stateAt(i) {
      if (!hasDistance(i)) return { distLy: null, mag: mags[i] };
      const k = i * 3;
      const len = Math.hypot(p0[k] + vel[k] * years, p0[k + 1] + vel[k + 1] * years, p0[k + 2] + vel[k + 2] * years);
      return { distLy: len * LY_PER_PC, mag: mags[i] };
    },
    // Year offset (from J2000) and distance of a star's closest approach to the Sun
    closestApproach(i) {
      if (!hasDistance(i)) return null;
      const k = i * 3;
      const v2 = vel[k] ** 2 + vel[k + 1] ** 2 + vel[k + 2] ** 2;
      if (!v2) return null;
      const t = -(p0[k] * vel[k] + p0[k + 1] * vel[k + 1] + p0[k + 2] * vel[k + 2]) / v2;
      const d = Math.hypot(p0[k] + vel[k] * t, p0[k + 1] + vel[k + 1] * t, p0[k + 2] + vel[k + 2] * t);
      return { t, distLy: d * LY_PER_PC, mag: baseMags[i] + 5 * Math.log10(d / baseDist[i]) };
    },
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
