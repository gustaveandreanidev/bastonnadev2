// Unités de la simulation : tout est entier.
// 1 pixel = U unités. Les vitesses sont en unités par tick.
export const U = 100;

export const px = (v) => Math.round(v * U);

// Bits d'entrée (un octet par frame et par joueur)
export const IN = { L: 1, R: 2, J: 4, D: 8, LT: 16, HV: 32, DG: 64 };

// Division entière tronquée vers zéro (déterministe)
export const idiv = (a, b) => Math.trunc(a / b);

export const clampI = (v, a, b) => (v < a ? a : v > b ? b : v);
export const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);
export const absI = (v) => (v < 0 ? -v : v);

// Générateur pseudo-aléatoire seedé (mulberry32), état stocké dans s.rng
export function rngNext(s) {
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}
export const rngInt = (s, n) => rngNext(s) % n;
export const rngRange = (s, a, b) => a + rngInt(s, b - a + 1);
