import { formatDistance } from '../sky/describe.js';
import { thumbnailUrl } from './gallery.js';
import { temperatureToRGB } from '../sky/astro.js';

function visibilityPhrase(mag) {
  if (mag < 1) return 'One of the brightest stars in the sky';
  if (mag < 3) return 'Easy to see, even from a city';
  if (mag < 5) return 'Visible from a dark place';
  return 'At the edge of naked-eye visibility';
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export class StarPanel {
  constructor(root) {
    this.root = root;
    this.onClose = null;
    this.onLookCloser = null;
    this.onOpenImage = null;
    this.onTalk = null;
    this.root.setAttribute('aria-hidden', 'true');
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });
  }

  get isOpen() {
    return this.root.classList.contains('is-open');
  }

  show(info, { images = [], indian = [] } = {}) {
    const r = this.root;
    r.replaceChildren();

    const close = el('button', 'panel-close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
    close.addEventListener('click', () => this.close());

    const body = el('div', 'panel-body');
    const heading = el('div', 'panel-heading');
    if (info.temperature) {
      const [r, g, b] = temperatureToRGB(info.temperature).map((c) => Math.round((c * 0.85 + 0.15) * 255));
      const swatch = el('span', 'panel-swatch');
      swatch.style.setProperty('--star', `rgb(${r}, ${g}, ${b})`);
      swatch.setAttribute('aria-hidden', 'true');
      heading.append(swatch);
    }
    heading.append(el('h2', 'panel-name', info.name));
    body.append(heading);
    if (info.subtitle.length) body.append(el('p', 'panel-sub', info.subtitle.join(', in ')));
    if (info.origin) body.append(el('p', 'panel-origin', info.origin));
    if (info.lightYear) body.append(el('p', 'panel-light', info.lightYear));
    this.thenEl = el('p', 'panel-then');
    this.thenEl.hidden = true;
    body.append(this.thenEl);

    const actions = el('div', 'panel-actions');

    const talk = el('button', 'panel-action panel-talk');
    talk.type = 'button';
    talk.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M5 6.5h14v9H10l-4 3.5v-3.5H5z" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>';
    talk.append(el('span', null, `Talk to ${info.name}`));
    talk.addEventListener('click', () => this.onTalk?.());

    const look = el('button', 'panel-action panel-look');
    look.type = 'button';
    look.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.1"/><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.1"/></svg><span>Look through a telescope</span>';
    look.addEventListener('click', () => this.onLookCloser?.());

    actions.append(talk, look);
    body.append(actions);

    const facts = el('dl', 'panel-facts');
    const addFact = (label, value, note) => {
      if (!value) return;
      const row = el('div', 'fact');
      row.append(el('dt', null, label));
      const dd = el('dd', null, value);
      if (note) dd.append(el('span', 'fact-note', note));
      row.append(dd);
      facts.append(row);
    };

    addFact('Distance', formatDistance(info.distance), info.distance?.note);
    addFact('Type', info.type.label);
    addFact('Size', info.size?.text, info.size?.note);
    addFact(
      'Surface',
      info.temperature ? `About ${(Math.round(info.temperature / 100) * 100).toLocaleString('en-US')} K` : null,
      info.temperature ? 'Estimated from its color.' : null,
    );
    addFact('Brightness', `Magnitude ${info.magnitude.toFixed(2)}`, visibilityPhrase(info.magnitude));
    body.append(facts);

    if (info.fact) body.append(el('p', 'panel-fact', info.fact));

    if (indian.length) {
      const section = el('section', 'panel-indian');
      section.append(el('h3', 'panel-images-title', 'In the Indian sky'));
      for (const entry of indian) {
        const block = el('div', 'indian-entry');
        const head = el('p', 'indian-head');
        head.append(el('span', 'indian-deva', entry.deva), el('span', 'indian-name', entry.title));
        block.append(head, el('p', 'indian-text', entry.text));
        if (entry.note) block.append(el('p', 'indian-note', entry.note));
        if (entry.source) block.append(el('p', 'indian-note', 'Star identification after Basham (1954); some traditions differ.'));
        section.append(block);
      }
      body.append(section);
    }

    if (images.length) {
      const section = el('section', 'panel-images');
      section.append(el('h3', 'panel-images-title', 'Famous observations'));
      section.append(el('p', 'panel-images-intro', 'Photographed in detail by a major observatory.'));
      for (const entry of images) {
        const card = el('button', 'image-card');
        card.type = 'button';
        const img = el('img', 'image-card-thumb');
        img.alt = '';
        img.loading = 'lazy';
        img.addEventListener('error', () => card.remove());
        img.src = thumbnailUrl(entry);
        const text = el('span', 'image-card-text');
        text.append(el('span', 'image-card-title', entry.title), el('span', 'image-card-credit', entry.telescope));
        if (entry.compare) text.append(el('span', 'image-card-badge', 'Before and after'));
        if (!entry.hips) text.append(el('span', 'image-card-badge', 'In the sky next to this star'));
        card.append(img, text);
        card.addEventListener('click', () => this.onOpenImage?.(entry));
        section.append(card);
      }
      body.append(section);
    }

    const meta = [info.catalog, info.spect ? `spectral type ${info.spect}` : null].filter(Boolean).join(', ');
    body.append(el('p', 'panel-meta', meta));

    r.append(close, body);
    r.scrollTop = 0;
    r.setAttribute('aria-hidden', 'false');
    r.classList.add('is-open');
  }

  // A line describing the star at the time machine's chosen year
  setThen(text) {
    if (!this.thenEl) return;
    this.thenEl.hidden = !text;
    this.thenEl.textContent = text ?? '';
  }

  close() {
    if (!this.isOpen) return;
    this.root.classList.remove('is-open');
    this.root.setAttribute('aria-hidden', 'true');
    this.onClose?.();
  }
}
