// Builds public/data/constellations.json from d3-celestial's data files.
// Run once: npm run data:constellations
// d3-celestial by Olaf Frohn, BSD 3-Clause License.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = path.join(ROOT, 'public', 'data', 'constellations.json');
const BASE = 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/';

const toRa = (lon) => Math.round((((lon % 360) + 360) % 360) * 10000) / 10000;
const toDec = (lat) => Math.round(lat * 10000) / 10000;
const point = ([lon, lat]) => [toRa(lon), toDec(lat)];

async function get(file) {
  const res = await fetch(BASE + file);
  if (!res.ok) throw new Error(`Could not download ${file} (HTTP ${res.status})`);
  return res.json();
}

async function main() {
  console.log('Downloading d3-celestial constellation data');
  const [lines, bounds, names] = await Promise.all([
    get('constellations.lines.json'),
    get('constellations.bounds.json'),
    get('constellations.json'),
  ]);

  const out = {};
  const entry = (id) => (out[id] ??= { lines: [], bounds: [], labels: [], hi: null });

  for (const f of lines.features) {
    for (const line of f.geometry.coordinates) entry(f.id).lines.push(line.map(point));
  }
  for (const f of bounds.features) {
    for (const ring of f.geometry.coordinates) entry(f.id).bounds.push(ring.map(point));
  }
  for (const f of names.features) {
    const e = entry(f.id);
    e.labels.push(point(f.geometry.coordinates));
    e.hi = f.properties.hi ?? null;
  }

  const data = {
    meta: {
      source: 'd3-celestial by Olaf Frohn',
      sourceUrl: 'https://github.com/ofrohn/d3-celestial',
      license: 'BSD 3-Clause',
      retrieved: new Date().toISOString().slice(0, 10),
      notes: 'Coordinates are [RA degrees 0-360, Dec degrees]. Boundaries are IAU constellation boundaries.',
    },
    constellations: out,
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(data));
  const kb = (fs.statSync(OUT_FILE).size / 1024).toFixed(0);
  console.log(`Wrote ${Object.keys(out).length} constellations, ${kb} KB -> public/data/constellations.json`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
