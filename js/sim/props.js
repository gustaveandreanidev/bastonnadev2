// Décors simulés : cloisons cassables, tonneaux qui roulent, chopes projetées.
import { P, PR, WU, PARTS, W } from './tuning.js';
import { absI, sign, idiv, clampI, rngRange } from './units.js';
import { applyHit } from './combat.js';
import { hurtable, findLanding, fighterHeight } from './fighter.js';

const overlap = (a, b) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;

export function wallRect(i) {
  const p = PARTS[i];
  return { x1: p.x - p.hw, y1: p.top, x2: p.x + p.hw, y2: WU.floor };
}

export function barrelRect(b) {
  const B = PR.barrel;
  if (b.st === 0) return { x1: b.x - B.hw, y1: b.y - B.h, x2: b.x + B.hw, y2: b.y };
  return { x1: b.x - B.r, y1: b.y - 2 * B.r, x2: b.x + B.r, y2: b.y };
}

export function mugRect(m) {
  const r = PR.mug.r;
  return { x1: m.x - r, y1: m.y - 2 * r, x2: m.x + r, y2: m.y };
}

const fighterBox = (f) => {
  const h = fighterHeight(f);
  return { x1: f.x - P.hw, y1: f.y - h, x2: f.x + P.hw, y2: f.y };
};

export function damageWall(s, id, dmg, x, y, ev) {
  const w = s.props.walls[id];
  if (w.hp <= 0) return;
  const before = w.hp;
  w.hp = Math.max(0, w.hp - dmg);
  const half = idiv(PR.partHp, 2);
  if (w.hp === 0) ev.push({ type: 'wallBreak', id, x, y });
  else if (before > half && w.hp <= half) ev.push({ type: 'wallCrack', id, x, y });
  else ev.push({ type: 'wallHit', id, x, y });
}

// Un coup d'arme touche les décors (une seule fois par attaque et par objet)
export function hitProps(s, f, box, ev) {
  const k = f.atk;
  const a = W[f.wpn][k.id];
  const cx = (r) => idiv(Math.max(box.x1, r.x1) + Math.min(box.x2, r.x2), 2);
  const cy = (r) => idiv(Math.max(box.y1, r.y1) + Math.min(box.y2, r.y2), 2);
  let touched = false;

  for (let i = 0; i < s.props.walls.length; i++) {
    const w = s.props.walls[i];
    if (w.hp <= 0 || k.props.includes(i)) continue;
    const r = wallRect(i);
    if (!overlap(box, r)) continue;
    k.props.push(i);
    damageWall(s, i, a.prop, cx(r), cy(r), ev);
    touched = true;
  }
  for (const b of s.props.barrels) {
    if (b.st === 2 || k.props.includes(10 + b.id)) continue;
    const r = barrelRect(b);
    if (!overlap(box, r)) continue;
    k.props.push(10 + b.id);
    const B = PR.barrel;
    const speed = clampI(B.min + idiv(absI(a.kbx) * B.fromKb, 100), B.min, B.max);
    b.vx = f.face * speed; b.vy = -B.hop; b.st = 1; b.gr = 0; b.owner = f.i;
    ev.push({ type: 'barrelHit', id: b.id, x: cx(r), y: cy(r), src: f.i });
    touched = true;
  }
  for (const m of s.props.mugs) {
    if (m.st === 2 || k.props.includes(20 + m.id)) continue;
    const r = mugRect(m);
    if (!overlap(box, r)) continue;
    k.props.push(20 + m.id);
    m.vx = f.face * PR.mug.speed; m.vy = -PR.mug.lift - rngRange(s, 0, 150); m.st = 1; m.owner = f.i;
    ev.push({ type: 'mugHit', id: m.id, x: m.x, y: m.y - PR.mug.r, src: f.i });
    touched = true;
  }
  if (touched && f.stop < 3) f.stop = 3;
}

function burstBarrel(b, ev) {
  b.st = 2;
  ev.push({ type: 'barrelBurst', id: b.id, x: b.x, y: b.y - PR.barrel.r, vx: b.vx });
}

function shatterMug(m, ev) {
  m.st = 2;
  ev.push({ type: 'mugBreak', id: m.id, x: m.x, y: m.y - PR.mug.r, vx: m.vx, vy: m.vy });
}

function updateBarrel(s, b, ev) {
  const B = PR.barrel;
  const prevY = b.y;
  if (!b.gr) { b.vy += P.grav; if (b.vy > P.maxFall) b.vy = P.maxFall; }
  b.x += b.vx; b.y += b.vy;
  b.rot = (b.rot + b.vx) % 10000000;

  if (b.gr) {
    const l = findLanding(s, b.x, b.y - 1, b.y, false);
    if (!l || l.y !== b.y) b.gr = 0;
  }
  if (!b.gr && b.vy >= 0) {
    const l = findLanding(s, b.x, prevY, b.y, false);
    if (l) { b.y = l.y; b.vy = 0; b.gr = 1; }
  }
  if (b.gr) b.vx -= sign(b.vx) * Math.min(absI(b.vx), B.fric);

  // Murs de l'arène et cloisons
  const hitArena = b.x - B.r < WU.left || b.x + B.r > WU.right;
  if (hitArena) {
    b.x = clampI(b.x, WU.left + B.r, WU.right - B.r);
    if (absI(b.vx) >= B.burst) { burstBarrel(b, ev); return; }
    b.vx = -idiv(b.vx, 2);
  }
  const r = barrelRect(b);
  for (let i = 0; i < s.props.walls.length; i++) {
    if (s.props.walls[i].hp <= 0 || !overlap(r, wallRect(i))) continue;
    damageWall(s, i, B.wallDmg, PARTS[i].x, b.y - B.r, ev);
    burstBarrel(b, ev);
    return;
  }

  // Combattants
  if (absI(b.vx) >= B.harm) {
    for (const f of s.f) {
      if (f.i === b.owner || !hurtable(s, f) || !overlap(r, fighterBox(f))) continue;
      applyHit(s, b.owner, f, {
        dmg: B.dmg, kbx: sign(b.vx) * B.kbx, kby: B.kby, hs: B.hs, stop: B.stop,
        x: idiv(b.x + f.x, 2), y: b.y - B.r, heavy: 1, wpn: '', kind: 'barrel',
      }, ev);
      burstBarrel(b, ev);
      return;
    }
  }
  if (b.gr && absI(b.vx) < B.fric * 2) { b.vx = 0; b.st = 3; b.owner = -1; }
}

function updateMug(s, m, ev) {
  const M = PR.mug;
  const prevY = m.y;
  m.vy += M.grav;
  m.x += m.vx; m.y += m.vy;
  m.rot = (m.rot + sign(m.vx) * 23 + 360) % 360;
  if (m.x - M.r < WU.left || m.x + M.r > WU.right) { m.x = clampI(m.x, WU.left + M.r, WU.right - M.r); shatterMug(m, ev); return; }
  if (m.y - 2 * M.r < WU.ceil) { m.y = WU.ceil + 2 * M.r; m.vy = 0; }
  const r = mugRect(m);
  for (let i = 0; i < s.props.walls.length; i++) {
    if (s.props.walls[i].hp > 0 && overlap(r, wallRect(i))) { shatterMug(m, ev); return; }
  }
  for (const f of s.f) {
    if (f.i === m.owner || !hurtable(s, f) || !overlap(r, fighterBox(f))) continue;
    applyHit(s, m.owner, f, {
      dmg: M.dmg, kbx: sign(m.vx) * M.kbx, kby: M.kby, hs: M.hs, stop: M.stop,
      x: m.x, y: m.y - M.r, heavy: 0, wpn: '', kind: 'mug',
    }, ev);
    shatterMug(m, ev);
    return;
  }
  if (m.vy >= 0) {
    const l = findLanding(s, m.x, prevY, m.y, false);
    if (l) { m.y = l.y; shatterMug(m, ev); }
  }
}

export function updateProps(s, ev) {
  for (const b of s.props.barrels) if (b.st === 1) updateBarrel(s, b, ev);
  for (const m of s.props.mugs) if (m.st === 1) updateMug(s, m, ev);
}
