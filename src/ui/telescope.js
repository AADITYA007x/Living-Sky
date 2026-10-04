// Real survey imagery around a star, from the CDS hips2fits cutout service.

const ENDPOINTS = [
  'https://alasky.cds.unistra.fr/hips-image-services/hips2fits',
  'https://alaskybis.cds.unistra.fr/hips-image-services/hips2fits',
];

const SURVEYS = {
  visible: {
    hips: 'CDS/P/DSS2/color',
    label: 'Visible light',
    credit: 'Digitized Sky Survey 2 (STScI, Palomar, UK Schmidt), color HiPS by CDS',
  },
  infrared: {
    hips: 'CDS/P/2MASS/color',
    label: 'Infrared',
    credit: 'Two Micron All Sky Survey (UMass, IPAC/Caltech, NASA, NSF), color HiPS by CDS',
  },
};

const FIELDS = [
  { id: 'wide', deg: 3, label: 'Wide' },
  { id: 'close', deg: 1, label: 'Close' },
  { id: 'closer', deg: 0.25, label: 'Closer' },
];

const MOON_DEG = 0.52;

function cutoutUrl(endpoint, { hips, ra, dec, fov, size }) {
  const q = new URLSearchParams({
    hips,
    width: String(size),
    height: String(size),
    fov: String(fov),
    projection: 'TAN',
    coordsys: 'icrs',
    ra: ra.toFixed(6),
    dec: dec.toFixed(6),
    format: 'jpg',
  });
  return `${endpoint}?${q}`;
}

function aladinUrl({ hips, ra, dec, fov }) {
  const q = new URLSearchParams({ target: `${ra.toFixed(5)} ${dec.toFixed(5)}`, fov: String(fov), survey: hips });
  return `https://aladin.cds.unistra.fr/AladinLite/?${q}`;
}

function moonPhrase(deg) {
  const moons = deg / MOON_DEG;
  if (moons >= 1.5) return `about ${Math.round(moons)} full Moons across`;
  if (moons >= 0.8) return 'about one full Moon across';
  if (moons >= 0.4) return 'about half a full Moon across';
  return 'smaller than half a full Moon';
}

export class Telescope {
  constructor(root) {
    this.root = root;
    this.target = null;
    this.survey = 'visible';
    this.field = 'close';
    this.requestId = 0;
    this.returnFocus = null;
    this.build();

    window.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          e.stopPropagation();
          this.close();
        }
      },
      true,
    );
  }

  get isOpen() {
    return this.root.classList.contains('is-open');
  }

  build() {
    const r = this.root;
    r.setAttribute('role', 'dialog');
    r.setAttribute('aria-modal', 'true');
    r.setAttribute('aria-label', 'Telescope view');
    r.innerHTML = `
      <button class="scope-close" type="button" aria-label="Close telescope view">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
      </button>
      <figure class="scope-figure">
        <div class="scope-eyepiece">
          <div class="scope-loading" aria-hidden="true"></div>
          <img class="scope-img" alt="" />
          <p class="scope-error" hidden>The survey image could not be loaded. Try again in a moment.</p>
        </div>
        <figcaption class="scope-caption">
          <span class="scope-name"></span>
          <span class="scope-scale"></span>
        </figcaption>
      </figure>
      <div class="scope-controls">
        <div class="scope-group" role="group" aria-label="Field of view">
          ${FIELDS.map((f) => `<button type="button" data-field="${f.id}">${f.label}</button>`).join('')}
        </div>
        <div class="scope-group" role="group" aria-label="Wavelength">
          ${Object.entries(SURVEYS).map(([id, s]) => `<button type="button" data-survey="${id}">${s.label}</button>`).join('')}
        </div>
      </div>
      <p class="scope-credit">
        <span class="scope-credit-text"></span>.
        Cutout from <a href="https://alasky.cds.unistra.fr/hips-image-services/hips2fits" target="_blank" rel="noopener">CDS hips2fits</a>.
        <a class="scope-aladin" target="_blank" rel="noopener">Explore freely in Aladin Lite</a>
      </p>
    `;

    this.img = r.querySelector('.scope-img');
    this.loading = r.querySelector('.scope-loading');
    this.error = r.querySelector('.scope-error');
    this.nameEl = r.querySelector('.scope-name');
    this.scaleEl = r.querySelector('.scope-scale');
    this.creditEl = r.querySelector('.scope-credit-text');
    this.aladinEl = r.querySelector('.scope-aladin');
    this.closeBtn = r.querySelector('.scope-close');

    this.closeBtn.addEventListener('click', () => this.close());
    r.addEventListener('click', (e) => {
      if (e.target === r) this.close();
    });
    r.querySelectorAll('[data-field]').forEach((b) =>
      b.addEventListener('click', () => {
        this.field = b.dataset.field;
        this.load();
      }),
    );
    r.querySelectorAll('[data-survey]').forEach((b) =>
      b.addEventListener('click', () => {
        this.survey = b.dataset.survey;
        this.load();
      }),
    );
    this.img.addEventListener('load', () => {
      this.loading.classList.remove('is-active');
      this.img.classList.add('is-loaded');
    });
    this.img.addEventListener('error', () => this.onError());
  }

  open(target) {
    this.target = target;
    this.returnFocus = document.activeElement;
    this.root.classList.add('is-open');
    this.root.setAttribute('aria-hidden', 'false');
    this.load();
    this.closeBtn.focus({ preventScroll: true });
  }

  close() {
    if (!this.isOpen) return;
    this.root.classList.remove('is-open');
    this.root.setAttribute('aria-hidden', 'true');
    this.requestId++;
    this.returnFocus?.focus?.({ preventScroll: true });
  }

  load(endpointIndex = 0) {
    if (!this.target) return;
    const field = FIELDS.find((f) => f.id === this.field);
    const survey = SURVEYS[this.survey];
    const { ra, dec, name } = this.target;

    this.root.querySelectorAll('[data-field]').forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.field === this.field)),
    );
    this.root.querySelectorAll('[data-survey]').forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.survey === this.survey)),
    );

    this.nameEl.textContent = name;
    this.scaleEl.textContent = `${field.deg >= 1 ? `${field.deg}°` : `${field.deg * 60}′`} field, ${moonPhrase(field.deg)}`;
    this.creditEl.textContent = survey.credit;
    this.aladinEl.href = aladinUrl({ hips: survey.hips, ra, dec, fov: field.deg });
    this.img.alt = `${survey.label} survey image of the sky around ${name}, ${field.deg} degrees across`;

    const box = this.root.querySelector('.scope-eyepiece').getBoundingClientRect();
    const size = Math.min(1200, Math.max(400, Math.round((box.width || 600) * Math.min(window.devicePixelRatio, 2))));

    this.endpointIndex = endpointIndex;
    const id = ++this.requestId;
    this.error.hidden = true;
    this.img.classList.remove('is-loaded');
    this.loading.classList.add('is-active');

    const url = cutoutUrl(ENDPOINTS[endpointIndex], { hips: survey.hips, ra, dec, fov: field.deg, size });
    // Let the fade-out finish before swapping the image
    setTimeout(() => {
      if (id !== this.requestId) return;
      if (this.img.src === url && this.img.complete && this.img.naturalWidth > 0) {
        this.loading.classList.remove('is-active');
        this.img.classList.add('is-loaded');
      } else {
        this.img.src = url;
      }
    }, 250);
  }

  onError() {
    if (!this.isOpen) return;
    if (this.endpointIndex < ENDPOINTS.length - 1) {
      this.load(this.endpointIndex + 1);
      return;
    }
    this.loading.classList.remove('is-active');
    this.error.hidden = false;
  }
}
