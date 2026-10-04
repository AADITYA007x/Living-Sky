// Now and then, a faint meteor streaks across the screen.
// Meteors burn up in Earth's atmosphere, so they are drawn on the screen
// rather than fixed among the stars.

const rand = (a, b) => a + Math.random() * (b - a);

export class Meteors {
  constructor(canvas, { onMeteor } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onMeteor = onMeteor;
    this.active = null;
    this.paused = false;
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    if (!this.reduced) this.schedule(rand(12000, 25000));
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.canvas.width = Math.round(window.innerWidth * dpr);
    this.canvas.height = Math.round(window.innerHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  schedule(ms) {
    setTimeout(() => {
      if (!document.hidden && !this.paused) this.launch();
      this.schedule(rand(30000, 75000));
    }, ms);
  }

  launch() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const angle = rand(0.35, 0.75) * (Math.random() < 0.5 ? 1 : -1);
    const dir = { x: Math.sign(angle) * Math.cos(Math.abs(angle)), y: Math.sin(Math.abs(angle)) };
    this.active = {
      x: rand(w * 0.15, w * 0.85),
      y: rand(h * 0.05, h * 0.45),
      dir,
      length: rand(140, 260),
      travel: rand(260, 480),
      duration: rand(700, 1100),
      start: performance.now(),
    };
    this.onMeteor?.();
    requestAnimationFrame((t) => this.frame(t));
  }

  frame(now) {
    const m = this.active;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!m) return;

    const t = Math.min((now - m.start) / m.duration, 1);
    const ease = 1 - (1 - t) ** 2;
    const fade = t < 0.15 ? t / 0.15 : 1 - Math.max(0, (t - 0.55) / 0.45);
    const headX = m.x + m.dir.x * m.travel * ease;
    const headY = m.y + m.dir.y * m.travel * ease;
    const tail = m.length * (0.4 + 0.6 * Math.min(1, t * 2.5));
    const tailX = headX - m.dir.x * tail;
    const tailY = headY - m.dir.y * tail;

    const g = ctx.createLinearGradient(tailX, tailY, headX, headY);
    g.addColorStop(0, 'rgba(230, 234, 245, 0)');
    g.addColorStop(0.8, `rgba(230, 234, 245, ${0.35 * fade})`);
    g.addColorStop(1, `rgba(255, 250, 235, ${0.9 * fade})`);
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(headX, headY);
    ctx.stroke();

    if (t < 1) requestAnimationFrame((n) => this.frame(n));
    else {
      this.active = null;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}
