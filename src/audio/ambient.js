// Generative ambient music, made live in the browser with the Web Audio API.
// Slow open chords drift underneath, and soft bell tones twinkle like stars.
// The mood follows the star you select: cool red stars sound lower and darker,
// hot blue stars higher and brighter. No audio files, so nothing to license.
// It keeps playing when you switch tabs; only the Music button stops it.

const CHORDS = [
  [0, 7, 14, 19],
  [-3, 4, 11, 16],
  [-7, 0, 9, 14],
  [-5, 2, 9, 16],
];
// A tanpura-like drone on Sa and Pa, used for the Indian sky
const DRONE = [
  [0, 7, 12, 19],
  [0, 7, 12, 24],
];
// Major pentatonic, the same notes as raga Bhupali (Sa Re Ga Pa Dha)
const SPARKLE_STEPS = [0, 2, 4, 7, 9];
const BASE_ROOT = 73.42; // D2
const CHORD_SECONDS = 16;
const FADE_SECONDS = 7;
const VOICE_LEVEL = 0.045;
const MASTER_LEVEL = 0.55;
const LOOKAHEAD_SECONDS = 90;

const semis = (f, s) => f * 2 ** (s / 12);
const rand = (a, b) => a + Math.random() * (b - a);

export class AmbientSound {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.running = false;
    this.scheduled = [];
    this.indian = false;
    this.chordIndex = 0;
    this.shift = 0;
    this.brightness = 0.5;

    // Some browsers pause audio in background tabs; resume it when the tab returns
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.enabled && this.ctx?.state === 'suspended') this.ctx.resume();
    });
  }

  get supported() {
    return Boolean(window.AudioContext || window.webkitAudioContext);
  }

  build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    this.ctx = ctx;


    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    comp.connect(ctx.destination);

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(comp);

    const reverb = ctx.createConvolver();
    reverb.buffer = this.impulse(4.5, 2.6);
    const wet = ctx.createGain();
    wet.gain.value = 0.7;
    const dry = ctx.createGain();
    dry.gain.value = 0.45;
    reverb.connect(wet).connect(this.master);
    dry.connect(this.master);

    this.bus = ctx.createGain();
    this.bus.connect(dry);
    this.bus.connect(reverb);
    this.reverbIn = reverb;

    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 900;
    this.padFilter.Q.value = 0.4;
    this.padFilter.connect(this.bus);

    // Slow breathing of the pad's brightness
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.045;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 260;
    lfo.connect(lfoDepth).connect(this.padFilter.frequency);
    lfo.start();

    // A very quiet, shifting wash of filtered noise, like distant solar wind
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(4);
    noise.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 500;
    band.Q.value = 0.8;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.012;
    const noiseLfo = ctx.createOscillator();
    noiseLfo.frequency.value = 0.03;
    const noiseLfoDepth = ctx.createGain();
    noiseLfoDepth.gain.value = 300;
    noiseLfo.connect(noiseLfoDepth).connect(band.frequency);
    noise.connect(band).connect(noiseGain).connect(reverb);
    noise.start();
    noiseLfo.start();
  }

  impulse(seconds, decay) {
    const ctx = this.ctx;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay;
    }
    return buffer;
  }

  noiseBuffer(seconds) {
    const ctx = this.ctx;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  async start() {
    if (!this.supported) return;
    if (!this.ctx) this.build();
    this.enabled = true;
    if (this.ctx.state !== 'running') {
      try {
        await this.ctx.resume();
      } catch {
        return;
      }
    }
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(MASTER_LEVEL, t + 3);
    if (!this.running) {
      this.running = true;
      this.nextChordTime = t + 0.1;
      this.rhythmStart = this.nextChordTime;
      this.nextSparkleTime = t + 2.5;
      this.tick();
      this.ticker = setInterval(() => this.tick(), 1000);
    }
  }

  stop() {
    this.enabled = false;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(0, t + 1.5);
    setTimeout(() => {
      if (!this.enabled) this.halt();
    }, 1700);
  }

  // Stop everything immediately and pause the audio clock
  halt() {
    this.running = false;
    clearInterval(this.ticker);
    this.cancelFrom(0);
    this.ctx?.suspend();
  }

  // Music is scheduled on the audio clock well ahead of time, so it keeps
  // playing smoothly even when the browser slows timers in background tabs.
  tick() {
    if (!this.running) return;
    const horizon = this.ctx.currentTime + LOOKAHEAD_SECONDS;
    while (this.nextChordTime < horizon) {
      this.scheduleChord(this.nextChordTime);
      this.nextChordTime += CHORD_SECONDS;
    }
    while (this.nextSparkleTime < horizon) {
      this.scheduleSparkle(this.nextSparkleTime);
      this.nextSparkleTime += (6.5 - this.brightness * 3.5) * rand(0.5, 1.4);
    }
    const now = this.ctx.currentTime;
    this.scheduled = this.scheduled.filter((n) => n.end > now);
  }

  // Cancel every chord and twinkle that has not started yet
  cancelFrom(time) {
    const keep = [];
    for (const n of this.scheduled) {
      if (n.start >= time) {
        n.oscs.forEach((o) => {
          try {
            o.stop();
          } catch {
            // already stopped
          }
        });
        n.out.disconnect();
      } else keep.push(n);
    }
    this.scheduled = keep;
  }

  scheduleChord(t) {
    const ctx = this.ctx;
    const root = semis(BASE_ROOT, this.shift);
    const set = this.indian ? DRONE : CHORDS;
    const chord = set[this.chordIndex++ % set.length];
    const fadeOutEnd = t + CHORD_SECONDS + FADE_SECONDS;

    chord.forEach((step, i) => {
      const f = semis(root, step);
      const level = VOICE_LEVEL * (i === 0 ? 1.2 : 1);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(level, t + FADE_SECONDS);
      gain.gain.setValueAtTime(level, t + CHORD_SECONDS);
      gain.gain.linearRampToValueAtTime(0, fadeOutEnd);
      const pan = ctx.createStereoPanner();
      pan.pan.value = (i / (chord.length - 1)) * 1.2 - 0.6;
      gain.connect(pan).connect(this.padFilter);
      const oscs = [
        ['triangle', -6],
        ['sine', 6],
      ].map(([type, cents]) => {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = f;
        o.detune.value = cents;
        o.connect(gain);
        o.start(t);
        o.stop(fadeOutEnd + 0.2);
        return o;
      });
      this.scheduled.push({ start: t, end: fadeOutEnd + 0.2, oscs, out: pan });
    });
  }

  scheduleSparkle(t) {
    const root = semis(BASE_ROOT, this.shift);
    const step = SPARKLE_STEPS[Math.floor(Math.random() * SPARKLE_STEPS.length)];
    const octave = Math.random() < 0.35 + this.brightness * 0.3 ? 36 : 24;
    this.bell(semis(root, step + octave), rand(0.025, 0.05), rand(-0.8, 0.8), t);
  }

  // A soft bell tone at audio-clock time `at` (defaults to now)
  bell(freq, level = 0.05, pan = rand(-0.8, 0.8), at = null) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const t = at ?? ctx.currentTime;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(level, t + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 4.5);
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    env.connect(p).connect(this.bus);
    const oscs = [
      [1, 1],
      [2.01, 0.25],
      [3.02, 0.08],
    ].map(([ratio, amp]) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * ratio;
      const g = ctx.createGain();
      g.gain.value = amp;
      o.connect(g).connect(env);
      o.start(t);
      o.stop(t + 4.6);
      return o;
    });
    this.scheduled.push({ start: t, end: t + 4.6, oscs, out: p });
  }

  // Called when a star is selected: shift the mood and play a soft greeting
  setStar(temperature) {
    if (!temperature) return;
    const k = Math.log(Math.min(Math.max(temperature, 2500), 30000));
    this.brightness = (k - Math.log(2500)) / (Math.log(30000) - Math.log(2500));
    this.shift = Math.round((this.brightness - 0.5) * 10);
    if (!this.ctx || !this.enabled || !this.running) return;
    const t = this.ctx.currentTime;
    this.padFilter.frequency.setTargetAtTime(550 + this.brightness * 1100, t, 2);

    // Replace music queued in the old mood; the current chord finishes naturally
    this.cancelFrom(t + 0.05);
    this.nextChordTime = Math.max(t + 0.1, this.firstChordAfter(t));
    this.nextSparkleTime = t + 3;
    this.tick();

    const root = semis(BASE_ROOT, this.shift);
    this.bell(semis(root, 24), 0.06, -0.2);
    this.bell(semis(root, 31), 0.045, 0.25, t + 0.22);
  }

  // Switch between the drifting chords and the Indian drone
  setIndian(on) {
    if (this.indian === on) return;
    this.indian = on;
    if (!this.ctx || !this.running) return;
    const t = this.ctx.currentTime;
    this.cancelFrom(t + 0.05);
    this.nextChordTime = Math.max(t + 0.1, this.firstChordAfter(t));
    this.nextSparkleTime = t + 2;
    this.tick();
  }

  // When the next chord should start, keeping the chord rhythm steady
  firstChordAfter(t) {
    const elapsed = t - this.rhythmStart;
    return this.rhythmStart + Math.ceil(elapsed / CHORD_SECONDS) * CHORD_SECONDS;
  }

  // A faint glint, used when a meteor crosses the sky
  glint() {
    if (!this.enabled) return;
    const root = semis(BASE_ROOT, this.shift);
    this.bell(semis(root, 43), 0.018, rand(-0.6, 0.6));
  }
}
