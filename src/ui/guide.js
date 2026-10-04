import { thumbnailUrl } from './gallery.js';

// The Guide: a browsable list of highlights, and the starting point of the tour.
export class GuideList {
  constructor(button, popover, sections, { onPick, onTour, onToggleMarkers }) {
    this.button = button;
    this.popover = popover;

    popover.innerHTML = `
      <div class="obs-head">
        <h2 class="obs-title">Guide to the sky</h2>
        <p class="obs-intro">Not sure where to look? Take a short tour, or pick anything below.</p>
        <button class="guide-tour" type="button">
          <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path d="M6 4.5v11l9-5.5z" fill="currentColor"/></svg>
          <span>Take the guided tour</span>
        </button>
      </div>
      <div class="guide-sections"></div>
      <label class="obs-switch guide-switch">
        <input type="checkbox" checked />
        <span class="obs-switch-track" aria-hidden="true"><span></span></span>
        <span>Mark famous observations on the sky</span>
      </label>
    `;

    const holder = popover.querySelector('.guide-sections');
    for (const section of sections) {
      if (!section.items.length) continue;
      const details = document.createElement('details');
      details.className = 'guide-section';
      details.innerHTML = '<summary class="guide-summary"><span class="guide-summary-title"></span><span class="guide-count"></span></summary><ul class="obs-items"></ul>';
      details.querySelector('.guide-summary-title').textContent = section.title;
      details.querySelector('.guide-count').textContent = String(section.items.length);
      const list = details.querySelector('ul');
      for (const item of section.items) {
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `obs-item${item.thumb ? '' : ' is-plain'}`;
        b.innerHTML = '<span class="obs-item-text"><span class="obs-item-title"></span><span class="obs-item-scope"></span></span>';
        if (item.thumb) {
          const img = document.createElement('img');
          img.className = 'obs-thumb';
          img.alt = '';
          img.loading = 'lazy';
          img.src = thumbnailUrl(item.thumb);
          img.addEventListener('error', () => img.remove());
          b.prepend(img);
        }
        b.querySelector('.obs-item-title').textContent = item.label;
        b.querySelector('.obs-item-scope').textContent = item.sub ?? '';
        b.addEventListener('click', () => {
          this.close();
          onPick(item);
        });
        li.append(b);
        list.append(li);
      }
      holder.append(details);
    }
    holder.querySelector('details')?.setAttribute('open', '');

    popover.querySelector('.guide-tour').addEventListener('click', () => {
      this.close();
      onTour();
    });
    popover.querySelector('.guide-switch input').addEventListener('change', (e) => onToggleMarkers(e.target.checked));

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

// The guided tour: a calm caption card that walks through the sky step by step.
export class TourCard {
  constructor(root, stops, { onStop, onMore, onEnd }) {
    this.root = root;
    this.stops = stops;
    this.onStop = onStop;
    this.onMore = onMore;
    this.onEnd = onEnd;
    this.index = -1;

    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'Guided tour');
    root.innerHTML = `
      <div class="tour-top">
        <p class="tour-step"></p>
        <button class="tour-close" type="button" aria-label="End tour">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        </button>
      </div>
      <h2 class="tour-title"></h2>
      <p class="tour-text" aria-live="polite"></p>
      <div class="tour-dots" aria-hidden="true"></div>
      <div class="tour-actions">
        <button class="tour-prev" type="button">Back</button>
        <button class="tour-more" type="button"></button>
        <button class="tour-next" type="button">Next</button>
      </div>
    `;
    this.stepEl = root.querySelector('.tour-step');
    this.titleEl = root.querySelector('.tour-title');
    this.textEl = root.querySelector('.tour-text');
    this.dots = root.querySelector('.tour-dots');
    this.prev = root.querySelector('.tour-prev');
    this.next = root.querySelector('.tour-next');
    this.more = root.querySelector('.tour-more');
    this.dots.innerHTML = stops.map(() => '<span></span>').join('');

    this.prev.addEventListener('click', () => this.go(this.index - 1));
    this.next.addEventListener('click', () => (this.index >= stops.length - 1 ? this.end() : this.go(this.index + 1)));
    this.more.addEventListener('click', () => this.onMore?.(this.stops[this.index]));
    root.querySelector('.tour-close').addEventListener('click', () => this.end());

    window.addEventListener('keydown', (e) => {
      // Another overlay already handled this key (it stopped propagation)
      if (!this.isOpen || e.cancelBubble) return;
      const typing = e.target instanceof HTMLElement && e.target.closest('input, textarea');
      if (typing || document.querySelector('.panel.is-open, .scope.is-open, .gallery.is-open, .chat.is-open, .search.is-open')) return;
      if (e.key === 'ArrowRight') this.next.click();
      else if (e.key === 'ArrowLeft' && this.index > 0) this.prev.click();
      else if (e.key === 'Escape') this.end();
    }, true);
  }

  get isOpen() {
    return this.root.classList.contains('is-open');
  }

  start() {
    this.root.classList.add('is-open');
    document.body.classList.add('is-touring');
    this.go(0);
  }

  go(i) {
    if (i < 0 || i >= this.stops.length) return;
    this.index = i;
    const stop = this.stops[i];
    this.root.classList.remove('is-changing');
    void this.root.offsetWidth;
    this.root.classList.add('is-changing');
    this.stepEl.textContent = `${i + 1} of ${this.stops.length}`;
    this.titleEl.textContent = stop.title;
    this.textEl.textContent = stop.text;
    [...this.dots.children].forEach((d, k) => d.classList.toggle('is-on', k <= i));
    this.prev.disabled = i === 0;
    this.next.textContent = i === this.stops.length - 1 ? 'Finish' : 'Next';
    const moreLabel = { star: 'About this star', observation: 'See the photograph', constellation: 'Brightest star' }[stop.kind];
    this.more.hidden = !moreLabel;
    this.more.textContent = moreLabel ?? '';
    this.onStop(stop);
  }

  end() {
    this.root.classList.remove('is-open');
    document.body.classList.remove('is-touring');
    this.index = -1;
    this.onEnd?.();
  }
}
