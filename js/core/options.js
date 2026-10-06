// Options du joueur, mémorisées dans localStorage (repli silencieux).
const KEY = 'bastonnade.options.v1';

const DEFAULTS = {
  master: 0.8,
  sfx: 0.9,
  shake: 2,          // 0 désactivé, 1 faible, 2 normal, 3 fort
  inputDelay: 2,     // 1 à 4 frames
  showPing: true,
  showFps: false,
  name: '',
};

export const options = { ...DEFAULTS };

try {
  const raw = localStorage.getItem(KEY);
  if (raw) Object.assign(options, JSON.parse(raw));
} catch { /* stockage indisponible */ }

const subs = new Set();

export function setOption(k, v) {
  options[k] = v;
  try { localStorage.setItem(KEY, JSON.stringify(options)); } catch { /* ignoré */ }
  for (const fn of subs) fn(k, v);
}

export const onOptionChange = (fn) => subs.add(fn);

export const SHAKE_SCALE = [0, 0.45, 1, 1.6];
