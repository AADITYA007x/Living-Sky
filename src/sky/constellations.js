import * as THREE from 'three';
import { raDecToVector, DEG } from './astro.js';
import { SKY_RADIUS } from './stars.js';
import { CONSTELLATIONS, CON_INDEX } from '../data/constellations.js';
import { focusGLSL, focusUniforms } from './focus.js';

const R = SKY_RADIUS * 0.999;

function vec(ra, dec) {
  return new THREE.Vector3(...raDecToVector(ra, dec, 1));
}

function buildLines(data) {
  const pos = [];
  const con = [];
  const end = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();

  for (const [key, c] of Object.entries(data)) {
    const ci = CON_INDEX[key];
    if (ci === undefined) continue;
    for (const line of c.lines) {
      for (let i = 1; i < line.length; i++) {
        a.copy(vec(...line[i - 1]));
        b.copy(vec(...line[i]));
        const angle = a.angleTo(b);
        if (angle < 1e-6) continue;
        const n = Math.max(10, Math.ceil(angle / (0.4 * DEG)));
        let prev = null;
        for (let s = 0; s <= n; s++) {
          const t = s / n;
          const p = slerp(a, b, angle, t).multiplyScalar(R);
          const e = Math.min(t, 1 - t) * angle / DEG;
          if (prev) {
            pos.push(prev.p.x, prev.p.y, prev.p.z, p.x, p.y, p.z);
            con.push(ci, ci);
            end.push(prev.e, e);
          }
          prev = { p, e };
        }
      }
    }
  }
  return { pos, con, end };
}

function buildBounds(data) {
  const pos = [];
  const con = [];
  const dist = [];

  for (const [key, c] of Object.entries(data)) {
    const ci = CON_INDEX[key];
    if (ci === undefined) continue;
    for (const ring of c.bounds) {
      const pts = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
        ? ring
        : [...ring, ring[0]];
      let travelled = 0;
      let prev = null;
      for (let i = 1; i < pts.length; i++) {
        const [ra0, dec0] = pts[i - 1];
        const [ra1, dec1] = pts[i];
        let dRa = ra1 - ra0;
        if (dRa > 180) dRa -= 360;
        if (dRa < -180) dRa += 360;
        const dDec = dec1 - dec0;
        // IAU boundaries run along lines of constant RA or Dec, so interpolate in RA/Dec
        const n = Math.max(1, Math.ceil(Math.max(Math.abs(dRa), Math.abs(dDec)) / 0.5));
        for (let s = i === 1 ? 0 : 1; s <= n; s++) {
          const t = s / n;
          const p = vec(ra0 + dRa * t, dec0 + dDec * t);
          if (prev) {
            const step = prev.v.angleTo(p) / DEG;
            pos.push(prev.v.x * R, prev.v.y * R, prev.v.z * R, p.x * R, p.y * R, p.z * R);
            con.push(ci, ci);
            dist.push(travelled, travelled + step);
            travelled += step;
          }
          prev = { v: p };
        }
      }
    }
  }
  return { pos, con, dist };
}

function slerp(a, b, angle, t) {
  const s = Math.sin(angle);
  const wa = Math.sin((1 - t) * angle) / s;
  const wb = Math.sin(t * angle) / s;
  return new THREE.Vector3(a.x * wa + b.x * wb, a.y * wa + b.y * wb, a.z * wa + b.z * wb);
}

const linesVertex = /* glsl */ `
  attribute float aCon;
  attribute float aEnd;
  uniform float uShowAll;
  varying float vAlpha;
  varying float vEnd;
  ${focusGLSL}
  void main() {
    float f = focusAmount(aCon);
    float others = mix(0.2, 0.06, max(uFocusAmt, uPrevAmt)) * uShowAll;
    vAlpha = mix(others, 0.62, f);
    vEnd = aEnd;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const linesFragment = /* glsl */ `
  uniform float uGap;
  uniform vec3 uColor;
  varying float vAlpha;
  varying float vEnd;
  void main() {
    float a = vAlpha * smoothstep(uGap * 0.65, uGap, vEnd);
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

const boundsVertex = /* glsl */ `
  attribute float aCon;
  attribute float aDist;
  varying float vAlpha;
  varying float vDist;
  ${focusGLSL}
  void main() {
    vAlpha = focusAmount(aCon) * 0.42;
    vDist = aDist;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const boundsFragment = /* glsl */ `
  uniform float uDash;
  uniform vec3 uColor;
  varying float vAlpha;
  varying float vDist;
  void main() {
    float on = step(fract(vDist / uDash), 0.5);
    float a = vAlpha * on;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

export function createConstellations(json) {
  const data = json.constellations;

  const l = buildLines(data);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(l.pos, 3));
  lineGeo.setAttribute('aCon', new THREE.Float32BufferAttribute(l.con, 1));
  lineGeo.setAttribute('aEnd', new THREE.Float32BufferAttribute(l.end, 1));
  const lineMat = new THREE.ShaderMaterial({
    vertexShader: linesVertex,
    fragmentShader: linesFragment,
    uniforms: {
      ...focusUniforms(),
      uShowAll: { value: 0 },
      uGap: { value: 1 },
      uColor: { value: new THREE.Color(0.74, 0.79, 0.92) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  lines.frustumCulled = false;

  const b = buildBounds(data);
  const boundGeo = new THREE.BufferGeometry();
  boundGeo.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
  boundGeo.setAttribute('aCon', new THREE.Float32BufferAttribute(b.con, 1));
  boundGeo.setAttribute('aDist', new THREE.Float32BufferAttribute(b.dist, 1));
  const boundMat = new THREE.ShaderMaterial({
    vertexShader: boundsVertex,
    fragmentShader: boundsFragment,
    uniforms: {
      ...focusUniforms(),
      uDash: { value: 1 },
      uColor: { value: new THREE.Color(0.78, 0.7, 0.54) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const bounds = new THREE.LineSegments(boundGeo, boundMat);
  bounds.frustumCulled = false;

  const group = new THREE.Group();
  group.add(bounds, lines);
  group.renderOrder = -1;

  const labels = [];
  for (const [key, c] of Object.entries(data)) {
    const ci = CON_INDEX[key];
    if (ci === undefined) continue;
    for (const [ra, dec] of c.labels) {
      labels.push({ ci, name: CONSTELLATIONS[key][0], pos: new THREE.Vector3(...raDecToVector(ra, dec, R)) });
    }
  }

  return {
    group,
    labels,
    update(focus, fov) {
      focus.apply(lineMat.uniforms);
      focus.apply(boundMat.uniforms);
      lineMat.uniforms.uGap.value = fov * 0.016;
      boundMat.uniforms.uDash.value = fov * 0.022;
    },
  };
}

// Constellation name labels, drawn as HTML on top of the sky
export class ConstellationLabels {
  constructor(root, labels) {
    this.items = labels.map((l) => {
      const node = document.createElement('span');
      node.className = 'con-label';
      node.textContent = l.name;
      root.append(node);
      return { ...l, node };
    });
    this.v = new THREE.Vector3();
    this.forward = new THREE.Vector3();
  }

  update(camera, focus, width, height) {
    camera.getWorldDirection(this.forward);
    const others = focus.showAll * (1 - 0.7 * Math.max(focus.focusAmt, focus.prevAmt)) * 0.5;
    for (const item of this.items) {
      let f = 0;
      if (item.ci === focus.focus) f = focus.focusAmt;
      else if (item.ci === focus.prev) f = focus.prevAmt;
      const alpha = Math.max(others, f * 0.85);
      if (alpha < 0.01 || item.pos.dot(this.forward) <= 0) {
        if (item.node.style.opacity !== '0') item.node.style.opacity = '0';
        continue;
      }
      this.v.copy(item.pos).project(camera);
      const x = (this.v.x * 0.5 + 0.5) * width;
      const y = (-this.v.y * 0.5 + 0.5) * height;
      item.node.style.opacity = alpha.toFixed(3);
      item.node.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
    }
  }
}
