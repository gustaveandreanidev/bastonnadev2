// Bibliothèque de poses du stickman (angles en degrés).
// Convention : membres 0 = vers le bas, 90 = vers l'avant, 180 = vers le haut,
// -90 = vers l'arrière. lean : inclinaison du torse (+ = vers l'avant).
// fu/fl : bras avant (porte l'arme), bu/bl : bras arrière,
// ft/fs : cuisse/tibia avant, bt/bs : jambe arrière, w : direction de l'arme.
// two = 1 : la main arrière tient aussi l'arme. dy : abaissement du bassin.
import { W } from '../sim/tuning.js';

export const KEYS = ['lean', 'head', 'fu', 'fl', 'bu', 'bl', 'ft', 'fs', 'bt', 'bs', 'w', 'dy', 'rot'];

const P = (o) => ({ lean: 6, head: 0, fu: 30, fl: 80, bu: -20, bl: 20, ft: 16, fs: 2, bt: -16, bs: -8, w: 100, dy: 0, rot: 0, two: 0, ...o });

export const IDLE = {
  rapier: P({ lean: 8, fu: 40, fl: 95, bu: -105, bl: -165, ft: 20, bt: -20, w: 102 }),
  axe: P({ lean: 6, fu: 18, fl: 112, bu: -12, bl: 28, w: 158 }),
  spear: P({ lean: 6, fu: 36, fl: 82, ft: 20, bt: -20, w: 97, two: 1 }),
  daggers: P({ lean: 14, fu: 50, fl: 100, bu: -6, bl: 72, ft: 26, fs: 0, bt: -26, bs: -16, w: 95 }),
  hammer: P({ lean: 6, fu: 24, fl: 104, w: 152, two: 1 }),
  flail: P({ lean: 6, fu: 32, fl: 104, bu: -20, bl: 30, w: 122 }),
  none: P({ lean: 0, fu: 92, fl: 92, bu: -92, bl: -92, ft: 8, fs: 0, bt: -8, bs: 0, w: 90 }),
};

// Attaques : windup (armement), hit (frappe), end (fin du geste)
const A = (wind, hit, end, extra = {}) => ({ wind: P(wind), hit: P(hit), end: P(end), ...extra });

export const ATTACKS = {
  rapier: {
    nlight: A(
      { lean: 0, fu: -10, fl: 75, bu: -110, bl: -170, ft: 22, bt: -22, w: 94 },
      { lean: 24, fu: 88, fl: 92, bu: -120, bl: -175, ft: 46, fs: 10, bt: -38, bs: -20, w: 91 },
      { lean: 14, fu: 70, fl: 88, bu: -110, bl: -170, ft: 34, bt: -30, w: 98 }),
    slight: A(
      { lean: -4, fu: -25, fl: 70, bu: -100, bl: -160, ft: 10, fs: -10, bt: -10, bs: -30, w: 96 },
      { lean: 36, fu: 96, fl: 95, bu: -135, bl: -175, ft: 62, fs: 20, bt: -58, bs: -42, w: 92, dy: 8 },
      { lean: 22, fu: 80, fl: 90, bu: -120, bl: -170, ft: 48, fs: 12, bt: -44, bs: -30, w: 96, dy: 4 }),
    alight: A(
      { lean: -6, fu: 160, fl: 172, bu: -60, bl: -20, ft: 50, fs: -20, bt: -10, bs: -60, w: 192 },
      { lean: 16, fu: 70, fl: 58, bu: -80, bl: -40, ft: 40, fs: -10, bt: -20, bs: -50, w: 52 },
      { lean: 10, fu: 34, fl: 26, bu: -60, bl: -30, ft: 30, fs: 0, bt: -20, bs: -40, w: 24 }),
    nheavy: A(
      { lean: -8, head: -4, fu: 168, fl: 186, bu: 40, bl: 70, ft: 28, fs: 0, bt: -34, bs: -20, w: 206, dy: 6 },
      { lean: 28, fu: 86, fl: 78, bu: -100, bl: -150, ft: 52, fs: 12, bt: -44, bs: -30, w: 70, dy: 8 },
      { lean: 20, fu: 54, fl: 40, bu: -90, bl: -140, ft: 44, fs: 8, bt: -40, bs: -26, w: 36, dy: 6 }),
    aheavy: A(
      { lean: 4, fu: 95, fl: 95, bu: -95, bl: -95, ft: 70, fs: -30, bt: 20, bs: -80, w: 92 },
      { lean: 4, fu: 92, fl: 92, bu: -92, bl: -92, ft: 70, fs: -30, bt: 20, bs: -80, w: 90 },
      { lean: 6, fu: 60, fl: 70, bu: -70, bl: -40, ft: 40, fs: -10, bt: -10, bs: -40, w: 80 },
      { spin: 1 }),
  },
  axe: {
    nlight: A(
      { lean: -10, head: -6, fu: 168, fl: 192, bu: -40, bl: 10, ft: 22, bt: -24, w: 205 },
      { lean: 22, fu: 84, fl: 70, bu: -50, bl: -10, ft: 40, fs: 8, bt: -34, bs: -18, w: 64, dy: 6 },
      { lean: 18, fu: 58, fl: 46, bu: -40, bl: 0, ft: 36, fs: 6, bt: -30, bs: -16, w: 50, dy: 6 }),
    slight: A(
      { lean: -6, fu: -70, fl: -95, bu: 40, bl: 80, ft: 20, bt: -26, w: -105, dy: 4 },
      { lean: 26, fu: 96, fl: 100, bu: -70, bl: -40, ft: 50, fs: 10, bt: -44, bs: -26, w: 96, dy: 6 },
      { lean: 16, fu: 122, fl: 142, bu: -60, bl: -30, ft: 40, fs: 6, bt: -36, bs: -20, w: 150, dy: 4 }),
    alight: A(
      { lean: -8, fu: 152, fl: 172, bu: -40, bl: 0, ft: 50, fs: -20, bt: -10, bs: -60, w: 192 },
      { lean: 18, fu: 60, fl: 40, bu: -50, bl: -10, ft: 40, fs: -10, bt: -20, bs: -50, w: 30 },
      { lean: 12, fu: 36, fl: 20, bu: -40, bl: 0, ft: 30, fs: 0, bt: -20, bs: -40, w: 14 }),
    nheavy: A(
      { lean: -10, head: -4, fu: 172, fl: 196, bu: 166, bl: 192, ft: 34, fs: 4, bt: -40, bs: -30, w: 212, dy: 10, two: 1 },
      { lean: 36, head: 8, fu: 82, fl: 62, bu: 76, bl: 50, ft: 58, fs: 18, bt: -50, bs: -36, w: 52, dy: 18, two: 1 },
      { lean: 32, fu: 66, fl: 44, bu: 62, bl: 38, ft: 54, fs: 14, bt: -48, bs: -34, w: 40, dy: 16, two: 1 }),
    aheavy: A(
      { lean: -10, fu: 172, fl: 190, bu: 170, bl: 190, ft: 70, fs: -30, bt: 30, bs: -70, w: 190, two: 1 },
      { lean: 16, fu: 30, fl: 10, bu: 30, bl: 10, ft: 20, fs: 10, bt: -20, bs: -10, w: 2, two: 1 },
      { lean: 30, fu: 40, fl: 20, bu: 40, bl: 20, ft: 50, fs: 10, bt: -40, bs: -30, w: 10, dy: 14, two: 1 }),
  },
  spear: {
    nlight: A(
      { lean: -2, fu: 6, fl: 72, ft: 20, bt: -24, w: 93, two: 1 },
      { lean: 20, fu: 84, fl: 90, ft: 40, fs: 8, bt: -34, bs: -18, w: 90, two: 1 },
      { lean: 12, fu: 60, fl: 82, ft: 30, bt: -28, w: 94, two: 1 }),
    slight: A(
      { lean: -6, fu: -6, fl: 62, ft: 14, fs: -10, bt: -14, bs: -30, w: 96, two: 1 },
      { lean: 34, fu: 90, fl: 92, ft: 60, fs: 20, bt: -56, bs: -40, w: 90, dy: 8, two: 1 },
      { lean: 22, fu: 74, fl: 86, ft: 46, fs: 12, bt: -44, bs: -30, w: 94, dy: 5, two: 1 }),
    alight: A(
      { lean: -8, fu: 146, fl: 150, ft: 50, fs: -20, bt: -10, bs: -60, w: 152, two: 1 },
      { lean: 14, fu: 64, fl: 72, ft: 40, fs: -10, bt: -20, bs: -50, w: 62, two: 1 },
      { lean: 8, fu: 40, fl: 50, ft: 30, fs: 0, bt: -20, bs: -40, w: 40, two: 1 }),
    nheavy: A(
      { lean: -16, head: -6, fu: -34, fl: 58, ft: 30, fs: 6, bt: -36, bs: -24, w: 102, dy: 8, two: 1 },
      { lean: 32, fu: 92, fl: 92, ft: 62, fs: 18, bt: -54, bs: -40, w: 90, dy: 10, two: 1 },
      { lean: 24, fu: 78, fl: 88, ft: 50, fs: 12, bt: -46, bs: -32, w: 93, dy: 8, two: 1 }),
    aheavy: A(
      { lean: -6, fu: 158, fl: 168, ft: 60, fs: -30, bt: 0, bs: -70, w: 176, two: 1 },
      { lean: 18, fu: 60, fl: 36, ft: 40, fs: -10, bt: -20, bs: -50, w: 30, two: 1 },
      { lean: 12, fu: 44, fl: 26, ft: 30, fs: 0, bt: -20, bs: -40, w: 24, two: 1 }),
  },
};

Object.assign(ATTACKS, {
  daggers: {
    nlight: A(
      { lean: 10, fu: 18, fl: 70, bu: 0, bl: 80, ft: 26, bt: -26, w: 92 },
      { lean: 24, fu: 90, fl: 92, bu: -24, bl: 56, ft: 42, fs: 8, bt: -36, bs: -20, w: 90 },
      { lean: 16, fu: 66, fl: 88, bu: -10, bl: 70, ft: 32, bt: -30, w: 94 }),
    slight: A(
      { lean: 20, fu: -10, fl: 60, bu: -30, bl: 40, ft: 30, bt: -30, w: 96, dy: 6 },
      { lean: 40, fu: 92, fl: 94, bu: 72, bl: 92, ft: 64, fs: 22, bt: -60, bs: -44, w: 90, dy: 10 },
      { lean: 26, fu: 80, fl: 90, bu: 40, bl: 80, ft: 50, fs: 14, bt: -46, bs: -30, w: 92, dy: 6 }),
    alight: A(
      { lean: 10, fu: 100, fl: 100, bu: -100, bl: -100, ft: 70, fs: -30, bt: 20, bs: -80, w: 100 },
      { lean: 10, fu: 96, fl: 96, bu: -96, bl: -96, ft: 70, fs: -30, bt: 20, bs: -80, w: 96 },
      { lean: 10, fu: 60, fl: 80, bu: -40, bl: 30, ft: 40, fs: -10, bt: -10, bs: -40, w: 90 },
      { spin: 1 }),
    nheavy: A(
      { lean: -6, fu: -60, fl: 20, bu: -80, bl: -20, ft: 26, bt: -32, bs: -18, w: 60, dy: 6 },
      { lean: 34, fu: 100, fl: 122, bu: 80, bl: 110, ft: 60, fs: 18, bt: -54, bs: -40, w: 122, dy: 10 },
      { lean: 22, fu: 118, fl: 140, bu: 60, bl: 100, ft: 48, fs: 12, bt: -44, bs: -30, w: 140, dy: 6 }),
    aheavy: A(
      { lean: -10, fu: 160, fl: 170, bu: 150, bl: 165, ft: 70, fs: -30, bt: 30, bs: -70, w: 180 },
      { lean: 42, fu: 44, fl: 24, bu: 34, bl: 14, ft: 30, fs: 0, bt: -20, bs: -30, w: 30 },
      { lean: 30, fu: 54, fl: 44, bu: 44, bl: 34, ft: 50, fs: 10, bt: -40, bs: -30, w: 50, dy: 10 }),
  },
  hammer: {
    nlight: A(
      { lean: -4, fu: 0, fl: 40, w: 34, ft: 22, bt: -24, dy: 4, two: 1 },
      { lean: 16, fu: 122, fl: 150, w: 160, ft: 36, fs: 6, bt: -30, bs: -14, two: 1 },
      { lean: 8, fu: 130, fl: 160, w: 170, ft: 30, bt: -26, two: 1 }),
    slight: A(
      { lean: -8, fu: -30, fl: 50, w: 96, ft: 20, bt: -26, two: 1 },
      { lean: 34, fu: 90, fl: 92, w: 90, ft: 60, fs: 20, bt: -56, bs: -40, dy: 8, two: 1 },
      { lean: 22, fu: 76, fl: 88, w: 92, ft: 46, fs: 12, bt: -44, bs: -30, dy: 5, two: 1 }),
    alight: A(
      { lean: -8, fu: 150, fl: 175, w: 195, ft: 50, fs: -20, bt: -10, bs: -60, two: 1 },
      { lean: 20, fu: 60, fl: 40, w: 50, ft: 40, fs: -10, bt: -20, bs: -50, two: 1 },
      { lean: 14, fu: 44, fl: 26, w: 36, ft: 30, fs: 0, bt: -20, bs: -40, two: 1 }),
    nheavy: A(
      { lean: -12, head: -4, fu: 176, fl: 200, w: 214, ft: 34, fs: 4, bt: -40, bs: -30, dy: 10, two: 1 },
      { lean: 40, head: 8, fu: 74, fl: 48, w: 62, ft: 60, fs: 20, bt: -52, bs: -38, dy: 20, two: 1 },
      { lean: 34, fu: 68, fl: 42, w: 56, ft: 56, fs: 16, bt: -50, bs: -36, dy: 18, two: 1 }),
    aheavy: A(
      { lean: 10, fu: 20, fl: 0, w: -12, ft: 60, fs: -20, bt: 10, bs: -70, two: 1 },
      { lean: -10, fu: 170, fl: 182, w: 186, ft: 30, fs: 10, bt: -30, bs: -20, two: 1 },
      { lean: -6, fu: 160, fl: 175, w: 176, ft: 30, fs: 0, bt: -26, bs: -20, two: 1 }),
  },
  flail: {
    nlight: A(
      { lean: -4, fu: 150, fl: 170, bu: -40, bl: 0, ft: 22, bt: -24, w: 200 },
      { lean: 18, fu: 82, fl: 72, bu: -60, bl: -20, ft: 38, fs: 8, bt: -32, bs: -16, w: 72 },
      { lean: 12, fu: 52, fl: 40, bu: -50, bl: -10, ft: 32, bt: -28, w: 32 }),
    slight: A(
      { lean: 4, fu: 80, fl: 100, bu: -40, bl: 0, ft: 30, bt: -30, w: 60 },
      { lean: 10, fu: 170, fl: 190, bu: -70, bl: -30, ft: 40, fs: 8, bt: -34, bs: -18, w: 300 },
      { lean: 8, fu: 150, fl: 180, bu: -60, bl: -20, ft: 34, bt: -30, w: 330 }),
    alight: A(
      { lean: -6, fu: 140, fl: 160, bu: -40, bl: 0, ft: 50, fs: -20, bt: -10, bs: -60, w: 160 },
      { lean: 14, fu: 50, fl: 30, bu: -60, bl: -20, ft: 40, fs: -10, bt: -20, bs: -50, w: 10 },
      { lean: 10, fu: 30, fl: 10, bu: -40, bl: 0, ft: 30, fs: 0, bt: -20, bs: -40, w: -20 }),
    nheavy: A(
      { lean: -12, head: -4, fu: 170, fl: 198, bu: 30, bl: 70, ft: 30, bt: -40, bs: -26, w: 230, dy: 8 },
      { lean: 30, fu: 92, fl: 86, bu: -90, bl: -140, ft: 56, fs: 16, bt: -48, bs: -34, w: 80, dy: 10 },
      { lean: 24, fu: 62, fl: 44, bu: -80, bl: -120, ft: 50, fs: 12, bt: -44, bs: -30, w: 44, dy: 8 }),
    aheavy: A(
      { lean: 4, fu: 95, fl: 95, bu: -95, bl: -95, ft: 70, fs: -30, bt: 20, bs: -80, w: 92 },
      { lean: 4, fu: 92, fl: 92, bu: -92, bl: -92, ft: 70, fs: -30, bt: 20, bs: -80, w: 90 },
      { lean: 6, fu: 60, fl: 70, bu: -70, bl: -40, ft: 40, fs: -10, bt: -10, bs: -40, w: 80 },
      { spin: 1 }),
  },
});

export const LOCO = {
  jump: { lean: 0, ft: 56, fs: -24, bt: -6, bs: -62 },
  djump: { lean: 10, ft: 80, fs: -20, bt: 40, bs: -40 },
  fall: { lean: 2, ft: 22, fs: 8, bt: -30, bs: -24 },
  crouch: { lean: 18, ft: 82, fs: -8, bt: 22, bs: -78, head: 6 },
  land: { lean: 16, ft: 70, fs: -6, bt: 14, bs: -64 },
  dodge: { lean: 38, ft: 52, fs: 4, bt: -54, bs: -34, dy: 10, bu: -150, bl: -160 },
};

export const HITSTUN = P({ lean: -26, head: -18, fu: -40, fl: -10, bu: 150, bl: 120, ft: 34, fs: 62, bt: -20, bs: 14, w: 30 });
export const VICTORY = {
  rapier: P({ lean: -4, head: -14, fu: 168, fl: 176, bu: -30, bl: 50, w: 180 }),
  axe: P({ lean: -6, head: -14, fu: 170, fl: 178, bu: 170, bl: 178, w: 182, two: 1 }),
  spear: P({ lean: -4, head: -12, fu: 160, fl: 172, bu: -30, bl: 50, w: 180 }),
  daggers: P({ lean: -4, head: -14, fu: 160, fl: 172, bu: 150, bl: 168, w: 178 }),
  hammer: P({ lean: -6, head: -14, fu: 172, fl: 180, w: 180, two: 1 }),
  flail: P({ lean: -4, head: -12, fu: 166, fl: 176, bu: -30, bl: 50, w: 180 }),
  none: P({ lean: 0, fu: 160, fl: 170, bu: -160, bl: -170 }),
};

export function lerpPose(a, b, t, out = {}) {
  for (const k of KEYS) out[k] = a[k] + (b[k] - a[k]) * t;
  out.two = t < 0.5 ? a.two : b.two;
  return out;
}

const ease = (t) => 1 - (1 - t) * (1 - t);
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);

// Pose cible d'une attaque à partir de l'état simulé (phase + timer)
export function attackPose(wpn, atk, idle, tf) {
  const anim = ATTACKS[wpn][atk.id];
  const cfg = W[wpn][atk.id];
  const out = {};
  if (atk.ph === 'charge') {
    const c = cfg.cMax ? atk.c / cfg.cMax : 0;
    lerpPose(idle, anim.wind, 1, out);
    out.lean -= 6 * c; out.fu -= 4 * c; out.w += 6 * c * (wpn === 'spear' ? -1 : 1); out.dy += 4 * c;
    return out;
  }
  if (atk.ph === 'startup') {
    const p = clamp01((atk.t + tf) / Math.max(1, cfg.startup));
    return lerpPose(idle, anim.wind, ease(clamp01(p * 1.5)), out);
  }
  if (atk.ph === 'active') {
    const p = clamp01((atk.t + tf + 1) / 2);
    lerpPose(anim.wind, anim.hit, ease(p), out);
    if (anim.spin) out.rot = -360 * clamp01((atk.t + tf) / cfg.active);
    return out;
  }
  const p = clamp01((atk.t + tf) / Math.max(1, cfg.recovery));
  if (p < 0.5) return lerpPose(anim.hit, anim.end, ease(p * 2), out);
  return lerpPose(anim.end, idle, (p - 0.5) * 2, out);
}
