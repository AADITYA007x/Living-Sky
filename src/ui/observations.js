import * as THREE from 'three';
import { raDecToVector } from '../sky/astro.js';
import { SKY_RADIUS } from '../sky/stars.js';
import { CURATED_IMAGES, separation } from '../data/imagery.js';
import { thumbnailUrl } from './gallery.js';

// Works out which catalog star each famous observation belongs to.
export function resolveObservations(field) {
  const f = field.fieldIndex;
  const byHip = new Map();
  field.rows.forEach((row, i) => {
    if (row[f.hip] != null) byHip.set(row[f.hip], i);
  });

  return CURATED_IMAGES.map((entry) => {
    let index = -1;
    if (entry.hips) {
      index = entry.hips.map((h) => byHip.get(h)).find((i) => i !== undefined) ?? -1;
    } else {
      // Anchor on the brightest star close to the object, so it is easy to spot
      let bestMag = Infinity;
      field.rows.forEach((row, i) => {
        const d = separation(row[f.ra], row[f.dec], entry.ra, entry.dec);
        if (d <= entry.radius && row[f.mag] < bestMag) {
          bestMag = row[f.mag];
          index = i;
        }
      });
    }
    if (index < 0) return null;
    const row = field.rows[index];
    const ra = entry.ra ?? row[f.ra];
    const dec = entry.dec ?? row[f.dec];
    return { entry, index, ra, dec, pos: new THREE.Vector3(...raDecToVector(ra, dec, SKY_RADIUS * 0.998)) };
  }).filter(Boolean);
}

// Small gold markers on the sky showing where each observation is.
export class ObservationMarkers {
  constructor(root, observations, onSelect) {
    this.root = root;
    this.visible = true;
    this.v = new THREE.Vector3();
    this.forward = new THREE.Vector3();
    this.items = observations.map((obs) => {
      const node = document.createElement('button');
      node.type = 'button';
      node.className = 'obs-marker';
      node.setAttribute('aria-label', `${obs.entry.short}, photographed by the ${obs.entry.telescope}`);
      node.innerHTML = `<span class="obs-marker-dot" aria-hidden="true"></span><span class="obs-marker-label">${escapeHtml(obs.entry.short)}</span>`;
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelect(obs);
      });
      node.addEventListener('pointerdown', (e) => e.stopPropagation());
      root.append(node);
      return { ...obs, node };
    });
  }

  setVisible(on) {
    this.visible = on;
    this.root.classList.toggle('is-hidden', !on);
  }

  update(camera, width, height, dim = 0) {
    if (!this.visible) return;
    camera.getWorldDirection(this.forward);
    this.root.style.setProperty('--obs-dim', String(1 - dim * 0.55));
    for (const item of this.items) {
      if (item.pos.dot(this.forward) <= 0) {
        item.node.classList.add('is-offscreen');
        continue;
      }
      this.v.copy(item.pos).project(camera);
      const x = (this.v.x * 0.5 + 0.5) * width;
      const y = (-this.v.y * 0.5 + 0.5) * height;
      const off = x < -40 || y < -40 || x > width + 40 || y > height + 40;
      item.node.classList.toggle('is-offscreen', off);
      if (!off) item.node.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
  }
}

// A list of every famous observation, opened from the bottom-left controls.
export class ObservationList {
  constructor(button, popover, observations, { onSelect, onToggleMarkers }) {
    this.button = button;
    this.popover = popover;
    this.button.querySelector('.obs-count').textContent = String(observations.length);

    popover.innerHTML = `
      <div class="obs-head">
        <h2 class="obs-title">Famous observations</h2>
        <p class="obs-intro">Detailed photographs from Hubble, Webb and ESO’s Very Large Telescope. Gold markers show where each one is in the sky.</p>
        <label class="obs-switch">
          <input type="checkbox" checked />
          <span class="obs-switch-track" aria-hidden="true"><span></span></span>
          <span>Show markers on the sky</span>
        </label>
      </div>
      <ul class="obs-items"></ul>
    `;
    const list = popover.querySelector('.obs-items');
    for (const obs of observations) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'obs-item';
      b.innerHTML = `<img class="obs-thumb" alt="" loading="lazy" /><span class="obs-item-text"><span class="obs-item-title"></span><span class="obs-item-scope"></span></span>`;
      const img = b.querySelector('img');
      img.src = thumbnailUrl(obs.entry);
      img.addEventListener('error', () => img.remove());
      b.querySelector('.obs-item-title').textContent = obs.entry.short;
      b.querySelector('.obs-item-scope').textContent = obs.entry.telescope;
      b.addEventListener('click', () => {
        this.close();
        onSelect(obs);
      });
      li.append(b);
      list.append(li);
    }

    popover.querySelector('.obs-switch input').addEventListener('change', (e) => onToggleMarkers(e.target.checked));

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.isOpen ? this.close() : this.open();
    });
    document.addEventListener('pointerdown', (e) => {
      if (this.isOpen && !popover.contains(e.target) && !button.contains(e.target)) this.close();
    });
    window.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          e.stopPropagation();
          this.close();
          button.focus({ preventScroll: true });
        }
      },
      true,
    );
  }

  get isOpen() {
    return this.popover.classList.contains('is-open');
  }

  open() {
    this.popover.classList.add('is-open');
    this.button.setAttribute('aria-expanded', 'true');
  }

  close() {
    this.popover.classList.remove('is-open');
    this.button.setAttribute('aria-expanded', 'false');
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
