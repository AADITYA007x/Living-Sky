import { LIMIT, MOMENTS, sliderToOffset, offsetToSlider, formatEra, describeOffset, currentYear } from '../sky/timetravel.js';

const FLOW_YEARS_PER_SECOND = 1500;

// The time machine: one slider that moves the sky through ±100,000 years.
export class TimeBar {
  constructor(root, button, { onOpen, onClose, onMoment } = {}) {
    this.root = root;
    this.button = button;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.onMoment = onMoment;
    this.target = 0; // years from now
    this.shown = 0; // eased value actually displayed
    this.flow = 0; // -1 backward, 0 paused, 1 forward
    this.moments = [...MOMENTS];
    this.build();
    button.addEventListener('click', () => (this.isOpen ? this.close() : this.open()));
  }

  get isOpen() {
    return this.root.classList.contains('is-open');
  }

  // Add a moment computed from the data, such as a star's closest approach
  addMoment(m) {
    this.moments.push(m);
    this.moments.sort((a, b) => a.year - b.year);
    this.renderMoments();
  }

  build() {
    const r = this.root;
    r.setAttribute('aria-label', 'Time machine');
    r.innerHTML = `
      <div class="tb-top">
        <div class="tb-head">
          <p class="tb-era">Tonight</p>
          <p class="tb-sub"></p>
        </div>
        <button class="tb-min" type="button" aria-expanded="true" aria-label="Minimize time machine">
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
      <p class="tb-pole"></p>
      <div class="tb-body">
        <div class="tb-track">
          <span class="tb-now" aria-hidden="true"></span>
          <div class="tb-moments"></div>
          <input class="tb-range" type="range" min="-1000" max="1000" step="1" value="0" aria-label="Year" />
        </div>
        <div class="tb-scale" aria-hidden="true">
          <span>${LIMIT.toLocaleString('en-US')} years ago</span>
          <span>Now</span>
          <span>${LIMIT.toLocaleString('en-US')} years ahead</span>
        </div>
        <div class="tb-actions">
          <button class="tb-flow" type="button" data-dir="-1" aria-pressed="false">
            <svg class="icon-play" viewBox="0 0 20 20" width="13" height="13" aria-hidden="true"><path d="M14 4.5v11L5 10z" fill="currentColor"/></svg>
            <svg class="icon-pause" viewBox="0 0 20 20" width="13" height="13" aria-hidden="true"><path d="M6 4.5h2.6v11H6zM11.4 4.5H14v11h-2.6z" fill="currentColor"/></svg>
            <span>Flow back</span>
          </button>
          <button class="tb-flow" type="button" data-dir="1" aria-pressed="false">
            <svg class="icon-play" viewBox="0 0 20 20" width="13" height="13" aria-hidden="true"><path d="M6 4.5v11l9-5.5z" fill="currentColor"/></svg>
            <svg class="icon-pause" viewBox="0 0 20 20" width="13" height="13" aria-hidden="true"><path d="M6 4.5h2.6v11H6zM11.4 4.5H14v11h-2.6z" fill="currentColor"/></svg>
            <span>Flow forward</span>
          </button>
          <button class="tb-reset" type="button">Tonight</button>
          <button class="tb-info" type="button" aria-expanded="false" aria-label="About accuracy">i</button>
        </div>
        <p class="tb-note" hidden>Star motions measured by the Hipparcos satellite, extended in straight lines. Tens of thousands of years away this becomes an approximation.</p>
      </div>
    `;
    this.era = r.querySelector('.tb-era');
    this.sub = r.querySelector('.tb-sub');
    this.range = r.querySelector('.tb-range');
    this.pole = r.querySelector('.tb-pole');
    this.momentsEl = r.querySelector('.tb-moments');
    this.flowBtns = [...r.querySelectorAll('.tb-flow')];

    this.range.addEventListener('input', () => {
      this.setFlow(0);
      this.target = sliderToOffset(Number(this.range.value) / 1000);
    });
    for (const b of this.flowBtns) {
      const dir = Number(b.dataset.dir);
      b.addEventListener('click', () => this.setFlow(this.flow === dir ? 0 : dir));
    }
    r.querySelector('.tb-reset').addEventListener('click', () => this.goTo(0));

    const minBtn = r.querySelector('.tb-min');
    minBtn.addEventListener('click', () => {
      const min = !r.classList.contains('is-min');
      r.classList.toggle('is-min', min);
      minBtn.setAttribute('aria-expanded', String(!min));
      minBtn.setAttribute('aria-label', min ? 'Expand time machine' : 'Minimize time machine');
    });

    const info = r.querySelector('.tb-info');
    const note = r.querySelector('.tb-note');
    info.addEventListener('click', () => {
      note.hidden = !note.hidden;
      info.setAttribute('aria-expanded', String(!note.hidden));
    });
    this.renderMoments();
  }

  renderMoments() {
    const now = currentYear();
    this.momentsEl.replaceChildren(
      ...this.moments.map((m) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'tb-moment';
        const u = offsetToSlider(m.year - now);
        b.style.left = `${((u + 1) / 2) * 100}%`;
        b.setAttribute('aria-label', `${m.label}, ${formatEra(m.year)}`);
        b.innerHTML = '<span class="tb-moment-dot" aria-hidden="true"></span><span class="tb-moment-tip"></span>';
        b.querySelector('.tb-moment-tip').textContent = `${m.label} · ${formatEra(m.year)}`;
        b.addEventListener('click', () => {
          this.goTo(m.year - currentYear());
          this.onMoment?.(m);
        });
        return b;
      }),
    );
  }

  goTo(offset) {
    this.setFlow(0);
    this.target = Math.max(-LIMIT, Math.min(LIMIT, offset));
    this.range.value = String(Math.round(offsetToSlider(this.target) * 1000));
  }

  // Let time run backward (-1) or forward (1), or pause (0)
  setFlow(dir) {
    // Starting from the far end of the slider, begin again from tonight
    if (dir === 1 && this.target >= LIMIT - 1) this.target = 0;
    if (dir === -1 && this.target <= -LIMIT + 1) this.target = 0;
    this.flow = dir;
    for (const b of this.flowBtns) {
      const mine = Number(b.dataset.dir) === dir;
      b.setAttribute('aria-pressed', String(mine));
      b.querySelector('span').textContent = mine ? 'Pause' : Number(b.dataset.dir) < 0 ? 'Flow back' : 'Flow forward';
    }
  }

  open() {
    this.root.classList.add('is-open');
    this.button.setAttribute('aria-expanded', 'true');
    this.onOpen?.();
  }

  // Closing always glides the sky back to tonight
  close() {
    this.root.classList.remove('is-open');
    this.button.setAttribute('aria-expanded', 'false');
    this.goTo(0);
    this.onClose?.();
  }

  // Advance the eased time; returns years from now currently shown
  update(dt) {
    if (this.flow) {
      this.target = Math.max(-LIMIT, Math.min(LIMIT, this.target + this.flow * FLOW_YEARS_PER_SECOND * dt));
      this.range.value = String(Math.round(offsetToSlider(this.target) * 1000));
      if (Math.abs(this.target) >= LIMIT) this.setFlow(0);
    }
    const diff = this.target - this.shown;
    // Ease more firmly across big jumps so long trips still feel smooth
    this.shown += diff * (1 - Math.exp(-dt * (this.flow ? 12 : 2.6)));
    if (Math.abs(diff) < 0.5) this.shown = this.target;
    return this.shown;
  }

  render(offset, poleText) {
    const year = currentYear() + offset;
    const near = Math.abs(offset) < 1;
    this.era.textContent = near ? 'Tonight' : formatEra(year);
    this.sub.textContent = near ? formatEra(year) : describeOffset(offset);
    this.pole.textContent = poleText ?? '';
    this.button.classList.toggle('is-away', !near);
  }
}
