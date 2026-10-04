import * as THREE from 'three';
import { raDecToVector, DEG } from './astro.js';
import { SKY_RADIUS } from './stars.js';
import { CONSTELLATIONS, CON_INDEX } from '../data/constellations.js';
import { focusGLSL, focusUniforms } from './focus.js';

const R = SKY_RADIUS * 0.999;

function vec(ra, dec) {
  return new THREE.Vector3(...raDecToVector(ra, dec, 1));
}

// Find the catalog star at each stick-figure vertex, so lines can follow the
// stars as they move in the time machine.
function makeStarMatcher(field) {
  const cache = new Map();
  const dirs = field?.dirs;
  const count = field?.count ?? 0;
  const limit = Math.cos(0.3 * DEG);
  return (ra, dec, v) => {
    if (!dirs) return -1;
    const key = `${ra},${dec}`;
    if (cache.has(key)) return cache.get(key);
    let best = -1;
    let bestDot = limit;
    for (let i = 0; i < count; i++) {
      const d = v.x * dirs[i * 3] + v.y * dirs[i * 3 + 1] + v.z * dirs[i * 3 + 2];
      if (d > bestDot) {
        bestDot = d;
        best = i;
      }
    }
    cache.set(key, best);
    return best;
  };
}

function buildLines(data, field) {
  const match = makeStarMatcher(field);
  const pos = [];
  const con = [];
  const end = [];
  const starA = [];
  const starB = [];
  const tParam = [];
  const fixedA = [];
  const fixedB = [];

  for (const [key, c] of Object.entries(data)) {
    const ci = CON_INDEX[key];
    if (ci === undefined) continue;
    for (const line of c.lines) {
      for (let i = 1; i < line.length; i++) {
        const a = vec(...line[i - 1]);
        const b = vec(...line[i]);
        const angle = a.angleTo(b);
        if (angle < 1e-6) continue;
        const ia = match(line[i - 1][0], line[i - 1][1], a);
        const ib = match(line[i][0], line[i][1], b);
        const n = Math.max(10, Math.ceil(angle / (0.4 * DEG)));
        const push = (t) => {
          const p = slerp(a, b, angle, t).multiplyScalar(R);
          pos.push(p.x, p.y, p.z);
          con.push(ci);
          end.push((Math.min(t, 1 - t) * angle) / DEG);
          starA.push(ia);
          starB.push(ib);
          tParam.push(t);
          fixedA.push(a.x, a.y, a.z);
          fixedB.push(b.x, b.y, b.z);
        };
        for (let s = 0; s < n; s++) {
          push(s / n);
          push((s + 1) / n);
        }
      }
    }
  }
  return {
    pos: new Float32Array(pos),
    con,
    end,
    starA: Int32Array.from(starA),
    starB: Int32Array.from(starB),
    tParam: Float32Array.from(tParam),
    fixedA: Float32Array.from(fixedA),
    fixedB: Float32Array.from(fixedB),
  };
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
  uniform float uFade;
  varying float vAlpha;
  varying float vDist;
  ${focusGLSL}
  void main() {
    vAlpha = focusAmount(aCon) * 0.42 * uFade;
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

export function createConstellations(json, field = null) {
  const data = json.constellations;

  const l = buildLines(data, field);
  const lineGeo = new THREE.BufferGeometry();
  const linePos = new THREE.BufferAttribute(l.pos, 3);
  lineGeo.setAttribute('position', linePos);
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
      uFade: { value: 1 },
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
      labels.push({ ci, name: CONSTELLATIONS[key][0], hi: c.hi ?? null, pos: new THREE.Vector3(...raDecToVector(ra, dec, R)) });
    }
  }

  return {
    group,
    labels,
    // Re-draw the stick figures from the stars' current positions
    followStars(dirs) {
      const { starA, starB, tParam, fixedA, fixedB } = l;
      const out = l.pos;
      for (let v = 0; v < tParam.length; v++) {
        const ia = starA[v];
        const ib = starB[v];
        const k = v * 3;
        const ax = ia >= 0 ? dirs[ia * 3] : fixedA[k];
        const ay = ia >= 0 ? dirs[ia * 3 + 1] : fixedA[k + 1];
        const az = ia >= 0 ? dirs[ia * 3 + 2] : fixedA[k + 2];
        const bx = ib >= 0 ? dirs[ib * 3] : fixedB[k];
        const by = ib >= 0 ? dirs[ib * 3 + 1] : fixedB[k + 1];
        const bz = ib >= 0 ? dirs[ib * 3 + 2] : fixedB[k + 2];
        const t = tParam[v];
        const x = ax + (bx - ax) * t;
        const y = ay + (by - ay) * t;
        const z = az + (bz - az) * t;
        const len = Math.hypot(x, y, z) || 1;
        out[k] = (x / len) * R;
        out[k + 1] = (y / len) * R;
        out[k + 2] = (z / len) * R;
      }
      linePos.needsUpdate = true;
    },
    // Official boundaries are a modern convention, so they fade out far from today
    setBoundaryFade(v) {
      boundMat.uniforms.uFade.value = v;
    },
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

  // Show Hindi constellation names in the Indian sky
  setIndian(on) {
    for (const item of this.items) {
      const deva = on && item.hi;
      item.node.textContent = deva ? item.hi : item.name;
      item.node.classList.toggle('is-deva', Boolean(deva));
    }
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
