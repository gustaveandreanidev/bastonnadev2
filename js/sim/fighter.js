// Contrôle et physique d'un combattant (déterministe, entiers uniquement).
import { P, DG, W, WU, PLATS, PARTS, PR, isAirAttack } from './tuning.js';
import { IN, absI, sign, idiv, px } from './units.js';
import { damageWall } from './props.js';

export const fighterHeight = (f) => (f.crouch && f.gr && f.st === 'free' ? P.ch : P.h);
export const isInvuln = (f) => f.st === 'dodge' && f.t >= DG.inv0 && f.t <= DG.inv1;

export function hurtable(s, f) {
  return s.phase === 'fight' && f.st !== 'ko' && f.st !== 'victory' && !isInvuln(f);
}

function setSt(f, st) { f.st = st; f.t = 0; }

function take(f, bit) {
  if (f.bufA & bit) { f.bufA &= ~bit; return true; }
  return false;
}

function approach(v, target, step) {
  if (v < target) return Math.min(v + step, target);
  if (v > target) return Math.max(v - step, target);
  return v;
}

function groundFriction(f, k = P.gFric) { if (f.gr) f.vx = approach(f.vx, 0, k); }

function airControl(f, dir, div = 1) {
  if (dir) f.vx = approach(f.vx, dir * P.air, idiv(P.aAcc, div));
  else f.vx = approach(f.vx, 0, P.aFric);
}

function tap(s, f, dir) {
  if (f.tapDir === dir && s.tick - f.tapT <= P.tapWin) f.run = 1;
  f.tapDir = dir; f.tapT = s.tick;
}

// --- Démarrages d'actions ---------------------------------------------------

function jump(s, f, ev) {
  f.vy = -P.jump; f.gr = 0; f.plat = -1; f.crouch = 0; f.adodge = 1;
  ev.push({ type: 'jump', i: f.i, x: f.x, y: f.y });
}

function doubleJump(s, f, ev) {
  f.jumps--; f.vy = -P.djump; f.adodge = 1; f.djT = s.tick;
  ev.push({ type: 'djump', i: f.i, x: f.x, y: f.y });
}

function startDodge(s, f, dir, down, ev) {
  setSt(f, 'dodge');
  f.dcd = DG.cd; f.ddx = dir; f.ddy = !f.gr && down ? 1 : 0;
  f.crouch = 0; f.atk = null; f.ff = 0;
  if (dir) f.face = dir;
  ev.push({ type: 'dodge', i: f.i, x: f.x, y: f.y, dir, air: f.gr ? 0 : 1 });
}

export function startAttack(s, f, id, ev) {
  const a = W[f.wpn][id];
  setSt(f, 'attack');
  f.crouch = 0; f.ff = 0;
  f.atk = { id, ph: a.cMax ? 'charge' : 'startup', t: 0, c: 0, hit: 0, props: [] };
  ev.push({ type: 'atk', i: f.i, id, wpn: f.wpn });
}

function tryAttack(s, f, dir, ev) {
  if (take(f, IN.HV)) {
    if (dir) f.face = dir;
    startAttack(s, f, f.gr ? 'nheavy' : 'aheavy', ev);
    return true;
  }
  if (take(f, IN.LT)) {
    if (dir) f.face = dir;
    startAttack(s, f, f.gr ? (dir || f.run ? 'slight' : 'nlight') : 'alight', ev);
    return true;
  }
  return false;
}

// --- États ---------------------------------------------------------------

function free(s, f, inp, dir, ev) {
  const down = inp & IN.D;
  if (f.gr) {
    f.ff = 0;
    f.crouch = down ? 1 : 0;
    if ((f.bufA & IN.DG) && f.dcd === 0) { take(f, IN.DG); startDodge(s, f, dir, 0, ev); return; }
    if (tryAttack(s, f, dir, ev)) return;
    if (take(f, IN.J)) {
      if (down && f.plat >= 0) {
        f.drop = 14; f.gr = 0; f.plat = -1; f.crouch = 0;
        ev.push({ type: 'drop', i: f.i, x: f.x, y: f.y });
      } else jump(s, f, ev);
      return;
    }
    if (f.crouch) { groundFriction(f); return; }
    const fast = absI(f.vx) >= P.run - P.gAcc;
    if (dir) {
      if (fast && sign(f.vx) === -dir) ev.push({ type: 'brake', i: f.i, x: f.x, y: f.y, dir: sign(f.vx) });
      f.face = dir;
      f.vx = approach(f.vx, dir * (f.run ? P.run : P.walk), P.gAcc);
    } else {
      if (fast) ev.push({ type: 'brake', i: f.i, x: f.x, y: f.y, dir: sign(f.vx) });
      groundFriction(f);
    }
  } else {
    f.crouch = 0;
    if ((f.bufA & IN.DG) && f.dcd === 0 && f.adodge > 0) {
      take(f, IN.DG); f.adodge--;
      startDodge(s, f, dir, down, ev);
      return;
    }
    if (tryAttack(s, f, dir, ev)) return;
    if ((f.bufA & IN.J) && f.jumps > 0) { take(f, IN.J); doubleJump(s, f, ev); return; }
    if (dir) f.face = dir;
    airControl(f, dir);
    f.ff = down && f.vy > -px(3) ? 1 : 0;
  }
}

function dodge(s, f) {
  if (f.t <= DG.dash) f.vx = f.ddx * DG.speed;
  else f.vx = idiv(f.vx * 78, 100);
  if (!f.gr) f.vy = f.ddy ? DG.down : 0;
  if (f.t >= DG.dur) setSt(f, 'free');
}

function attack(s, f, inp, dir, ev) {
  const k = f.atk;
  const a = W[f.wpn][k.id];
  k.t++;
  if (k.ph === 'charge') {
    if ((inp & IN.HV) && k.c < a.cMax) {
      k.c++;
      if (k.c === a.cMax) ev.push({ type: 'chargeFull', i: f.i, x: f.x, y: f.y });
    } else { k.ph = 'startup'; k.t = 0; }
  } else if (k.ph === 'startup') {
    if (k.t >= a.startup) {
      k.ph = 'active'; k.t = 0;
      if (a.lunge) f.vx = f.face * a.lunge;
      if (a.plunge) { f.vy = a.plunge; f.vx = f.face * a.diveX; }
      ev.push({ type: 'swing', i: f.i, id: k.id, wpn: f.wpn, heavy: k.id.endsWith('heavy') ? 1 : 0, x: f.x, y: f.y, face: f.face });
    }
  } else if (k.ph === 'active') {
    if (k.t >= a.active) { k.ph = 'recovery'; k.t = 0; }
  } else if (k.ph === 'recovery') {
    if (k.t >= a.recovery) { f.atk = null; setSt(f, 'free'); return; }
  }

  if (f.gr) groundFriction(f, k.ph === 'active' ? idiv(P.gFric, 2) : P.gFric);
  else if (!(a.plunge && k.ph === 'active')) airControl(f, dir, 2);
  if (a.plunge && k.ph === 'active') f.vy = a.plunge;
  if (a.spin && k.ph === 'active' && !f.gr && f.vy > 0) f.vy = idiv(f.vy, 2);

  // Annulation sur coup réussi : enchaînements
  if (k.hit && a.cancel && (k.ph === 'recovery' || (k.ph === 'active' && k.t > 1))) {
    if (tryAttack(s, f, dir, ev)) return;
    if (f.bufA & IN.J) {
      if (f.gr) { take(f, IN.J); f.atk = null; setSt(f, 'free'); jump(s, f, ev); return; }
      if (f.jumps > 0) { take(f, IN.J); f.atk = null; setSt(f, 'free'); doubleJump(s, f, ev); return; }
    }
    if ((f.bufA & IN.DG) && f.dcd === 0 && (f.gr || f.adodge > 0)) {
      take(f, IN.DG); if (!f.gr) f.adodge--;
      startDodge(s, f, dir, inp & IN.D, ev);
    }
  }
}

// --- Mise à jour principale (contrôle) -----------------------------------
// Retourne false si le combattant est figé (hitstop) : pas de physique.
export function controlFighter(s, f, inp, ev) {
  const pressed = inp & ~f.prev;
  f.prev = inp;
  if (pressed & IN.L) tap(s, f, -1);
  if (pressed & IN.R) tap(s, f, 1);
  const act = pressed & (IN.J | IN.LT | IN.HV | IN.DG);
  if (act) { f.bufA |= act; f.bufT = P.buffer; }

  if (f.stop > 0) { f.stop--; return false; }
  if (f.dcd > 0) f.dcd--;
  if (f.drop > 0) f.drop--;
  f.t++;

  const dir = (inp & IN.R ? 1 : 0) - (inp & IN.L ? 1 : 0);
  if (f.run && (dir === 0 || dir !== f.tapDir)) f.run = 0;

  switch (f.st) {
    case 'free': free(s, f, inp, dir, ev); break;
    case 'land': groundFriction(f); if (f.t >= f.lag) setSt(f, 'free'); break;
    case 'dodge': dodge(s, f); break;
    case 'attack': attack(s, f, inp, dir, ev); break;
    case 'hitstun':
      groundFriction(f, P.hsFric);
      if (--f.hs <= 0) { setSt(f, 'free'); f.combo = 0; }
      break;
    case 'ko': groundFriction(f, P.hsFric); break;
    case 'victory': groundFriction(f); break;
  }

  if (f.bufT > 0) f.bufT--;
  if (f.bufT <= 0) f.bufA = 0;
  return true;
}

// --- Physique -------------------------------------------------------------

// Surfaces : plateformes statiques (0..n) et dessus des cloisons (100 + id)
function surfaceAt(s, idx) {
  if (idx < 100) return PLATS[idx];
  const id = idx - 100;
  if (s.props.walls[id].hp <= 0) return null;
  const p = PARTS[id];
  return { x1: p.x - p.hw, x2: p.x + p.hw, y: p.top };
}

export function findLanding(s, x, prevY, y, skipPlatforms) {
  if (y >= WU.floor) return { y: WU.floor, idx: -1 };
  if (skipPlatforms) return null;
  for (let i = 0; i < PLATS.length; i++) {
    const p = PLATS[i];
    if (prevY <= p.y && y >= p.y && x >= p.x1 && x <= p.x2) return { y: p.y, idx: i };
  }
  for (let i = 0; i < PARTS.length; i++) {
    const p = surfaceAt(s, 100 + i);
    if (p && prevY <= p.y && y >= p.y && x >= p.x1 && x <= p.x2) return { y: p.y, idx: 100 + i };
  }
  return null;
}

function supported(s, f) {
  if (f.plat < 0) return f.y >= WU.floor;
  const p = surfaceAt(s, f.plat);
  return !!p && f.x >= p.x1 && f.x <= p.x2;
}

function land(s, f, y, idx, ev) {
  const impact = f.vy;
  f.y = y; f.gr = 1; f.plat = idx; f.vy = 0;
  f.jumps = 1; f.adodge = 1; f.ff = 0;
  if (f.st === 'ko' || f.st === 'hitstun') {
    if (impact > px(7)) {
      f.vy = -idiv(impact * 38, 100); f.gr = 0; f.plat = -1;
      ev.push({ type: 'bounce', i: f.i, x: f.x, y, v: impact });
      return;
    }
  } else if (f.st === 'attack' && isAirAttack(f.atk.id)) {
    const a = W[f.wpn][f.atk.id];
    if (a.untilLand && f.atk.ph === 'active') ev.push({ type: 'slam', i: f.i, x: f.x, y, wpn: f.wpn });
    f.atk = null; setSt(f, 'land'); f.lag = a.landLag;
  }
  ev.push({ type: 'land', i: f.i, x: f.x, y, v: impact });
}

function wallBounce(f, ev, side) {
  if ((f.st === 'hitstun' || f.st === 'ko') && absI(f.vx) >= P.bounce) {
    f.vx = -idiv(f.vx, 2);
    ev.push({ type: 'wallbounce', i: f.i, x: f.x + side * P.hw, y: f.y - idiv(P.h, 2), v: absI(f.vx) });
  } else f.vx = 0;
}

export function physicsFighter(s, f, ev) {
  const prevX = f.x, prevY = f.y;
  const hover = f.st === 'dodge' && !f.gr;
  if (!f.gr && !hover) {
    f.vy += P.grav;
    let cap = P.maxFall;
    if (f.ff) { f.vy += P.grav; cap = P.fastFall; }
    if (f.st === 'attack' && f.atk && W[f.wpn][f.atk.id].plunge) cap = Math.max(cap, W[f.wpn][f.atk.id].plunge);
    if (f.st === 'ko' || f.st === 'hitstun') cap = P.fastFall;
    if (f.vy > cap) f.vy = cap;
  }
  f.x += f.vx;
  f.y += f.vy;

  // Murs de l'arène
  if (f.x - P.hw < WU.left) { f.x = WU.left + P.hw; wallBounce(f, ev, -1); }
  if (f.x + P.hw > WU.right) { f.x = WU.right - P.hw; wallBounce(f, ev, 1); }

  // Cloisons
  const h = fighterHeight(f);
  for (let i = 0; i < PARTS.length; i++) {
    const w = s.props.walls[i];
    if (w.hp <= 0) continue;
    const p = PARTS[i];
    if (f.y <= p.top + px(2) || f.y - h >= WU.floor) continue;
    if (f.x + P.hw <= p.x - p.hw || f.x - P.hw >= p.x + p.hw) continue;
    const flying = (f.st === 'hitstun' || f.st === 'ko') && absI(f.vx) >= PR.crashSpeed;
    if (flying) {
      damageWall(s, i, PR.crashDmg, f.x, f.y - idiv(h, 2), ev);
      if (w.hp <= 0) { f.vx = idiv(f.vx * 70, 100); continue; }
    }
    const side = prevX <= p.x ? -1 : 1;
    f.x = side < 0 ? p.x - p.hw - P.hw : p.x + p.hw + P.hw;
    if (flying) {
      f.vx = -idiv(f.vx, 3);
      ev.push({ type: 'wallbounce', i: f.i, x: p.x, y: f.y - idiv(h, 2), v: absI(f.vx) });
    } else f.vx = 0;
  }

  // Plafond
  if (f.y - P.h < WU.ceil) { f.y = WU.ceil + P.h; if (f.vy < 0) f.vy = 0; }

  // Sol et plateformes
  if (f.gr && !supported(s, f)) { f.gr = 0; f.plat = -1; }
  if (!f.gr && f.vy >= 0) {
    const l = findLanding(s, f.x, prevY, f.y, f.drop > 0);
    if (l) land(s, f, l.y, l.idx, ev);
  }
}

// Les deux combattants se repoussent doucement pour ne pas se superposer
export function separate(s) {
  const [a, b] = s.f;
  if (a.st === 'ko' || b.st === 'ko' || a.st === 'dodge' || b.st === 'dodge') return;
  const dx = b.x - a.x;
  if (absI(dx) >= P.hw * 2 - px(10)) return;
  if (a.y - P.h >= b.y || b.y - P.h >= a.y) return;
  const d = dx >= 0 ? 1 : -1;
  a.x -= d * P.push; b.x += d * P.push;
  for (const f of s.f) {
    if (f.x - P.hw < WU.left) f.x = WU.left + P.hw;
    if (f.x + P.hw > WU.right) f.x = WU.right - P.hw;
  }
}
