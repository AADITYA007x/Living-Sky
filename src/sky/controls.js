import * as THREE from 'three';
import { DEG } from './astro.js';

const MIN_FOV = 2;
const MAX_FOV = 100;
const MAX_LAT = 89.5 * DEG;

export class SkyControls {
  constructor(camera, dom, { raDeg = 0, decDeg = 0, fov = 60 } = {}) {
    this.camera = camera;
    this.dom = dom;

    // lon = RA of the view centre, lat = Dec of the view centre (radians)
    this.lon = raDeg * DEG;
    this.lat = decDeg * DEG;
    this.fov = fov;
    this.targetFov = fov;

    this.velLon = 0;
    this.velLat = 0;
    this.pointers = new Map();
    this.lastMoveTime = 0;
    this.pinch = null;
    this.onFirstInteraction = null;
    this._interacted = false;
    this._target = new THREE.Vector3();
    this.flight = null;

    dom.addEventListener('pointerdown', this._onDown);
    dom.addEventListener('pointermove', this._onMove);
    dom.addEventListener('pointerup', this._onUp);
    dom.addEventListener('pointercancel', this._onUp);
    dom.addEventListener('wheel', this._onWheel, { passive: false });
  }

  _markInteracted() {
    if (this._interacted) return;
    this._interacted = true;
    this.onFirstInteraction?.();
  }

  _radiansPerPixel() {
    return (this.fov * DEG) / Math.max(this.dom.clientHeight, 1);
  }

  _pinchDistance() {
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  // Smoothly turn the view so (raDeg, decDeg) sits at the given screen offset.
  // offsetY is a fraction of the field of view (positive = target appears higher).
  // offsetX is a fraction of the screen width (positive = target appears further right).
  flyTo(raDeg, decDeg, { fov = null, offsetY = 0, offsetX = 0, duration = 1.4 } = {}) {
    const endFov = fov ?? this.targetFov;
    let endLon = raDeg * DEG;
    if (offsetX) {
      const halfH = Math.atan(Math.tan((endFov * DEG) / 2) * this.camera.aspect);
      const angle = Math.atan(2 * offsetX * Math.tan(halfH));
      // East is to the left, so looking left of the target means a larger RA
      endLon += angle / Math.max(0.25, Math.cos(decDeg * DEG));
    }
    const endLat = clampLat(decDeg * DEG - offsetY * endFov * DEG);
    let dLon = endLon - this.lon;
    dLon = ((dLon + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    endLon = this.lon + dLon;
    this.velLon = 0;
    this.velLat = 0;
    this.flight = {
      t: 0,
      duration,
      from: { lon: this.lon, lat: this.lat, fov: this.targetFov },
      to: { lon: endLon, lat: endLat, fov: endFov },
    };
  }

  _onDown = (e) => {
    this.flight = null;
    this.dom.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.velLon = 0;
    this.velLat = 0;
    if (this.pointers.size === 2) {
      this.pinch = { dist: this._pinchDistance(), fov: this.targetFov };
    }
    this._markInteracted();
  };

  _onMove = (e) => {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;

    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;

    if (this.pointers.size === 2 && this.pinch) {
      const d = this._pinchDistance();
      if (d > 0) this.targetFov = clampFov((this.pinch.fov * this.pinch.dist) / d);
      return;
    }
    if (this.pointers.size !== 1) return;

    const k = this._radiansPerPixel();
    const dLon = dx * k;
    const dLat = dy * k;
    this.lon += dLon;
    this.lat = clampLat(this.lat + dLat);

    const now = e.timeStamp;
    const dt = Math.max((now - this.lastMoveTime) / 1000, 1 / 240);
    this.lastMoveTime = now;
    this.velLon = this.velLon * 0.6 + (dLon / dt) * 0.4;
    this.velLat = this.velLat * 0.6 + (dLat / dt) * 0.4;
  };

  _onUp = (e) => {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinch = null;
    if (this.pointers.size === 0 && e.timeStamp - this.lastMoveTime > 80) {
      this.velLon = 0;
      this.velLat = 0;
    }
  };

  _onWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    this.flight = null;
    this.targetFov = clampFov(this.targetFov * Math.exp(delta * 0.0012));
    this._markInteracted();
  };

  update(dt) {
    if (this.flight) {
      const fl = this.flight;
      fl.t = Math.min(fl.t + dt / fl.duration, 1);
      const e = fl.t < 0.5 ? 4 * fl.t ** 3 : 1 - (-2 * fl.t + 2) ** 3 / 2;
      this.lon = fl.from.lon + (fl.to.lon - fl.from.lon) * e;
      this.lat = fl.from.lat + (fl.to.lat - fl.from.lat) * e;
      this.targetFov = fl.from.fov + (fl.to.fov - fl.from.fov) * e;
      if (fl.t >= 1) this.flight = null;
    } else if (this.pointers.size === 0) {
      this.lon += this.velLon * dt;
      this.lat = clampLat(this.lat + this.velLat * dt);
      const decay = Math.exp(-dt * 3.5);
      this.velLon *= decay;
      this.velLat *= decay;
    }

    this.fov += (this.targetFov - this.fov) * (1 - Math.exp(-dt * 8));

    const c = Math.cos(this.lat);
    this._target.set(c * Math.cos(this.lon), Math.sin(this.lat), -c * Math.sin(this.lon));
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this._target);

    if (Math.abs(this.camera.fov - this.fov) > 1e-4) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }
  }
}

function clampFov(f) {
  return Math.min(Math.max(f, MIN_FOV), MAX_FOV);
}

function clampLat(l) {
  return Math.min(Math.max(l, -MAX_LAT), MAX_LAT);
}
