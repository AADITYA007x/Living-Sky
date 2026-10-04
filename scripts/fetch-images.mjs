// Downloads curated observatory images into public/images/curated/.
// Run: npm run data:images  (already downloaded files are skipped)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { IMAGE_SOURCES, CURATED_IMAGES } from '../src/data/imagery.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public', 'images', 'curated');
const TIMEOUT_MS = 30_000;
const MAX_BYTES = 8 * 1024 * 1024;

const pageFor = (file) => {
  const entry = CURATED_IMAGES.find((e) => e.file === file || e.compare?.some((c) => c.file === file));
  return entry?.source ?? null;
};

async function tryUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const type = res.headers.get('content-type') ?? '';
    if (!type.startsWith('image/')) return { error: `not an image (${type || 'unknown type'})` };
    const size = Number(res.headers.get('content-length') ?? 0);
    if (size > MAX_BYTES) return { error: `too large (${(size / 1048576).toFixed(1)} MB)` };
    const data = Buffer.from(await res.arrayBuffer());
    return { data };
  } catch (err) {
    return { error: err.name === 'AbortError' ? `no response after ${TIMEOUT_MS / 1000}s` : err.message };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const failed = [];

  for (const [file, urls] of Object.entries(IMAGE_SOURCES)) {
    const target = path.join(OUT_DIR, file);
    if (fs.existsSync(target) && fs.statSync(target).size > 0) {
      console.log(`✓ ${file} (already downloaded)`);
      continue;
    }
    let done = false;
    for (const url of urls) {
      const u = new URL(url);
      process.stdout.write(`  ${file}: trying ${u.hostname} (${u.pathname.split('/').slice(-2, -1)[0]}) … `);
      const { data, error } = await tryUrl(url);
      if (data) {
        fs.writeFileSync(target, data);
        console.log(`✓ ${(data.length / 1024).toFixed(0)} KB`);
        done = true;
        break;
      }
      console.log(`✗ ${error}`);
    }
    if (!done) failed.push(file);
  }

  if (failed.length) {
    console.log('\nThese could not be downloaded automatically:');
    for (const file of failed) {
      console.log(`  ${file}: open ${pageFor(file) ?? 'its source page'}, download the "Screensize JPEG",`);
      console.log(`  and save it as public/images/curated/${file}`);
    }
    process.exitCode = 1;
  } else {
    console.log('\nAll images are ready.');
  }
}

main();
