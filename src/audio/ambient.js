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
const SPARKLE_STEPS = [0, 2, 4, 7, 9];
const BASE_ROOT = 73.42; // D2
const CHORD_SECONDS = 16;
const FADE_SECONDS = 7;
const VOICE_LEVEL = 0.045;
const MASTER_LEVEL = 0.55;

const semis = (f, s) => f * 2 ** (s / 12);
const rand = (a, b) => a + Math.random() * (b - a);

export class AmbientSound {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.running = false;
    this.voices = [];
    this.chordIndex = 0;
    this.shift = 0;
    this.brightness = 0.5;
    this.timers = new Set();

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

  later(fn, ms) {
    const id = setTimeout(() => {
      this.timers.delete(id);
      fn();
    }, ms);
    this.timers.add(id);
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
      this.nextChord();
      this.later(() => this.sparkle(), 2500);
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

  // Stop all loops and voices immediately and pause the audio clock
  halt() {
    this.running = false;
    for (const id of this.timers) clearTimeout(id);
    this.timers.clear();
    for (const v of this.voices) v.oscs.forEach((o) => o.stop());
    this.voices = [];
    this.ctx?.suspend();
  }

  nextChord() {
    if (!this.running) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const root = semis(BASE_ROOT, this.shift);
    const chord = CHORDS[this.chordIndex++ % CHORDS.length];

    for (const v of this.voices) {
      v.gain.gain.cancelScheduledValues(now);
      v.gain.gain.setValueAtTime(v.gain.gain.value, now);
      v.gain.gain.linearRampToValueAtTime(0, now + FADE_SECONDS);
      v.oscs.forEach((o) => o.stop(now + FADE_SECONDS + 0.2));
    }

    this.voices = chord.map((step, i) => {
      const f = semis(root, step);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(VOICE_LEVEL * (i === 0 ? 1.2 : 1), now + FADE_SECONDS);
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
        o.start(now);
        return o;
      });
      return { gain, oscs };
    });

    this.later(() => this.nextChord(), CHORD_SECONDS * 1000);
  }

  sparkle() {
    if (!this.running) return;
    const root = semis(BASE_ROOT, this.shift);
    const step = SPARKLE_STEPS[Math.floor(Math.random() * SPARKLE_STEPS.length)];
    const octave = Math.random() < 0.35 + this.brightness * 0.3 ? 36 : 24;
    this.bell(semis(root, step + octave), rand(0.025, 0.05));
    const gap = (6500 - this.brightness * 3500) * rand(0.5, 1.4);
    this.later(() => this.sparkle(), gap);
  }

  bell(freq, level = 0.05, pan = rand(-0.8, 0.8), when = 0) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(level, t + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 4.5);
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    env.connect(p).connect(this.bus);
    [
      [1, 1],
      [2.01, 0.25],
      [3.02, 0.08],
    ].forEach(([ratio, amp]) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * ratio;
      const g = ctx.createGain();
      g.gain.value = amp;
      o.connect(g).connect(env);
      o.start(t);
      o.stop(t + 4.6);
    });
  }

  // Called when a star is selected: shift the mood and play a soft greeting
  setStar(temperature) {
    if (!temperature) return;
    const k = Math.log(Math.min(Math.max(temperature, 2500), 30000));
    this.brightness = (k - Math.log(2500)) / (Math.log(30000) - Math.log(2500));
    this.shift = Math.round((this.brightness - 0.5) * 10);
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    this.padFilter.frequency.setTargetAtTime(550 + this.brightness * 1100, t, 2);
    const root = semis(BASE_ROOT, this.shift);
    this.bell(semis(root, 24), 0.06, -0.2);
    this.bell(semis(root, 31), 0.045, 0.25, 0.22);
  }

  // A faint glint, used when a meteor crosses the sky
  glint() {
    if (!this.enabled) return;
    const root = semis(BASE_ROOT, this.shift);
    this.bell(semis(root, 43), 0.018, rand(-0.6, 0.6));
  }
}