import { formatDistance } from '../sky/describe.js';

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
    this.root.setAttribute('aria-hidden', 'true');
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });
  }

  get isOpen() {
    return this.root.classList.contains('is-open');
  }

  show(info) {
    const r = this.root;
    r.replaceChildren();

    const close = el('button', 'panel-close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
    close.addEventListener('click', () => this.close());

    const body = el('div', 'panel-body');
    body.append(el('h2', 'panel-name', info.name));
    if (info.subtitle.length) body.append(el('p', 'panel-sub', info.subtitle.join(', in ')));
    if (info.origin) body.append(el('p', 'panel-origin', info.origin));
    if (info.lightYear) body.append(el('p', 'panel-light', info.lightYear));

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

    const meta = [info.catalog, info.spect ? `spectral type ${info.spect}` : null].filter(Boolean).join(', ');
    body.append(el('p', 'panel-meta', meta));

    r.append(close, body);
    r.scrollTop = 0;
    r.setAttribute('aria-hidden', 'false');
    r.classList.add('is-open');
  }

  close() {
    if (!this.isOpen) return;
    this.root.classList.remove('is-open');
    this.root.setAttribute('aria-hidden', 'true');
    this.onClose?.();
  }
}
