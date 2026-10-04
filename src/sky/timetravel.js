import * as THREE from 'three';
import { raDecToVector, DEG } from './astro.js';

// The star catalog positions are for the year 2000 (epoch J2000).
export const EPOCH = 2000;
// How far the time machine reaches, in years from now
export const LIMIT = 100000;

const CURVE = 2.5;
const PRECESSION_PERIOD = 25772; // years for Earth's axis to circle once
const ECLIPTIC_POLE = new THREE.Vector3(...raDecToVector(270, 66.560708, 1));
const J2000_NORTH = new THREE.Vector3(0, 1, 0);

// Slider position (-1..1) <-> years from now. Fine control near the present.
export const sliderToOffset = (u) => Math.sign(u) * LIMIT * Math.abs(u) ** CURVE;
export const offsetToSlider = (o) => Math.sign(o) * (Math.abs(o) / LIMIT) ** (1 / CURVE);

export function currentYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return now.getFullYear() + (now - start) / (365.25 * 86400000);
}

function roundYear(year, span) {
  const step = span > 20000 ? 1000 : span > 2000 ? 100 : span > 200 ? 10 : 1;
  return Math.round(year / step) * step;
}

// Calendar label for an astronomical year (year 0 = 1 BCE)
export function formatEra(year, now = currentYear()) {
  const y = roundYear(year, Math.abs(year - now));
  const n = (v) => Math.abs(v).toLocaleString('en-US');
  if (y > 0) return `${n(y)} CE`;
  return `${n(1 - y)} BCE`;
}

export function describeOffset(offset) {
  const a = Math.abs(offset);
  if (a < 1) return 'Tonight';
  const n = (a > 20000 ? Math.round(a / 1000) * 1000 : a > 2000 ? Math.round(a / 100) * 100 : Math.round(a)).toLocaleString('en-US');
  return offset < 0 ? `${n} years ago` : `${n} years from now`;
}

// The north and south celestial poles for a given year, in the J2000 star frame.
// Earth's axis circles the ecliptic pole once every ~25,800 years (precession).
// This simple model ignores the slow change in the axis tilt itself.
export function polesAt(year) {
  const angle = (-2 * Math.PI * (year - EPOCH)) / PRECESSION_PERIOD;
  const north = J2000_NORTH.clone().applyAxisAngle(ECLIPTIC_POLE, angle);
  return { north, south: north.clone().negate() };
}

// Moments worth visiting, shown as small marks on the time slider
export const MOMENTS = [
  { year: -2700, label: 'Thuban is the North Star', note: 'around the time the first pyramids were built in Egypt' },
  { year: 2100, label: 'Polaris is closest to the pole', note: 'less than half a degree away' },
  { year: 13700, label: 'Vega is near the North Star', note: 'about 5° from the pole' },
];

export { DEG };
