// Builds public/data/stars.json from the HYG v4.2 catalog.
// Run once: npm run data:stars
// HYG database by David Nash (astronexus.com), CC BY-SA 4.0.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW_DIR = path.join(ROOT, 'data-raw');
const RAW_FILE = path.join(RAW_DIR, 'hygdata_v42.csv.gz');
const OUT_FILE = path.join(ROOT, 'public', 'data', 'stars.json');
const SOURCE_URL = 'https://www.astronexus.com/downloads/catalogs/hygdata_v42.csv.gz';

const MAG_LIMIT = 6.5;
const PC_TO_LY = 3.261563777;
const FIELDS = ['ra', 'dec', 'mag', 'ci', 'distLy', 'proper', 'bayer', 'flam', 'con', 'spect', 'hip', 'hd', 'lum', 'id', 'pmra', 'pmdec', 'vx', 'vy', 'vz'];

async function ensureRaw() {
  if (fs.existsSync(RAW_FILE)) return;
  fs.mkdirSync(RAW_DIR, { recursive: true });
  console.log(`Downloading ${SOURCE_URL}`);
  let res;
  try {
    res = await fetch(SOURCE_URL);
  } catch (err) {
    throw new Error(`Download failed (${err.message}). Download the file manually and save it as data-raw/hygdata_v42.csv.gz`);
  }
  if (!res.ok) {
    throw new Error(`Download failed (HTTP ${res.status}). Download the file manually and save it as data-raw/hygdata_v42.csv.gz`);
  }
  fs.writeFileSync(RAW_FILE, Buffer.from(await res.arrayBuffer()));
}

function readCsvText() {
  const buf = fs.readFileSync(RAW_FILE);
  const isGzip = buf[0] === 0x1f && buf[1] === 0x8b;
  return (isGzip ? zlib.gunzipSync(buf) : buf).toString('utf8');
}

function parseLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

const num = (v) => {
  if (v === undefined) return null;
  const s = v.trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const round = (n, d) => (n === null ? null : Math.round(n * 10 ** d) / 10 ** d);
const sig = (n, d) => (n === null ? null : Number(n.toPrecision(d)));
const microPc = (v) => (v === null ? null : Math.round(v * 1e10) / 1e4);
const str = (v) => {
  const s = (v ?? '').trim();
  return s === '' ? null : s;
};

async function main() {
  await ensureRaw();
  const lines = readCsvText().split(/\r?\n/).filter((l) => l.length > 0);
  const header = parseLine(lines[0]).map((h) => h.trim());
  const col = Object.fromEntries(header.map((h, i) => [h, i]));

  const required = ['id', 'ra', 'dec', 'mag', 'ci', 'dist', 'proper', 'bayer', 'flam', 'con', 'spect', 'hip', 'hd', 'lum', 'pmra', 'pmdec', 'vx', 'vy', 'vz'];
  const missing = required.filter((c) => !(c in col));
  if (missing.length) throw new Error(`Catalog is missing columns: ${missing.join(', ')}`);

  const stars = [];
  for (let i = 1; i < lines.length; i++) {
    const f = parseLine(lines[i]);
    const id = num(f[col.id]);
    if (id === 0) continue; // the Sun

    const mag = num(f[col.mag]);
    if (mag === null || mag > MAG_LIMIT) continue;

    const ra = num(f[col.ra]);
    const dec = num(f[col.dec]);
    if (ra === null || dec === null) continue;

    const distPc = num(f[col.dist]);
    const distLy = distPc !== null && distPc > 0 && distPc < 100000 ? round(distPc * PC_TO_LY, 1) : null;

    stars.push([
      round(ra * 15, 5),
      round(dec, 5),
      round(mag, 2),
      round(num(f[col.ci]), 3),
      distLy,
      str(f[col.proper]),
      str(f[col.bayer]),
      num(f[col.flam]),
      str(f[col.con]),
      str(f[col.spect]),
      num(f[col.hip]),
      num(f[col.hd]),
      sig(num(f[col.lum]), 4),
      id,
      round(num(f[col.pmra]), 2),
      round(num(f[col.pmdec]), 2),
      // Space velocity in micro-parsecs per year (HYG gives parsecs per year)
      distLy === null ? null : microPc(num(f[col.vx])),
      distLy === null ? null : microPc(num(f[col.vy])),
      distLy === null ? null : microPc(num(f[col.vz])),
    ]);
  }

  stars.sort((a, b) => a[2] - b[2]);

  const output = {
    meta: {
      source: 'HYG Database v4.2 by David Nash (astronexus.com)',
      sourceUrl: 'https://www.astronexus.com/projects/hyg',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      modifications: `Filtered to apparent magnitude <= ${MAG_LIMIT}, Sun removed, RA converted to degrees, distance converted to light-years, velocities converted to micro-parsecs per year, values rounded.`,
      units: { pmra: 'mas/yr (includes cos dec)', pmdec: 'mas/yr', vx: 'micro-parsecs/yr, equatorial x toward RA 0h', vy: 'toward RA 6h', vz: 'toward north celestial pole' },
      epoch: 'J2000',
      magLimit: MAG_LIMIT,
      count: stars.length,
      fields: FIELDS,
    },
    stars,
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(output));
  const kb = (fs.statSync(OUT_FILE).size / 1024).toFixed(0);
  const named = stars.filter((s) => s[5]).length;
  console.log(`Wrote ${stars.length} stars (${named} with proper names), ${kb} KB -> public/data/stars.json`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
