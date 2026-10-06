// Clavier -> octet d'entrées. Accepte les touches AZERTY (Z Q S D L M K)
// par caractère, et les positions physiques (KeyW/KeyA...) pour les autres
// dispositions. Les flèches marchent aussi.
import { IN } from '../sim/units.js';

const BY_KEY = {
  z: IN.J, q: IN.L, s: IN.D, d: IN.R, l: IN.LT, m: IN.HV, k: IN.DG,
  arrowup: IN.J, arrowleft: IN.L, arrowdown: IN.D, arrowright: IN.R, ' ': IN.J,
};
const BY_CODE = {
  KeyW: IN.J, KeyA: IN.L, KeyS: IN.D, KeyD: IN.R, KeyL: IN.LT, Semicolon: IN.HV, KeyK: IN.DG,
};

const held = new Map(); // code -> bit
const listeners = new Set();

function isTyping(e) {
  const t = e.target;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}

window.addEventListener('keydown', (e) => {
  for (const fn of listeners) fn(e);
  if (isTyping(e)) return;
  const bit = BY_KEY[e.key.toLowerCase()] || BY_CODE[e.code] || 0;
  if (bit) {
    held.set(e.code, bit);
    if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault();
  }
});
window.addEventListener('keyup', (e) => { held.delete(e.code); });
window.addEventListener('blur', () => held.clear());

export function readInput() {
  let bits = 0;
  for (const b of held.values()) bits |= b;
  return bits;
}

export function onKey(fn) { listeners.add(fn); return () => listeners.delete(fn); }
