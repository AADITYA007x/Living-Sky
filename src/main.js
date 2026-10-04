import * as THREE from 'three';
import './style.css';
import { createStarField } from './sky/stars.js';
import { SkyControls } from './sky/controls.js';
import { pickStar, projectToScreen } from './sky/picking.js';
import { getStar, describeStar, formatDistance } from './sky/describe.js';
import { createConstellations, ConstellationLabels } from './sky/constellations.js';
import { FocusState } from './sky/focus.js';
import { CONSTELLATIONS, CON_INDEX, ENGLISH, ALIASES } from './data/constellations.js';
import { StarPanel } from './ui/panel.js';
import { Telescope } from './ui/telescope.js';
import { Gallery } from './ui/gallery.js';
import { StarChat } from './ui/chat.js';
import { imagesForStar } from './data/imagery.js';
import { resolveObservations, ObservationMarkers } from './ui/observations.js';
import { createMilkyWay } from './sky/milkyway.js';
import { AmbientSound } from './audio/ambient.js';
import { Meteors } from './ui/meteors.js';
import { showIntro } from './ui/intro.js';
import { TimeBar } from './ui/timebar.js';
import { EPOCH, currentYear, polesAt, formatEra } from './sky/timetravel.js';
import { resolveIndianSky } from './data/indian.js';
import { IndianSky, indianLore } from './ui/indian.js';
import { SkySearch, normalize } from './ui/search.js';
import { raDecToVector } from './sky/astro.js';
import { resolveAsterisms } from './data/asterisms.js';
import { TOUR, HIGHLIGHTS } from './data/tour.js';
import { GuideList, TourCard } from './ui/guide.js';

const canvas = document.querySelector('#sky');
const hint = document.querySelector('.hint');
const status = document.querySelector('.status');
const ring = document.querySelector('.ring');
const labelRoot = document.querySelector('.labels');
const linesToggle = document.querySelector('.toggle-lines');
const panel = new StarPanel(document.querySelector('.panel'));
const telescope = new Telescope(document.querySelector('.scope'));
const gallery = new Gallery(document.querySelector('.gallery'));
const chat = new StarChat(document.querySelector('.chat'));

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
const pixelRatio = () => Math.min(window.devicePixelRatio, 2);
renderer.setPixelRatio(pixelRatio());
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x03050b, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);

const milkyWay = createMilkyWay();
scene.add(milkyWay.mesh);

// Music
const sound = new AmbientSound();
const soundToggle = document.querySelector('.sound-toggle');
function setSound(on) {
  soundToggle.setAttribute('aria-pressed', String(on));
  if (on) sound.start();
  else sound.stop();
}
if (!sound.supported) soundToggle.hidden = true;
soundToggle.addEventListener('click', () => setSound(soundToggle.getAttribute('aria-pressed') !== 'true'));

new Meteors(document.querySelector('.meteors'), { onMeteor: () => sound.glint() });

// Open facing Orion
const controls = new SkyControls(camera, canvas, { raDeg: 84, decDeg: 2, fov: 70 });
controls.onFirstInteraction = () => hint?.classList.add('is-hidden');

const focus = new FocusState();
let field = null;
let constellations = null;
let labels = null;
let markers = null;
let indianSky = null;
let conDataRef = null;
let observationsRef = [];
let indianResolved = null;
const indianToggle = document.querySelector('.indian-toggle');
let selected = -1;
let current = null;

// Time machine
let timeOffset = 0; // years from tonight currently shown
let appliedOffset = null;
const poleMarkers = {
  north: document.querySelector('.pole-north'),
  south: document.querySelector('.pole-south'),
};
const timeButton = document.querySelector('.time-button');
const timebar = new TimeBar(document.querySelector('.timebar'), timeButton, {
  onOpen: () => {
    hint?.classList.add('is-hidden');
    document.body.classList.add('is-time-travelling');
  },
  onClose: () => document.body.classList.remove('is-time-travelling'),
  onMoment: () => sound.glint(),
});

const isNarrow = () => window.innerWidth < 720;

function select(index, { center = null } = {}) {
  hideConToast();
  selected = index;
  const star = getStar(field, index);
  const info = describeStar(star);
  current = { ra: star.ra, dec: star.dec, name: info.name, key: `${star.id}`, star, info };
  sound.setStar(info.temperature);
  hideHover();
  chat.close();
  panel.show(info, { images: imagesForStar(star), indian: indianLore(indianResolved, index) });
  updateThen(timeOffset);
  focus.setFocus(CON_INDEX[star.con] ?? -1);
  ring.classList.remove('is-visible');
  void ring.offsetWidth;
  ring.classList.add('is-visible');
  const target = center ?? { ra: star.ra, dec: star.dec };
  controls.flyTo(target.ra, target.dec, {
    fov: Math.min(controls.targetFov, 55),
    offsetY: isNarrow() ? 0.22 : timebar.isOpen ? 0.12 : 0,
  });
}

function deselect() {
  selected = -1;
  chat.close();
  focus.setFocus(-1);
  ring.classList.remove('is-visible');
}

panel.onClose = deselect;
panel.onOpenImage = (entry) => gallery.open(entry);
panel.onTalk = () => {
  if (!current) return;
  chat.open(current.key, {
    name: current.info.name,
    lightYear: current.info.lightYear,
    facts: chatFacts(current.star, current.info),
  });
};
chat.onBack = () => document.querySelector('.panel-talk')?.focus({ preventScroll: true });

// The catalog facts the star is allowed to speak from
function chatFacts(star, info) {
  const round = (n, d = 2) => (n == null ? null : Number(n.toFixed(d)));
  return {
    name: info.name,
    designation: info.subtitle[0] && info.subtitle[0] !== CONSTELLATIONS[star.con]?.[0] ? info.subtitle[0] : null,
    constellation: CONSTELLATIONS[star.con]?.[0] ?? null,
    catalog: info.catalog,
    spect: star.spect,
    type: info.type.label,
    magnitude: round(star.mag),
    distance: info.distance ? formatDistance(info.distance) : 'Unknown',
    distanceNote: info.distance?.note ?? null,
    lightYear: info.lightYear,
    size: info.size?.text ?? null,
    sizeNote: info.size?.note ?? null,
    temperature: info.temperature ? `About ${Math.round(info.temperature / 100) * 100} K (estimated from color index B-V ${star.ci})` : null,
    luminosity: star.lum != null ? `${star.lum} times the Sun` : null,
    origin: info.origin,
    fact: info.fact,
    position: `RA ${round(star.ra, 3)}°, Dec ${round(star.dec, 3)}°`,
    viewing: Math.abs(timeOffset) >= 50 ? viewingFact() : null,
    indian: indianLore(indianResolved, selected).map((e) => `${e.title} (${e.deva}): ${e.text}`).join(' ') || null,
  };
}
function viewingFact() {
  const s = field.stateAt(selected);
  const era = formatEra(currentYear() + timeOffset);
  const where = s.distLy != null ? `you would be ${s.distLy.toFixed(1)} light-years away and shine at magnitude ${s.mag.toFixed(1)}` : `your brightness would be magnitude ${s.mag.toFixed(1)}`;
  return `The visitor is using a time machine and viewing the sky of ${era}. Based on your measured motion, in that year ${where}.`;
}

panel.onLookCloser = () => {
  if (current) telescope.open(current);
};

// Treat a short, still press as a tap or click on the sky
const presses = new Map();
canvas.addEventListener('pointerdown', (e) => {
  presses.set(e.pointerId, { x: e.clientX, y: e.clientY, t: e.timeStamp, multi: presses.size > 0 });
});
canvas.addEventListener('pointerup', (e) => {
  const p = presses.get(e.pointerId);
  presses.delete(e.pointerId);
  if (!p || p.multi || !field) return;
  const moved = Math.hypot(e.clientX - p.x, e.clientY - p.y);
  if (moved > 6 || e.timeStamp - p.t > 600) return;

  const index = pickStar(field, camera, e.clientX, e.clientY, window.innerWidth, window.innerHeight, {
    touch: e.pointerType === 'touch',
  });
  if (index >= 0) select(index);
  else {
    panel.close();
    if (selected < 0 && focus.focus >= 0) {
      focus.setFocus(-1);
      hideConToast();
    }
  }
});
canvas.addEventListener('pointercancel', (e) => presses.delete(e.pointerId));

function setShowAll(on) {
  focus.showAllTarget = on ? 1 : 0;
  linesToggle.setAttribute('aria-pressed', String(on));
}

linesToggle.addEventListener('click', () => {
  setShowAll(linesToggle.getAttribute('aria-pressed') !== 'true');
});

window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() !== 'c' || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target instanceof HTMLElement && e.target.closest('input, textarea')) return;
  if (!linesToggle.hidden) linesToggle.click();
});

async function loadJson(name) {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${name}`);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return res.json();
}

async function loadSky() {
  let starData;
  try {
    starData = await loadJson('stars.json');
  } catch (err) {
    console.error('Could not load star data', err);
    status.textContent = 'Star data did not load. Run "npm run data:stars", then reload.';
    status.classList.add('is-visible');
    return;
  }
  field = createStarField(starData, { pixelRatio: pixelRatio() });
  field.setYears(currentYear() - EPOCH);
  scene.add(field.points);
  setupObservations();
  setupIndianSky();
  addDataMoments();
  timeButton.hidden = false;

  try {
    const conData = await loadJson('constellations.json');
    conDataRef = conData;
    constellations = createConstellations(conData, field);
    scene.add(constellations.group);
    labels = new ConstellationLabels(labelRoot, constellations.labels);
    labels.setIndian(indianToggle.getAttribute('aria-pressed') === 'true');
    linesToggle.hidden = false;
  } catch (err) {
    console.warn('Constellation data did not load. Run "npm run data:constellations".', err);
  }
}

// Star names on hover (mouse only)
const hoverLabel = document.querySelector('.hover-label');
let hoverFrame = 0;
let hoverPoint = null;
function hideHover() {
  hoverLabel.classList.remove('is-visible');
  canvas.style.cursor = '';
}
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || e.buttons !== 0) {
    hideHover();
    return;
  }
  hoverPoint = { x: e.clientX, y: e.clientY };
  if (hoverFrame) return;
  hoverFrame = requestAnimationFrame(() => {
    hoverFrame = 0;
    if (!field || !hoverPoint) return;
    const index = pickStar(field, camera, hoverPoint.x, hoverPoint.y, window.innerWidth, window.innerHeight);
    if (index < 0 || index === selected) {
      hideHover();
      return;
    }
    const indianName = indianSky?.enabled ? indianSky.nameOf(index) : null;
    const name = indianName ?? describeStar(getStar(field, index)).name;
    const p = projectToScreen(field, index, camera, window.innerWidth, window.innerHeight);
    if (!p) return hideHover();
    canvas.style.cursor = 'pointer';
    hoverLabel.textContent = /^(HIP|HD|HYG) /.test(name) ? '' : name;
    hoverLabel.classList.toggle('is-visible', Boolean(hoverLabel.textContent));
    hoverLabel.style.transform = `translate(${p.x}px, ${p.y}px)`;
  });
});
canvas.addEventListener('pointerleave', hideHover);
canvas.addEventListener('pointerdown', hideHover);

showIntro(document.querySelector('.intro'), {
  onBegin: (withSound, withTour) => {
    if (withSound) setSound(true);
    if (withTour) {
      // Wait for the stars to load before starting the tour
      const wait = () => (tour ? setTimeout(startTour, 900) : setTimeout(wait, 200));
      wait();
    } else setTimeout(() => hint?.classList.add('is-visible'), 600);
  },
});

// Search
const conToast = document.querySelector('.con-toast');
let toastTimer = 0;
function hideConToast() {
  conToast.classList.remove('is-visible');
  clearPattern();
}

const toRaDec = (v) => ({
  ra: ((Math.atan2(-v.z, v.x) * 180) / Math.PI + 360) % 360,
  dec: (Math.asin(Math.max(-1, Math.min(1, v.y))) * 180) / Math.PI,
});

function showConstellation(abbr, { toast = true, view = null } = {}) {
  const c = conDataRef?.constellations?.[abbr];
  const ci = CON_INDEX[abbr];
  if (!c || ci === undefined) return;
  // Centre and size from the official boundary
  const pts = c.bounds.flat().map(([ra, dec]) => new THREE.Vector3(...raDecToVector(ra, dec, 1)));
  const center = pts.reduce((a, p) => a.add(p), new THREE.Vector3()).normalize();
  const radius = Math.max(...pts.map((p) => center.angleTo(p))) * (180 / Math.PI);
  const { ra, dec } = toRaDec(center);
  panel.close();
  focus.setFocus(ci);
  controls.flyTo(ra, dec, {
    fov: Math.min(100, Math.max(18, radius * 2.3 * (view?.fovScale ?? 1))),
    offsetY: view?.offsetY ?? (timebar.isOpen ? 0.12 : 0),
    offsetX: view?.offsetX ?? 0,
  });
  if (!toast) return;

  const f = field.fieldIndex;
  const brightest = field.rows.findIndex((r) => r[f.con] === abbr);
  const indian = indianToggle.getAttribute('aria-pressed') === 'true';
  conToast.innerHTML = '<p class="con-toast-name"></p><p class="con-toast-sub"></p>';
  conToast.querySelector('.con-toast-name').textContent = CONSTELLATIONS[abbr][0];
  conToast.querySelector('.con-toast-sub').textContent = [ENGLISH[abbr], c.hi && indian ? c.hi : null].filter(Boolean).join(' · ');
  if (brightest >= 0) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'con-toast-star';
    b.textContent = `Brightest star: ${describeStar(getStar(field, brightest)).name}`;
    b.addEventListener('click', () => {
      hideConToast();
      select(brightest);
    });
    conToast.append(b);
  }
  conToast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideConToast, 9000);
}

// Gold rings that briefly mark the stars of a searched pattern
const patternLayer = document.querySelector('.pattern-layer');
let patternRings = [];
let patternTimer = 0;
function clearPattern() {
  patternLayer.classList.remove('is-visible');
  clearTimeout(patternTimer);
}

// Fly to a group of stars and ring them gently
function showStars(indices, con, { minFov = 8, view = null } = {}) {
  const dirs = indices.map((i) => new THREE.Vector3().fromArray(field.dirs, i * 3));
  const center = dirs.reduce((s, d) => s.add(d), new THREE.Vector3()).normalize();
  const radius = Math.max(...dirs.map((d) => center.angleTo(d))) * (180 / Math.PI);
  const { ra, dec } = toRaDec(center);
  panel.close();
  focus.setFocus(con ? CON_INDEX[con] ?? -1 : -1);
  controls.flyTo(ra, dec, {
    fov: Math.min(100, Math.max(minFov, radius * 2 * 2.4 * (view?.fovScale ?? 1))),
    offsetY: view?.offsetY ?? (timebar.isOpen ? 0.12 : 0),
    offsetX: view?.offsetX ?? 0,
  });

  patternLayer.replaceChildren();
  patternRings = indices.map((index) => {
    const node = document.createElement('span');
    node.className = 'pattern-ring';
    patternLayer.append(node);
    return { index, node };
  });
  patternLayer.classList.add('is-visible');
  clearTimeout(patternTimer);
  patternTimer = setTimeout(clearPattern, 9000);
}

function showAsterism(a) {
  showStars(a.indices, a.con);
  conToast.innerHTML = '<p class="con-toast-name"></p><p class="con-toast-sub"></p><p class="con-toast-note"></p>';
  conToast.querySelector('.con-toast-name').textContent = a.name;
  conToast.querySelector('.con-toast-sub').textContent = a.con ? `A star pattern in ${CONSTELLATIONS[a.con][0]}` : 'A star pattern across constellations';
  conToast.querySelector('.con-toast-note').textContent = a.note;
  conToast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideConToast, 9000);
}

function updatePattern() {
  if (!patternRings.length || !patternLayer.classList.contains('is-visible')) return;
  for (const r of patternRings) {
    const p = projectToScreen(field, r.index, camera, window.innerWidth, window.innerHeight);
    r.node.style.visibility = p ? '' : 'hidden';
    if (p) r.node.style.transform = `translate(${p.x}px, ${p.y}px)`;
  }
}

function setIndianSky(on) {
  indianToggle.setAttribute('aria-pressed', String(on));
  indianSky?.setEnabled(on);
  labels?.setIndian(on);
  sound.setIndian(on);
}

function buildSearchIndex() {
  const entries = [];
  const words = (...xs) => xs.flat().filter(Boolean).map(normalize);

  for (const [abbr, [name, gen]] of Object.entries(CONSTELLATIONS)) {
    const hi = conDataRef?.constellations?.[abbr]?.hi ?? null;
    const english = ENGLISH[abbr];
    entries.push({
      type: 'constellation',
      label: name,
      sub: english ? english.charAt(0).toUpperCase() + english.slice(1) : '',
      keys: words(name, gen, abbr, english, english?.replace(/^the /, ''), ALIASES[abbr] ?? [], hi),
      boost: 6,
      abbr,
    });
  }

  if (field) {
    const f = field.fieldIndex;
    const seen = new Set();
    for (let i = 0; i < field.count; i++) {
      const r = field.rows[i];
      const named = Boolean(r[f.proper]);
      if (!named && r[f.mag] > 4) continue;
      const info = describeStar(getStar(field, i));
      if (/^(HIP|HD|HYG) /.test(info.name) || seen.has(info.name)) continue;
      seen.add(info.name);
      entries.push({
        type: 'star',
        label: info.name,
        sub: [info.subtitle.join(', in '), info.type.label].filter(Boolean).join(' · '),
        keys: words(info.name, info.subtitle[0], r[f.hip] ? `hip ${r[f.hip]}` : null),
        boost: Math.max(0, 4 - r[f.mag]),
        index: i,
      });
    }
  }

  if (indianResolved) {
    for (const nk of indianResolved.nakshatras) {
      if (!nk.indices.length) continue;
      entries.push({ type: 'nakshatra', label: nk.name, deva: nk.deva, sub: `Nakshatra ${nk.n} of 27`, keys: words(nk.name, nk.deva), boost: 3, index: nk.indices[0], indian: true });
    }
    for (const s of [...indianResolved.sages, ...indianResolved.others]) {
      if (s.index < 0) continue;
      const isSage = indianResolved.sages.includes(s);
      entries.push({ type: isSage ? 'rishi' : 'star', label: s.name, deva: s.deva, sub: describeStar(getStar(field, s.index)).name, keys: words(s.name, s.deva), boost: 3, index: s.index, indian: true });
    }
  }

  if (field) {
    for (const a of resolveAsterisms(field)) {
      entries.push({
        type: 'asterism',
        label: a.name,
        sub: a.con ? `Star pattern in ${CONSTELLATIONS[a.con][0]}` : 'Star pattern',
        keys: words(a.name, a.aka ?? []),
        boost: 10,
        asterism: a,
      });
    }
  }

  for (const obs of observationsRef) {
    entries.push({ type: 'observation', label: obs.entry.short, sub: obs.entry.telescope, keys: words(obs.entry.short, obs.entry.title), boost: 2, obs });
  }
  return entries;
}

new SkySearch(document.querySelector('.search'), document.querySelector('.search-button'), {
  buildIndex: buildSearchIndex,
  onPick: (entry) => {
    hideConToast();
    if (entry.indian) setIndianSky(true);
    if (entry.type === 'constellation') showConstellation(entry.abbr);
    else if (entry.type === 'asterism') showAsterism(entry.asterism);
    else if (entry.type === 'observation') goToObservation?.(entry.obs);
    else if (entry.index != null) select(entry.index);
  },
});

// The Indian sky: nakshatras, Saptarishi and Hindi constellation names
function setupIndianSky() {
  indianResolved = resolveIndianSky(field);
  indianSky = new IndianSky(document.querySelector('.indian-layer'), field, indianResolved);
  scene.add(indianSky.ecliptic);
  indianToggle.hidden = false;
  indianToggle.addEventListener('click', () => setIndianSky(indianToggle.getAttribute('aria-pressed') !== 'true'));
}

// Moments on the time slider that come from the catalog itself
function addDataMoments() {
  const f = field.fieldIndex;
  const i = field.rows.findIndex((r) => r[f.hip] === 71683);
  if (i < 0) return;
  const c = field.closestApproach(i);
  if (!c || Math.abs(EPOCH + c.t - currentYear()) > 100000) return;
  timebar.addMoment({
    year: Math.round((EPOCH + c.t) / 100) * 100,
    label: `Alpha Centauri passes closest, ${c.distLy.toFixed(1)} light-years away`,
  });
}

// Which bright star, if any, sits near the celestial pole at the shown time
function poleStarText(year) {
  if (!field) return '';
  const { north } = polesAt(year);
  let best = -1;
  let bestAngle = Infinity;
  const limit = Math.min(field.count, 600);
  for (let i = 0; i < limit; i++) {
    if (field.stateAt(i).mag > 3.6) continue;
    const d = north.x * field.dirs[i * 3] + north.y * field.dirs[i * 3 + 1] + north.z * field.dirs[i * 3 + 2];
    const a = Math.acos(Math.min(1, d)) * (180 / Math.PI);
    if (a < bestAngle) {
      bestAngle = a;
      best = i;
    }
  }
  if (best < 0 || bestAngle > 6) return 'No bright North Star in this era';
  const name = describeStar(getStar(field, best)).name;
  return `North Star: ${name} · ${bestAngle < 1 ? 'under 1°' : `${bestAngle.toFixed(0)}°`} from the pole`;
}

let lastPoleUpdate = 0;
function applyTime(offset, now) {
  const year = currentYear() + offset;
  if (appliedOffset === null || Math.abs(offset - appliedOffset) >= 0.5) {
    appliedOffset = offset;
    field.setYears(year - EPOCH);
    constellations?.followStars(field.dirs);
    // Official boundaries are a modern convention; fade them away from today
    const away = Math.abs(offset);
    constellations?.setBoundaryFade(1 - Math.min(1, Math.max(0, (away - 300) / 1200)));
    updateThen(offset);
  }
  if (timebar.isOpen && now - lastPoleUpdate > 200) {
    lastPoleUpdate = now;
    timebar.render(offset, poleStarText(year));
  }
}

function updateThen(offset) {
  if (selected < 0) return;
  if (Math.abs(offset) < 50) {
    panel.setThen(null);
    return;
  }
  const s = field.stateAt(selected);
  const era = formatEra(currentYear() + offset);
  const parts = [];
  if (s.distLy != null) parts.push(`${s.distLy < 20 ? s.distLy.toFixed(1) : Math.round(s.distLy).toLocaleString('en-US')} light-years away`);
  parts.push(`magnitude ${s.mag.toFixed(1)}`);
  panel.setThen(`In ${era}: ${parts.join(', ')}.`);
}

function updatePoleMarkers() {
  const show = timebar.isOpen;
  const { north, south } = polesAt(currentYear() + timeOffset);
  for (const [key, dir] of [['north', north], ['south', south]]) {
    const node = poleMarkers[key];
    if (!node) continue;
    const v = dir.clone().multiplyScalar(99);
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    if (!show || v.dot(forward) <= 0) {
      node.classList.remove('is-visible');
      continue;
    }
    v.project(camera);
    node.classList.add('is-visible');
    node.style.transform = `translate(${((v.x * 0.5 + 0.5) * window.innerWidth).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * window.innerHeight).toFixed(1)}px)`;
  }
}

let goToObservation = null;

// Guide and guided tour
const hipIndex = (hip) => {
  const f = field.fieldIndex;
  return field.rows.findIndex((r) => r[f.hip] === hip);
};
const brightestIn = (abbr) => {
  const f = field.fieldIndex;
  return field.rows.findIndex((r) => r[f.con] === abbr);
};

let tour = null;

function setupGuide(observations) {
  const asterisms = resolveAsterisms(field);
  const sections = HIGHLIGHTS.map((section) => {
    let items;
    if (section.items === 'asterisms') {
      items = asterisms.map((a) => ({ kind: 'asterism', label: a.name, sub: a.con ? `In ${CONSTELLATIONS[a.con][0]}` : 'Across constellations', asterism: a }));
    } else if (section.items === 'observations') {
      items = observations.map((o) => ({ kind: 'observation', label: o.entry.short, sub: o.entry.telescope, obs: o, thumb: o.entry }));
    } else {
      items = section.items
        .map((it) => (it.kind === 'star' ? { ...it, index: hipIndex(it.hip) } : it))
        .filter((it) => it.kind !== 'star' || it.index >= 0);
    }
    return { title: section.title, items };
  });

  const button = document.querySelector('.guide-button');
  new GuideList(button, document.querySelector('.guide-list'), sections, {
    onPick: (item) => {
      hideConToast();
      if (item.kind === 'star') select(item.index);
      else if (item.kind === 'constellation') showConstellation(item.abbr);
      else if (item.kind === 'asterism') showAsterism(item.asterism);
      else if (item.kind === 'observation') goToObservation?.(item.obs);
    },
    onTour: () => startTour(),
    onToggleMarkers: (on) => markers.setVisible(on),
  });
  button.hidden = false;

  const stops = TOUR.map((stop) => {
    if (stop.kind === 'star') return { ...stop, index: hipIndex(stop.hip) };
    if (stop.kind === 'asterism') return { ...stop, asterism: asterisms.find((a) => a.name === stop.name) };
    if (stop.kind === 'observation') return { ...stop, obs: observations.find((o) => o.entry.id === stop.id) };
    return stop;
  }).filter((s) => (s.kind === 'star' ? s.index >= 0 : s.kind === 'asterism' ? s.asterism : s.kind === 'observation' ? s.obs : true));

  // Keep each stop clear of the tour card: beside it on wide screens, above it on narrow ones
  const tourView = () =>
    window.innerWidth >= 900 ? { offsetX: 0.18, offsetY: 0, fovScale: 1.35 } : { offsetX: 0, offsetY: 0.24, fovScale: 1.25 };

  tour = new TourCard(document.querySelector('.tour'), stops, {
    onStop: (stop) => {
      hideConToast();
      sound.glint();
      const view = tourView();
      if (stop.kind === 'constellation') showConstellation(stop.abbr, { toast: false, view });
      else if (stop.kind === 'star') showStars([stop.index], field.rows[stop.index][field.fieldIndex.con], { minFov: 40, view });
      else if (stop.kind === 'asterism') showStars(stop.asterism.indices, stop.asterism.con, { view });
      else if (stop.kind === 'observation') {
        panel.close();
        focus.setFocus(-1);
        markers.setVisible(true);
        controls.flyTo(stop.obs.ra, stop.obs.dec, { fov: 28, offsetX: view.offsetX, offsetY: view.offsetY });
      } else {
        panel.close();
        focus.setFocus(-1);
        controls.flyTo(84, 2, { fov: 75, offsetX: view.offsetX, offsetY: view.offsetY });
      }
    },
    onMore: (stop) => {
      if (stop.kind === 'star') select(stop.index);
      else if (stop.kind === 'observation') goToObservation?.(stop.obs);
      else if (stop.kind === 'constellation') {
        const i = brightestIn(stop.abbr);
        if (i >= 0) select(i);
      }
    },
    onEnd: () => {
      clearPattern();
      if (selected < 0) focus.setFocus(-1);
    },
  });
}

function startTour() {
  if (!tour) return;
  if (timebar.isOpen) timebar.close();
  hint?.classList.add('is-hidden');
  tour.start();
}

function setupObservations() {
  const observations = resolveObservations(field);
  observationsRef = observations;
  if (!observations.length) return;
  const goTo = (obs) => {
    // Centre the view on the object itself; the panel shows its nearest bright star
    select(obs.index, { center: { ra: obs.ra, dec: obs.dec } });
    setTimeout(() => {
      document.querySelector('.panel-images')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 700);
  };
  goToObservation = goTo;
  markers = new ObservationMarkers(document.querySelector('.markers'), observations, goTo, field);
  setupGuide(observations);
}

function updateRing() {
  if (selected < 0) return;
  const p = projectToScreen(field, selected, camera, window.innerWidth, window.innerHeight);
  if (!p) {
    ring.style.opacity = '0';
    return;
  }
  ring.style.opacity = '';
  ring.style.transform = `translate(${p.x}px, ${p.y}px)`;
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(pixelRatio());
  renderer.setSize(window.innerWidth, window.innerHeight);
  field?.setPixelRatio(pixelRatio());
}
window.addEventListener('resize', resize);

const timer = new THREE.Timer();
timer.connect(document);
renderer.setAnimationLoop((time) => {
  timer.update(time);
  const dt = Math.min(timer.getDelta(), 0.1);
  controls.update(dt);
  focus.update(dt);
  timeOffset = timebar.update(dt);
  document.body.classList.toggle('is-dragging-sky', controls.pointers.size > 0);
  if (field) applyTime(timeOffset, time);
  field?.update(dt, camera.fov, focus);
  milkyWay.update(dt, focus);
  constellations?.update(focus, camera.fov);
  labels?.update(camera, focus, window.innerWidth, window.innerHeight);
  markers?.update(camera, window.innerWidth, window.innerHeight, focus.dim);
  indianSky?.update(camera, window.innerWidth, window.innerHeight, dt, focus.dim);
  updateRing();
  updatePattern();
  updatePoleMarkers();
  renderer.render(scene, camera);
});

loadSky();
