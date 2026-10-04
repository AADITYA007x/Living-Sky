// Now and then a meteor drifts across the screen and burns out, leaving a
// faint trail that slowly fades. Meteors burn up in Earth's atmosphere, so
// they are drawn on the screen rather than fixed among the stars.

const rand = (a, b) => a + Math.random() * (b - a);
const easeOut = (t) => 1 - (1 - t) ** 3;
const smooth = (a, b, x) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

export class Meteors {
  constructor(canvas, { onMeteor } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onMeteor = onMeteor;
    this.meteors = [];
    this.running = false;
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    if (!this.reduced) this.schedule(rand(4000, 8000));
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.canvas.width = Math.round(window.innerWidth * dpr);
    this.canvas.height = Math.round(window.innerHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  schedule(ms) {
    setTimeout(() => {
      if (!document.hidden) this.launch();
      this.schedule(rand(8000, 22000));
    }, ms);
  }

  launch() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const side = Math.random() < 0.5 ? 1 : -1;
    const angle = rand(0.3, 0.8);
    this.meteors.push({
      x: rand(w * 0.1, w * 0.9),
      y: rand(h * 0.05, h * 0.5),
      dx: side * Math.cos(angle),
      dy: Math.sin(angle),
      travel: rand(300, 560),
      tail: rand(0.35, 0.55),
      travelMs: rand(1700, 2600),
      lingerMs: rand(1100, 1700),
      width: rand(1.1, 1.8),
      start: performance.now(),
    });
    this.onMeteor?.();
    if (!this.running) {
      this.running = true;
      requestAnimationFrame((t) => this.frame(t));
    }
  }

  frame(now) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    this.meteors = this.meteors.filter((m) => this.draw(m, now));
    if (this.meteors.length) requestAnimationFrame((t) => this.frame(t));
    else this.running = false;
  }

  // Returns false once the meteor has fully faded
  draw(m, now) {
    const ctx = this.ctx;
    const elapsed = now - m.start;
    const total = m.travelMs + m.lingerMs;
    if (elapsed >= total) return false;

    const k = Math.min(elapsed / m.travelMs, 1);
    const p = easeOut(k);
    // The head brightens quickly, then burns out before it stops
    const head = smooth(0, 0.12, k) * (1 - smooth(0.55, 1, k));
    // The trail lingers after the head is gone, then fades away
    const trail = elapsed < m.travelMs ? 1 : 1 - (elapsed - m.travelMs) / m.lingerMs;
    // The back of the trail slowly catches up with the front
    const back = Math.max(0, p - m.tail * (0.4 + 0.6 * smooth(0, 0.3, k))) + (1 - trail) * m.tail * 0.5;

    const hx = m.x + m.dx * m.travel * p;
    const hy = m.y + m.dy * m.travel * p;
    const tx = m.x + m.dx * m.travel * Math.min(back, p);
    const ty = m.y + m.dy * m.travel * Math.min(back, p);

    const a = 0.55 * trail ** 1.5;
    if (a > 0.003 && Math.hypot(hx - tx, hy - ty) > 1) {
      // Soft outer glow
      const glow = ctx.createLinearGradient(tx, ty, hx, hy);
      glow.addColorStop(0, 'rgba(200, 215, 255, 0)');
      glow.addColorStop(1, `rgba(200, 215, 255, ${a * 0.18})`);
      ctx.strokeStyle = glow;
      ctx.lineWidth = m.width * 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(hx, hy);
      ctx.stroke();

      // Bright core
      const core = ctx.createLinearGradient(tx, ty, hx, hy);
      core.addColorStop(0, 'rgba(230, 234, 245, 0)');
      core.addColorStop(0.7, `rgba(235, 238, 250, ${a * 0.6})`);
      core.addColorStop(1, `rgba(255, 250, 235, ${a})`);
      ctx.strokeStyle = core;
      ctx.lineWidth = m.width;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(hx, hy);
      ctx.stroke();
    }

    if (head > 0.01) {
      const r = 6 + m.width * 3;
      const dot = ctx.createRadialGradient(hx, hy, 0, hx, hy, r);
      dot.addColorStop(0, `rgba(255, 252, 240, ${0.95 * head})`);
      dot.addColorStop(0.3, `rgba(255, 240, 210, ${0.35 * head})`);
      dot.addColorStop(1, 'rgba(255, 240, 210, 0)');
      ctx.fillStyle = dot;
      ctx.beginPath();
      ctx.arc(hx, hy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    return true;
  }
}