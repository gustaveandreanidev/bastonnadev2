// Sons générés en Web Audio API (aucun fichier externe).
import { options, onOptionChange } from '../core/options.js';

let ac = null, master, sfx, amb, noiseBuf, brownBuf;
let lastPlay = {};

export function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain();
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4;
  master.connect(comp); comp.connect(ac.destination);
  sfx = ac.createGain(); sfx.connect(master);
  amb = ac.createGain(); amb.connect(master);
  applyVolumes();
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  brownBuf = ac.createBuffer(1, ac.sampleRate * 4, ac.sampleRate);
  const b = brownBuf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < b.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; b[i] = last * 3.5; }
  startAmbience();
}

function applyVolumes() {
  if (!ac) return;
  master.gain.value = options.master;
  sfx.gain.value = options.sfx;
  amb.gain.value = 0.55;
}
onOptionChange(applyVolumes);

const now = () => ac.currentTime;

function env(g, t, vol, attack, dur) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur);
}

function tone({ type = 'sine', f0, f1 = f0, dur = 0.2, vol = 0.3, attack = 0.003, delay = 0, dest = sfx, pan = 0 }) {
  const t = now() + delay;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  env(g, t, vol, attack, dur);
  let node = g;
  if (pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
  o.connect(g); node.connect(dest);
  o.start(t); o.stop(t + attack + dur + 0.05);
}

function noise({ dur = 0.2, vol = 0.3, type = 'bandpass', f0 = 1000, f1 = f0, q = 1, attack = 0.002, delay = 0, dest = sfx, pan = 0, brown = false }) {
  const t = now() + delay;
  const s = ac.createBufferSource();
  s.buffer = brown ? brownBuf : noiseBuf;
  s.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = ac.createBiquadFilter();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ac.createGain();
  env(g, t, vol, attack, dur);
  let node = g;
  if (pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
  s.connect(f); f.connect(g); node.connect(dest);
  s.start(t, Math.random() * 1.5); s.stop(t + attack + dur + 0.05);
}

// Limite le nombre de sons identiques simultanés (rollback, rafales)
function gate(name, ms = 30) {
  const t = performance.now();
  if (lastPlay[name] && t - lastPlay[name] < ms) return false;
  lastPlay[name] = t;
  return true;
}

const panOf = (x) => (x == null ? 0 : Math.max(-0.7, Math.min(0.7, (x - 640) / 700)));

// --- catalogue ----------------------------------------------------------------

export const sfxPlay = {
  hit(kind, wpn, power, x) {
    if (!ac || !gate('hit', 25)) return;
    const p = panOf(x), k = Math.min(1.6, 0.6 + power);
    // impact "chair" : coup sourd
    const heavyW = wpn === 'axe' || wpn === 'hammer';
    tone({ f0: 160 * (heavyW ? 0.75 : 1), f1: 45, dur: 0.16 + 0.1 * k, vol: 0.55 * k, pan: p });
    noise({ dur: 0.07 + 0.05 * k, vol: 0.45 * k, type: 'lowpass', f0: 2400, f1: 300, pan: p });
    if (wpn === 'daggers') {
      noise({ dur: 0.08, vol: 0.16, type: 'highpass', f0: 6000, q: 0.7, pan: p });
      tone({ type: 'triangle', f0: 3000, f1: 2400, dur: 0.08, vol: 0.05, pan: p });
    } else if (wpn === 'hammer') {
      tone({ type: 'square', f0: 70, f1: 32, dur: 0.3, vol: 0.14 * k, pan: p });
      noise({ dur: 0.35, vol: 0.3 * k, type: 'lowpass', f0: 500, f1: 60, brown: true, pan: p });
      tone({ type: 'sine', f0: 820, f1: 760, dur: 0.25, vol: 0.06, pan: p });
    } else if (wpn === 'flail') {
      for (let i = 0; i < 4; i++) tone({ type: 'triangle', f0: 2200 + Math.random() * 1600, dur: 0.05, vol: 0.04, delay: 0.01 * i, pan: p });
      noise({ dur: 0.2, vol: 0.25 * k, type: 'lowpass', f0: 900, f1: 120, brown: true, pan: p });
    } else if (wpn === 'rapier') {
      noise({ dur: 0.12, vol: 0.18, type: 'highpass', f0: 5000, q: 0.7, pan: p });
      tone({ type: 'triangle', f0: 2400, f1: 1800, dur: 0.12, vol: 0.06, pan: p });
    } else if (wpn === 'axe') {
      tone({ type: 'square', f0: 90, f1: 40, dur: 0.22, vol: 0.12 * k, pan: p });
      noise({ dur: 0.25, vol: 0.25 * k, type: 'lowpass', f0: 600, f1: 80, brown: true, pan: p });
    } else if (wpn === 'spear') {
      noise({ dur: 0.08, vol: 0.25, type: 'bandpass', f0: 1400, q: 3, pan: p });
    }
    if (power > 0.9) tone({ f0: 70, f1: 30, dur: 0.4, vol: 0.4, pan: p });
  },
  clash(x) {
    if (!ac || !gate('clash', 60)) return;
    const p = panOf(x);
    for (const [f, v] of [[1180, 0.16], [1870, 0.12], [2650, 0.09], [3420, 0.07], [4630, 0.05]]) {
      tone({ type: 'sine', f0: f * (0.97 + Math.random() * 0.06), dur: 0.5 + Math.random() * 0.3, vol: v, pan: p });
    }
    noise({ dur: 0.06, vol: 0.4, type: 'highpass', f0: 3000, pan: p });
  },
  wood(power = 0.5, x) {
    if (!ac || !gate('wood', 30)) return;
    const p = panOf(x);
    noise({ dur: 0.09, vol: 0.4 + power * 0.3, type: 'bandpass', f0: 700 + Math.random() * 300, q: 4, pan: p });
    tone({ type: 'triangle', f0: 230, f1: 170, dur: 0.12, vol: 0.25, pan: p });
  },
  woodBreak(big, x) {
    if (!ac) return;
    const p = panOf(x);
    const n = big ? 7 : 3;
    for (let i = 0; i < n; i++) {
      noise({ dur: 0.05 + Math.random() * 0.06, vol: 0.35, type: 'bandpass', f0: 500 + Math.random() * 1500, q: 3, delay: i * 0.025 + Math.random() * 0.02, pan: p });
    }
    tone({ f0: 120, f1: 50, dur: 0.3, vol: big ? 0.5 : 0.3, pan: p });
    if (big) noise({ dur: 0.5, vol: 0.25, type: 'lowpass', f0: 800, f1: 100, brown: true, pan: p });
  },
  glass(x) {
    if (!ac) return;
    const p = panOf(x);
    for (let i = 0; i < 5; i++) tone({ type: 'sine', f0: 2500 + Math.random() * 3500, dur: 0.12 + Math.random() * 0.15, vol: 0.07, delay: i * 0.012, pan: p });
    noise({ dur: 0.15, vol: 0.25, type: 'highpass', f0: 3500, pan: p });
  },
  splash(big, x) {
    if (!ac) return;
    const p = panOf(x);
    noise({ dur: big ? 0.45 : 0.25, vol: big ? 0.4 : 0.25, type: 'bandpass', f0: 1800, f1: 400, q: 1.2, attack: 0.01, pan: p });
    for (let i = 0; i < (big ? 6 : 3); i++) tone({ f0: 600 + Math.random() * 900, f1: 1200, dur: 0.05, vol: 0.05, delay: 0.05 + Math.random() * 0.3, pan: p });
  },
  clink(x) {
    if (!ac) return;
    tone({ type: 'triangle', f0: 1600, f1: 1500, dur: 0.15, vol: 0.12, pan: panOf(x) });
  },
  swing(wpn, heavy) {
    if (!ac || !gate('swing', 40)) return;
    const base = { axe: 380, hammer: 300, flail: 520, spear: 650, daggers: 1500 }[wpn] || 1100;
    if (wpn === 'flail') for (let i = 0; i < 3; i++) tone({ type: 'triangle', f0: 2600 + Math.random() * 1200, dur: 0.04, vol: 0.03, delay: 0.03 * i });
    noise({ dur: heavy ? 0.28 : 0.15, vol: heavy ? 0.3 : 0.18, type: 'bandpass', f0: base * 0.5, f1: base * 2.5, q: 1.4, attack: 0.03 });
  },
  jump() { if (ac && gate('jump')) { tone({ type: 'sine', f0: 260, f1: 520, dur: 0.1, vol: 0.08 }); noise({ dur: 0.08, vol: 0.1, type: 'lowpass', f0: 900 }); } },
  djump() { if (ac && gate('djump')) { tone({ type: 'sine', f0: 380, f1: 820, dur: 0.12, vol: 0.08 }); noise({ dur: 0.18, vol: 0.14, type: 'bandpass', f0: 600, f1: 2400, q: 1 }); } },
  land(v) { if (ac && gate('land', 50)) noise({ dur: 0.08 + v * 0.05, vol: 0.12 + v * 0.18, type: 'lowpass', f0: 500, f1: 120, brown: true }); },
  dodge() { if (ac && gate('dodge')) noise({ dur: 0.2, vol: 0.22, type: 'bandpass', f0: 2600, f1: 700, q: 1.5, attack: 0.02 }); },
  brake() { if (ac && gate('brake', 120)) noise({ dur: 0.18, vol: 0.12, type: 'bandpass', f0: 2000, f1: 1200, q: 2 }); },
  thud(v = 0.5, x) {
    if (!ac || !gate('thud', 40)) return;
    tone({ f0: 110, f1: 40, dur: 0.22, vol: 0.3 + v * 0.3, pan: panOf(x) });
    noise({ dur: 0.15, vol: 0.2 + v * 0.2, type: 'lowpass', f0: 700, f1: 100, brown: true, pan: panOf(x) });
  },
  slam(x) {
    if (!ac) return;
    tone({ f0: 90, f1: 28, dur: 0.6, vol: 0.7, pan: panOf(x) });
    noise({ dur: 0.5, vol: 0.5, type: 'lowpass', f0: 1200, f1: 60, brown: true, pan: panOf(x) });
  },
  charge() { if (ac && gate('charge', 200)) tone({ type: 'triangle', f0: 300, f1: 700, dur: 0.35, vol: 0.06, attack: 0.05 }); },
  chargeFull() {
    if (!ac) return;
    tone({ type: 'sine', f0: 1320, dur: 0.35, vol: 0.12 });
    tone({ type: 'sine', f0: 1980, dur: 0.3, vol: 0.06, delay: 0.03 });
  },
  ko(final) {
    if (!ac) return;
    tone({ f0: 140, f1: 25, dur: final ? 1.6 : 0.9, vol: 0.8 });
    noise({ dur: final ? 1.4 : 0.8, vol: 0.5, type: 'lowpass', f0: 3000, f1: 60, brown: false });
    for (const [f, d] of [[220, 0], [277, 0.04], [330, 0.08]]) tone({ type: 'sawtooth', f0: f, dur: 0.6, vol: 0.05, delay: 0.15 + d });
  },
  count(n) {
    if (!ac) return;
    tone({ type: 'square', f0: 440, dur: 0.12, vol: 0.08 });
    tone({ type: 'sine', f0: 220, f1: 200, dur: 0.25, vol: 0.2 });
    void n;
  },
  go() {
    if (!ac) return;
    for (const [f, v] of [[110, 0.4], [164.8, 0.25], [220, 0.2], [293, 0.12], [347, 0.08]]) tone({ type: 'sine', f0: f, f1: f * 0.98, dur: 1.8, vol: v, attack: 0.005 });
    noise({ dur: 0.9, vol: 0.2, type: 'bandpass', f0: 900, q: 0.6, attack: 0.08 });
  },
  fanfare() {
    if (!ac) return;
    const notes = [392, 523, 659, 784, 659, 784];
    notes.forEach((f, i) => {
      tone({ type: 'sawtooth', f0: f, dur: i === notes.length - 1 ? 0.8 : 0.16, vol: 0.07, delay: i * 0.13 });
      tone({ type: 'square', f0: f / 2, dur: i === notes.length - 1 ? 0.8 : 0.16, vol: 0.04, delay: i * 0.13 });
    });
  },
  ui(kind = 'click') {
    if (!ac) return;
    if (kind === 'hover') tone({ type: 'triangle', f0: 900, dur: 0.04, vol: 0.03 });
    else if (kind === 'back') tone({ type: 'triangle', f0: 500, f1: 300, dur: 0.1, vol: 0.08 });
    else { noise({ dur: 0.04, vol: 0.15, type: 'bandpass', f0: 1200, q: 3 }); tone({ type: 'triangle', f0: 660, f1: 880, dur: 0.07, vol: 0.06 }); }
  },
};

// Ambiance : feu qui crépite + rumeur grave
function startAmbience() {
  const s = ac.createBufferSource();
  s.buffer = brownBuf; s.loop = true;
  const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
  const g = ac.createGain(); g.gain.value = 0.12;
  s.connect(f); f.connect(g); g.connect(amb); s.start();
  setInterval(() => {
    if (!ac || ac.state !== 'running') return;
    const n = Math.random() < 0.5 ? 1 : 2;
    for (let i = 0; i < n; i++) {
      noise({ dur: 0.01 + Math.random() * 0.03, vol: 0.05 + Math.random() * 0.09, type: 'bandpass', f0: 1500 + Math.random() * 3000, q: 2, delay: Math.random() * 0.15, dest: amb });
    }
  }, 160);
}
