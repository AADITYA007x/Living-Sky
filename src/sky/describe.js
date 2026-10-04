import { CONSTELLATIONS, GREEK } from '../data/constellations.js';
import { CURATED } from '../data/curated.js';
import { bvToTemperature } from './astro.js';

const LY_PER_PC = 3.261563777;
const SUPERSCRIPT = { 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };

const COLOR_WORD = {
  O: 'Blue', B: 'Blue-white', A: 'White', F: 'Yellow-white', G: 'Yellow', K: 'Orange', M: 'Red',
};

export function getStar(field, index) {
  const row = field.rows[index];
  const f = field.fieldIndex;
  const get = (k) => (k in f ? row[f[k]] : null);
  return {
    index,
    ra: get('ra'), dec: get('dec'), mag: get('mag'), ci: get('ci'), distLy: get('distLy'),
    proper: get('proper'), bayer: get('bayer'), flam: get('flam'), con: get('con'),
    spect: get('spect'), hip: get('hip'), hd: get('hd'), lum: get('lum'), id: get('id'),
  };
}

export function describeStar(star, now = new Date()) {
  const curated = star.hip ? CURATED[star.hip] : null;
  const con = CONSTELLATIONS[star.con] ?? null;
  const designation = formatDesignation(star, con);
  const name = curated?.name ?? star.proper ?? designation ?? catalogName(star);
  const subtitle = [designation && designation !== name ? designation : null, con?.[0]]
    .filter(Boolean);

  const temperature = star.ci != null ? bvToTemperature(star.ci) : null;
  const type = describeType(star.spect);
  const distance = describeDistance(star, curated);
  const lightYear = describeLightYear(distance, now.getFullYear());
  const size = describeSize(star, curated, temperature);

  return {
    name,
    subtitle,
    origin: curated?.origin ?? null,
    fact: curated?.fact ?? null,
    type,
    distance,
    lightYear,
    size,
    temperature,
    magnitude: star.mag,
    spect: star.spect,
    catalog: catalogName(star),
  };
}

function formatDesignation(star, con) {
  if (!con) return null;
  if (star.bayer) {
    const m = String(star.bayer).match(/^([A-Za-z]+)-?(\d)?$/);
    const letter = m ? GREEK[m[1]] : null;
    if (letter) return `${letter}${m[2] ? SUPERSCRIPT[m[2]] ?? '' : ''} ${con[1]}`;
  }
  if (star.flam) return `${star.flam} ${con[1]}`;
  return null;
}

function catalogName(star) {
  if (star.hip) return `HIP ${star.hip}`;
  if (star.hd) return `HD ${star.hd}`;
  return `HYG ${star.id}`;
}

export function describeType(spect) {
  if (!spect) return { label: 'Star', detail: 'Spectral type not recorded' };
  const s = spect.trim();

  if (/^D/.test(s)) return { label: 'White dwarf', detail: s };
  if (/^W/.test(s)) return { label: 'Wolf-Rayet star', detail: s };
  if (/^[CNRS]/.test(s)) return { label: 'Carbon or S-type giant', detail: s };

  const m = s.match(/^([OBAFGKM])[\d.]*(?:[-/][OBAFGKM]?[\d.]+)?\s*([IV]+[ab0]*)?/);
  if (!m) return { label: 'Star', detail: s };

  const color = COLOR_WORD[m[1]];
  const lum = m[2] ?? '';
  let kind = null;
  if (lum.startsWith('VI')) kind = 'subdwarf';
  else if (lum.startsWith('V')) kind = 'main-sequence star';
  else if (lum.startsWith('IV')) kind = 'subgiant';
  else if (lum.startsWith('III')) kind = 'giant';
  else if (lum.startsWith('II')) kind = 'bright giant';
  else if (lum.startsWith('I')) kind = 'supergiant';

  return { label: kind ? `${color} ${kind}` : `${color} star`, detail: s };
}

function describeDistance(star, curated) {
  if (curated?.distance) {
    const d = curated.distance;
    return { ly: d.ly, min: d.min ?? null, max: d.max ?? null, note: d.note ?? null, quality: 'curated' };
  }
  if (star.distLy == null) return null;
  const ly = star.distLy;
  // Hipparcos parallaxes for bright stars are good to roughly 1 milliarcsecond,
  // so fractional error grows with distance: ~10% near 300 ly, ~30% near 1,000 ly.
  const frac = ly / LY_PER_PC / 1000;
  let quality = 'good';
  let note = null;
  if (frac > 0.3) {
    quality = 'poor';
    note = 'This far out, the catalog distance is only a rough estimate.';
  } else if (frac > 0.1) {
    quality = 'fair';
    note = 'Measured by parallax. Expect an uncertainty of 10–30%.';
  }
  return { ly, min: null, max: null, note, quality };
}

function roundYear(year, ly) {
  const step = ly < 50 ? 1 : ly < 1000 ? 10 : ly < 2000 ? 50 : 100;
  return Math.round(year / step) * step;
}

export function formatYear(year) {
  if (year > 0) return `${year}`;
  return `${1 - year} BCE`;
}

function describeLightYear(distance, currentYear) {
  if (!distance) return null;
  if (distance.min != null && distance.max != null && distance.max - distance.min > distance.ly * 0.15) {
    const early = roundYear(currentYear - distance.max, distance.max);
    const late = roundYear(currentYear - distance.min, distance.min);
    return `The light reaching your eyes tonight left this star sometime between ${formatYear(early)} and ${formatYear(late)}.`;
  }
  const year = roundYear(currentYear - distance.ly, distance.ly);
  const approx = distance.ly < 50 && distance.quality === 'good' ? 'in' : 'around';
  return `The light reaching your eyes tonight left this star ${approx} the year ${formatYear(year)}.`;
}

// Bolometric correction from effective temperature (Torres 2010, AJ 140, 1158).
function bolometricCorrection(T) {
  const l = Math.log10(T);
  let c;
  if (l < 3.7) c = [-0.190537291496456e5, 0.155144866764412e5, -0.421278819301717e4, 0.381476328422343e3];
  else if (l < 3.9) c = [-0.370510203809015e5, 0.385672629965804e5, -0.150651486316025e5, 0.261724637119416e4, -0.170623810323864e3];
  else c = [-0.118115450538963e6, 0.137145973583929e6, -0.636233812100225e5, 0.147412923562646e5, -0.170587278406872e4, 0.788731721804990e2];
  return c.reduce((sum, a, i) => sum + a * l ** i, 0);
}

function describeSize(star, curated, temperature) {
  if (curated?.radius) {
    const r = curated.radius;
    const text = r.value != null
      ? `About ${formatRadius(r.value)} times the Sun’s width`
      : `About ${formatRadius(r.min)}–${formatRadius(r.max)} times the Sun’s width`;
    return { text, note: r.note ?? null, estimated: false };
  }
  if (temperature == null || star.distLy == null || star.mag == null) return null;
  // Radius from luminosity and temperature (Stefan-Boltzmann): R = sqrt(L) * (T_sun / T)^2
  const pc = star.distLy / LY_PER_PC;
  const absV = star.mag - 5 * Math.log10(pc / 10);
  const mBol = absV + bolometricCorrection(temperature);
  const L = 10 ** (0.4 * (4.74 - mBol));
  const R = Math.sqrt(L) * (5772 / temperature) ** 2;
  if (!Number.isFinite(R) || R <= 0) return null;
  return {
    text: `Roughly ${formatRadius(R)} times the Sun’s width`,
    note: 'Estimated from brightness, distance and color.',
    estimated: true,
  };
}

function formatRadius(r) {
  if (r < 10) return (Math.round(r * 10) / 10).toString();
  if (r < 100) return Math.round(r).toString();
  return (Math.round(r / 10) * 10).toLocaleString('en-US');
}

export function formatDistance(distance) {
  if (!distance) return 'Unknown';
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const ly = distance.ly < 20 ? distance.ly.toFixed(1) : fmt(distance.ly);
  if (distance.min != null && distance.max != null) {
    return `About ${ly} light-years (estimates ${fmt(distance.min)}–${fmt(distance.max)})`;
  }
  return `${distance.quality === 'good' ? '' : 'About '}${ly} light-years`;
}
