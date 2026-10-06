// Hitbox, hurtbox, coups, chocs d'armes.
import { P, W, R } from './tuning.js';
import { absI, idiv, sign, px, rngRange } from './units.js';
import { fighterHeight, hurtable } from './fighter.js';
import { hitProps } from './props.js';

const overlap = (a, b) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;

export function hitbox(f) {
  if (f.st !== 'attack' || !f.atk || f.atk.ph !== 'active') return null;
  const hb = W[f.wpn][f.atk.id].hb;
  const x1 = f.face > 0 ? f.x + hb.x : f.x - hb.x - hb.w;
  return { x1, y1: f.y + hb.y, x2: x1 + hb.w, y2: f.y + hb.y + hb.h };
}

export function hurtbox(f) {
  const h = fighterHeight(f);
  return { x1: f.x - P.hw, y1: f.y - h, x2: f.x + P.hw, y2: f.y };
}

const centerOf = (a, b) => ({
  x: idiv(Math.max(a.x1, b.x1) + Math.min(a.x2, b.x2), 2),
  y: idiv(Math.max(a.y1, b.y1) + Math.min(a.y2, b.y2), 2),
});

// Applique un coup à la victime v. src = index de l'attaquant (-1 : aucun)
function armored(v) {
  const k = v.atk;
  return v.st === 'attack' && k && W[v.wpn][k.id].armor && (k.ph === 'startup' || k.ph === 'active');
}

export function applyHit(s, src, v, o, ev) {
  if (armored(v)) {
    // super armure : les dégâts passent, l'attaque continue
    v.hp = Math.max(0, v.hp - o.dmg);
    v.since = 0; v.lastDmg = o.dmg;
    v.stop = Math.max(v.stop, 4);
    if (src >= 0 && s.f[src] !== v) {
      const at = s.f[src];
      at.stop = Math.max(at.stop, 6);
      at.dmgOut += o.dmg; at.hits++;
      if (o.dmg > at.best) at.best = o.dmg;
    }
    ev.push({ type: 'armor', src, i: v.i, x: o.x, y: o.y, dmg: o.dmg, wpn: o.wpn });
    return;
  }
  const wasStunned = v.st === 'hitstun';
  const chain = wasStunned ? v.combo : 0;   // coups déjà encaissés dans ce combo
  const hsPct = Math.max(R.cHsMin, 100 - R.cHsDecay * chain);
  const kbPct = Math.min(R.cKbMax, 100 + R.cKbGrow * chain);
  v.hp = Math.max(0, v.hp - o.dmg);
  v.since = 0;
  v.st = 'hitstun'; v.t = 0; v.hs = Math.max(4, idiv(o.hs * hsPct, 100));
  v.atk = null; v.crouch = 0; v.run = 0; v.ff = 0;
  v.vx = idiv(o.kbx * kbPct, 100); v.vy = idiv(o.kby * kbPct, 100);
  if (v.vy < 0) { v.gr = 0; v.plat = -1; }
  if (o.kbx) v.face = -sign(o.kbx);
  v.stop = o.stop; v.jumps = 1; v.adodge = 1;
  v.combo = wasStunned ? v.combo + 1 : 1;
  v.lastDmg = o.dmg;
  if (src >= 0) {
    const at = s.f[src];
    if (at !== v) {
      if (at.st === 'attack') at.stop = o.stop;
      at.dmgOut += o.dmg; at.hits++;
      if (o.dmg > at.best) at.best = o.dmg;
    }
  }
  ev.push({
    type: 'hit', src, i: v.i, x: o.x, y: o.y, dmg: o.dmg, kbx: o.kbx, kby: o.kby,
    heavy: o.heavy, wpn: o.wpn, kind: o.kind, combo: v.combo,
  });
}

function attackHit(s, att, v, box, k, ev) {
  const a = W[att.wpn][k.id];
  let dmg = a.dmg, kbx = a.kbx, kby = a.kby;
  if (a.cMax) {
    dmg = idiv(dmg * (100 + idiv((a.cDmg - 100) * k.c, a.cMax)), 100);
    const m = 100 + idiv((a.cKb - 100) * k.c, a.cMax);
    kbx = idiv(kbx * m, 100); kby = idiv(kby * m, 100);
  }
  // légère variation seedée du knockback
  kbx += rngRange(s, -12, 12);
  const c = centerOf(box, hurtbox(v));
  k.hit |= 1;
  applyHit(s, att.i, v, {
    dmg, kbx: att.face * kbx, kby, hs: a.hs, stop: a.stop, x: c.x, y: c.y,
    heavy: k.id.endsWith('heavy') ? 1 : 0, wpn: att.wpn, kind: k.id,
    charge: a.cMax ? idiv(k.c * 100, a.cMax) : 0,
  }, ev);
}

function clash(s, a, b, ha, hb, ev) {
  const c = centerOf(ha, hb);
  for (const f of [a, b]) {
    f.atk.hit |= 1;
    f.atk.ph = 'recovery'; f.atk.t = 0;
    f.vx = (f.x < c.x ? -1 : 1) * px(5);
    f.stop = 8;
  }
  ev.push({ type: 'clash', x: c.x, y: c.y, w0: a.wpn, w1: b.wpn });
}

export function resolveCombat(s, ev) {
  const [a, b] = s.f;
  const ha = hitbox(a), hb = hitbox(b);
  if (ha && hb && !(a.atk.hit & 1) && !(b.atk.hit & 1) && overlap(ha, hb) && s.phase === 'fight') {
    clash(s, a, b, ha, hb, ev);
    return;
  }
  // Les deux coups sont évalués avant d'être appliqués (échanges simultanés)
  const hits = [];
  if (s.phase === 'fight') {
    for (const [att, box] of [[a, ha], [b, hb]]) {
      if (!box || att.atk.hit & 1) continue;
      const v = s.f[1 - att.i];
      if (hurtable(s, v) && overlap(box, hurtbox(v))) hits.push([att, v, box, att.atk]);
    }
  }
  for (const [att, v, box, k] of hits) attackHit(s, att, v, box, k, ev);
  for (const [att, box] of [[a, ha], [b, hb]]) {
    if (box && att.atk) hitProps(s, att, box, ev);
  }
}

export const isHeavyHit = (dmg) => absI(dmg) >= 1500;
