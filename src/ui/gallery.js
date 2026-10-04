// Full-view lightbox for curated observatory images, with a before/after
// comparison slider when an entry has two images.

const imageUrl = (file) => `${import.meta.env.BASE_URL}images/curated/${file}`;

export class Gallery {
  constructor(root) {
    this.root = root;
    this.returnFocus = null;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-hidden', 'true');

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
    this.root.addEventListener('click', (e) => {
      if (e.target === this.root) this.close();
    });
  }

  get isOpen() {
    return this.root.classList.contains('is-open');
  }

  open(entry) {
    this.returnFocus = document.activeElement;
    this.root.setAttribute('aria-label', entry.title);
    this.root.innerHTML = `
      <button class="gallery-close" type="button" aria-label="Close image">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
      </button>
      <figure class="gallery-figure">
        <div class="gallery-media"><div class="gallery-frame"></div></div>
        <figcaption class="gallery-caption">
          <p class="gallery-scope"></p>
          <h3 class="gallery-title"></h3>
          <p class="gallery-text"></p>
          <p class="gallery-credit">
            Credit: <span class="gallery-credit-name"></span>.
            <a class="gallery-source" target="_blank" rel="noopener">Source</a>,
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>
          </p>
        </figcaption>
      </figure>
    `;
    this.root.querySelector('.gallery-title').textContent = entry.title;
    this.root.querySelector('.gallery-scope').textContent = entry.telescope ?? '';
    this.root.querySelector('.gallery-text').textContent = entry.caption;
    this.root.querySelector('.gallery-credit-name').textContent = entry.credit;
    this.root.querySelector('.gallery-source').href = entry.source;
    const close = this.root.querySelector('.gallery-close');
    close.addEventListener('click', () => this.close());

    const frame = this.root.querySelector('.gallery-frame');
    if (entry.compare) this.buildCompare(frame, entry);
    else this.buildSingle(frame, entry);

    this.root.classList.add('is-open');
    this.root.setAttribute('aria-hidden', 'false');
    close.focus({ preventScroll: true });
  }

  buildSingle(frame, entry) {
    const img = document.createElement('img');
    img.className = 'gallery-img';
    img.alt = entry.title;
    img.addEventListener('load', () => img.classList.add('is-loaded'));
    img.src = imageUrl(entry.file);
    frame.append(img);
  }

  buildCompare(frame, entry) {
    const [before, after] = entry.compare;
    frame.classList.add('is-compare');
    if (entry.compareHint) {
      const hint = document.createElement('p');
      hint.className = 'compare-hint';
      hint.textContent = entry.compareHint;
      frame.before(hint);
    }
    frame.innerHTML = `
      <img class="gallery-img compare-before" alt="" />
      <img class="gallery-img compare-after" alt="" />
      <span class="compare-divider" aria-hidden="true"></span>
      <span class="compare-label compare-label-before"></span>
      <span class="compare-label compare-label-after"></span>
      <input class="compare-range" type="range" min="0" max="100" value="50" />
    `;
    const imgBefore = frame.querySelector('.compare-before');
    const imgAfter = frame.querySelector('.compare-after');
    imgBefore.alt = `${entry.title}: ${before.label}`;
    imgAfter.alt = `${entry.title}: ${after.label}`;
    frame.querySelector('.compare-label-before').textContent = before.label;
    frame.querySelector('.compare-label-after').textContent = after.label;
    const range = frame.querySelector('.compare-range');
    range.setAttribute('aria-label', `Compare ${before.label} and ${after.label}`);

    for (const img of [imgBefore, imgAfter]) img.addEventListener('load', () => img.classList.add('is-loaded'));
    imgBefore.src = imageUrl(before.file);
    imgAfter.src = imageUrl(after.file);

    const set = (v) => frame.style.setProperty('--split', `${v}%`);
    set(range.value);
    range.addEventListener('input', () => set(range.value));
  }

  close() {
    if (!this.isOpen) return;
    this.root.classList.remove('is-open');
    this.root.setAttribute('aria-hidden', 'true');
    this.returnFocus?.focus?.({ preventScroll: true });
  }
}

export function thumbnailUrl(entry) {
  return imageUrl(entry.compare ? entry.compare[1].file : entry.file);
}
