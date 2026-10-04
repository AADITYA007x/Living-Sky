// Find any constellation, star, nakshatra or famous observation by name.

const normalize = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’'`".,()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const TYPE_LABEL = {
  constellation: 'Constellation',
  asterism: 'Star pattern',
  star: 'Star',
  nakshatra: 'Nakshatra',
  rishi: 'Saptarishi',
  observation: 'Famous observation',
};

function score(entry, q) {
  let best = 0;
  for (const key of entry.keys) {
    let s = 0;
    if (key === q) s = 100;
    else if (key.startsWith(q)) s = 80 - Math.min(20, key.length - q.length);
    else if (key.split(' ').some((w) => w.startsWith(q))) s = 60;
    else if (q.length >= 3 && key.includes(q)) s = 40;
    if (s > best) best = s;
  }
  return best ? best + (entry.boost ?? 0) : 0;
}

export class SkySearch {
  constructor(root, button, { onPick, buildIndex }) {
    this.root = root;
    this.button = button;
    this.onPick = onPick;
    this.buildIndex = buildIndex;
    this.entries = null;
    this.results = [];
    this.active = 0;

    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Search the sky');
    root.innerHTML = `
      <div class="search-box">
        <div class="search-field">
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M12.6 12.6L17 17" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
          <input class="search-input" type="search" placeholder="Orion, Big Dipper, Sirius, Rohini…" autocomplete="off" spellcheck="false" aria-label="Search stars and constellations" />
        </div>
        <ul class="search-results" role="listbox" aria-label="Results"></ul>
        <p class="search-empty" hidden>Nothing in the sky by that name.</p>
        <p class="search-tip">Try a constellation, a star, an Indian name, or a famous observation.</p>
      </div>
    `;
    this.input = root.querySelector('.search-input');
    this.list = root.querySelector('.search-results');
    this.empty = root.querySelector('.search-empty');
    this.tip = root.querySelector('.search-tip');

    button.addEventListener('click', () => this.open());
    root.addEventListener('pointerdown', (e) => {
      if (e.target === root) this.close();
    });
    this.input.addEventListener('input', () => this.run());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.setActive(this.active + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.setActive(this.active - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (this.results[this.active]) this.pick(this.results[this.active]);
      }
    });

    window.addEventListener(
      'keydown',
      (e) => {
        if (this.isOpen && e.key === 'Escape') {
          e.stopPropagation();
          this.close();
          return;
        }
        const typing = e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable]');
        if (!this.isOpen && !typing && (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'))) {
          e.preventDefault();
          this.open();
        }
      },
      true,
    );
  }

  get isOpen() {
    return this.root.classList.contains('is-open');
  }

  open() {
    if (!this.entries) this.entries = this.buildIndex();
    this.root.classList.add('is-open');
    this.button.setAttribute('aria-expanded', 'true');
    this.input.value = '';
    this.run();
    setTimeout(() => this.input.focus({ preventScroll: true }), 50);
  }

  close() {
    this.root.classList.remove('is-open');
    this.button.setAttribute('aria-expanded', 'false');
  }

  run() {
    const q = normalize(this.input.value);
    this.tip.hidden = Boolean(q);
    if (!q) {
      this.results = [];
      this.render();
      return;
    }
    this.results = this.entries
      .map((e) => ({ e, s: score(e, q) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 8)
      .map((r) => r.e);
    this.render();
    this.empty.hidden = this.results.length > 0;
  }

  render() {
    this.active = 0;
    this.empty.hidden = true;
    this.list.replaceChildren(
      ...this.results.map((entry, i) => {
        const li = document.createElement('li');
        li.className = 'search-item';
        li.setAttribute('role', 'option');
        li.innerHTML = '<span class="search-item-main"><span class="search-item-label"></span><span class="search-item-sub"></span></span><span class="search-item-type"></span>';
        li.querySelector('.search-item-label').textContent = entry.label;
        if (entry.deva) {
          const d = document.createElement('span');
          d.className = 'search-item-deva';
          d.textContent = entry.deva;
          li.querySelector('.search-item-label').append(' ', d);
        }
        li.querySelector('.search-item-sub').textContent = entry.sub ?? '';
        li.querySelector('.search-item-type').textContent = TYPE_LABEL[entry.type] ?? '';
        li.addEventListener('pointerenter', () => this.setActive(i));
        li.addEventListener('click', () => this.pick(entry));
        return li;
      }),
    );
    this.setActive(0);
  }

  setActive(i) {
    const items = [...this.list.children];
    if (!items.length) return;
    this.active = (i + items.length) % items.length;
    items.forEach((el, k) => el.setAttribute('aria-selected', String(k === this.active)));
    items[this.active].scrollIntoView({ block: 'nearest' });
  }

  pick(entry) {
    this.close();
    this.onPick(entry);
  }
}

export { normalize };
