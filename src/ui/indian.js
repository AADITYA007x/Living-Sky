import * as THREE from 'three';
import { raDecToVector } from '../sky/astro.js';
import { SKY_RADIUS } from '../sky/stars.js';

// The Indian sky: nakshatra names along the Moon's path, the Saptarishi in the
// Big Dipper, and a faint line for the ecliptic, near which the Moon travels.

function eclipticLine() {
  const pole = new THREE.Vector3(...raDecToVector(270, 66.560708, 1));
  const a = new THREE.Vector3(1, 0, 0).sub(pole.clone().multiplyScalar(pole.x)).normalize();
  const b = new THREE.Vector3().crossVectors(pole, a);
  const pts = [];
  for (let i = 0; i <= 360; i++) {
    const t = (i / 360) * Math.PI * 2;
    pts.push(a.clone().multiplyScalar(Math.cos(t)).add(b.clone().multiplyScalar(Math.sin(t))).multiplyScalar(SKY_RADIUS * 0.997));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineDashedMaterial({
    color: 0xc8b38a,
    dashSize: 0.5,
    gapSize: 1.1,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const line = new THREE.Line(geo, mat);
  line.computeLineDistances();
  line.frustumCulled = false;
  return line;
}

export class IndianSky {
  constructor(root, field, resolved) {
    this.root = root;
    this.field = field;
    this.resolved = resolved;
    this.enabled = false;
    this.amount = 0;
    this.v = new THREE.Vector3();
    this.forward = new THREE.Vector3();
    this.ecliptic = eclipticLine();

    this.groups = resolved.nakshatras
      .filter((nk) => nk.indices.length)
      .map((nk) => {
        const label = document.createElement('span');
        label.className = 'nk-label';
        label.innerHTML = '<span class="nk-deva"></span><span class="nk-name"></span>';
        label.querySelector('.nk-deva').textContent = nk.deva;
        label.querySelector('.nk-name').textContent = nk.name;
        root.append(label);
        const rings = nk.indices.map(() => {
          const ring = document.createElement('span');
          ring.className = 'nk-ring';
          root.append(ring);
          return ring;
        });
        return { nk, label, rings, center: new THREE.Vector3() };
      });

    this.names = [...resolved.sages, ...resolved.others]
      .filter((s) => s.index >= 0)
      .map((s) => {
        const label = document.createElement('span');
        label.className = `sage-label${resolved.sages.includes(s) ? ' is-rishi' : ''}`;
        label.innerHTML = '<span class="nk-deva"></span><span class="nk-name"></span>';
        label.querySelector('.nk-deva').textContent = s.deva;
        label.querySelector('.nk-name').textContent = s.name;
        root.append(label);
        return { s, label };
      });
  }

  setEnabled(on) {
    this.enabled = on;
    this.root.classList.toggle('is-on', on);
  }

  // Name of a star in the Indian sky, for hover labels
  nameOf(index) {
    const list = this.resolved.byStar.get(index);
    if (!list?.length) return null;
    const own = list.find((e) => e.kind !== 'nakshatra') ?? list[0];
    return own.name;
  }

  place(node, pos, camera, w, h, dy = 0) {
    if (pos.dot(this.forward) <= 0) {
      node.classList.add('is-off');
      return;
    }
    this.v.copy(pos).project(camera);
    const x = (this.v.x * 0.5 + 0.5) * w;
    const y = (-this.v.y * 0.5 + 0.5) * h + dy;
    const off = x < -80 || y < -40 || x > w + 80 || y > h + 40;
    node.classList.toggle('is-off', off);
    if (!off) node.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  }

  update(camera, w, h, dt, dim = 0) {
    const target = this.enabled ? 1 : 0;
    this.amount += (target - this.amount) * (1 - Math.exp(-dt * 3));
    this.ecliptic.material.opacity = this.amount * 0.35 * (1 - 0.5 * dim);
    this.root.style.setProperty('--indian-dim', String(1 - dim * 0.55));
    if (this.amount < 0.01) return;

    camera.getWorldDirection(this.forward);
    const pos = this.field.positions;
    const star = new THREE.Vector3();

    for (const g of this.groups) {
      g.center.set(0, 0, 0);
      g.nk.indices.forEach((i, k) => {
        star.fromArray(pos, i * 3);
        g.center.add(star);
        this.place(g.rings[k], star, camera, w, h);
      });
      g.center.normalize().multiplyScalar(SKY_RADIUS);
      this.place(g.label, g.center, camera, w, h, g.nk.indices.length === 1 ? 14 : 0);
    }
    for (const n of this.names) {
      star.fromArray(pos, n.s.index * 3);
      this.place(n.label, star, camera, w, h, 12);
    }
  }
}

const ORDINAL = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

// Short lore entries for the star panel and the chat
export function indianLore(resolved, index) {
  const list = resolved?.byStar.get(index) ?? [];
  return list.map((e) => {
    if (e.kind === 'nakshatra') {
      return {
        title: e.name,
        deva: e.deva,
        text: `The ${ORDINAL(e.n)} of the 27 nakshatras, the “lunar mansions” the Moon passes through each month. The name means ${e.meaning}, and its deity is ${e.deity}.`,
        note: e.note ?? null,
        source: true,
      };
    }
    if (e.kind === 'rishi') {
      const extra = e.name === 'Vasishtha' ? ' Beside him shines faint Arundhati, his wife.' : '';
      return {
        title: e.name,
        deva: e.deva,
        text: `One of the Saptarishi, the seven sages who form the Big Dipper. This star is the sage ${e.name}.${extra}`,
        note: 'Lists of the seven sages differ between texts; this is the usual star-by-star naming.',
      };
    }
    return { title: e.name, deva: e.deva, text: e.text };
  });
}
