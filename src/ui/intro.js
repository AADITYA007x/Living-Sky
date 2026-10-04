// The opening screen. Choosing how to begin is also the click that
// browsers require before any sound can play.

export function showIntro(root, { onBegin }) {
  const withSound = root.querySelector('[data-begin="sound"]');
  const silent = root.querySelector('[data-begin="silent"]');

  const begin = (sound) => {
    root.classList.add('is-leaving');
    root.setAttribute('aria-hidden', 'true');
    setTimeout(() => root.remove(), 1400);
    onBegin(sound);
  };

  withSound?.addEventListener('click', () => begin(true));
  silent?.addEventListener('click', () => begin(false));
  requestAnimationFrame(() => root.classList.add('is-visible'));
  setTimeout(() => withSound?.focus({ preventScroll: true }), 1200);
}
