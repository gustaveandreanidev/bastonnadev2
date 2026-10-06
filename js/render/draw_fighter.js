// Stickman animé : squelette à segments, poses interpolées, squash & stretch,
// flash blanc, traînées d'arme, images rémanentes d'esquive.
import { PAL } from './palette.js';
import { IDLE, LOCO, HITSTUN, VICTORY, attackPose, KEYS } from './poses.js';
import { drawWeapon, WEAPON_GEOM } from './draw_weapons.js';
import { U } from '../sim/units.js';
import { DG, W } from '../sim/tuning.js';
import { PHYS } from '../config.js';

const D = Math.PI / 180;
const SEG = { thigh: 26, shin: 26, torso: 34, upper: 20, fore: 20, head: 12 };

export class FighterAnim {
  constructor() {
    this.pose = null;
    this.walk = 0;
    this.sq = 0; this.sqv = 0;
    this.flash = 0;
    this.trail = [];
    this.ghosts = [];
    this.ghostT = 0;
    this.spin = 0;
    this.koRot = 0;
    this.hang = 1;
    this.tip = { x: 0, y: 0 };
    this.head = { x: 0, y: 0 };
    this.time = 0;
  }
  kick(v) { this.sqv += v; }
}

// --- pose cible ---------------------------------------------------------

function targetPose(f, a, tf, tick) {
  const wp = f.dummy ? 'none' : f.wpn;
  const idle = IDLE[wp];
  const t = a.time;
  const speed = Math.abs(f.vx) / U;
  let p;
  switch (f.st) {
    case 'attack':
      p = f.atk ? attackPose(wp, f.atk, idle, tf) : { ...idle };
      if (!f.gr && f.atk && f.atk.ph !== 'active') { p.ft = Math.max(p.ft, 40); p.bs = Math.min(p.bs, -40); }
      break;
    case 'hitstun':
      p = { ...HITSTUN };
      p.fu += Math.sin(t * 31) * 25; p.bu += Math.cos(t * 27) * 25; p.fs += Math.sin(t * 23) * 15;
      break;
    case 'ko':
      p = { ...HITSTUN };
      if (f.gr && Math.abs(f.vy) < 50) {
        Object.assign(p, { lean: 0, head: -10, fu: 160, fl: 170, bu: 140, bl: 160, ft: 6, fs: 0, bt: -4, bs: 2, w: 150, dy: 0 });
      }
      break;
    case 'victory': {
      p = { ...VICTORY[wp] };
      const b = Math.abs(Math.sin(t * 5));
      p.dy = -b * 5; p.fu += Math.sin(t * 5) * 6; p.fl += Math.sin(t * 5) * 8; p.w += Math.sin(t * 5) * 6;
      break;
    }
    case 'dodge': p = { ...idle, ...LOCO.dodge }; break;
    case 'land': p = { ...idle, ...LOCO.land }; break;
    default:
      p = { ...idle };
      if (!f.gr) {
        const dj = tick - f.djT;
        if (dj >= 0 && dj < 22) Object.assign(p, LOCO.djump);
        else Object.assign(p, f.vy < 0 ? LOCO.jump : LOCO.fall);
        if (f.vy >= 0) { p.bu -= 40; p.bl -= 60; }
      } else if (f.crouch) {
        Object.assign(p, LOCO.crouch);
        p.fu += 6;
      } else if (speed > 0.4) {
        const run = speed > PHYS.walkSpeed + 0.6;
        const A = run ? 48 : 30, B = run ? 78 : 44;
        const ph = a.walk;
        p.ft = A * Math.sin(ph); p.fs = p.ft - B * Math.max(0, Math.cos(ph)) - 4;
        p.bt = A * Math.sin(ph + Math.PI); p.bs = p.bt - B * Math.max(0, Math.cos(ph + Math.PI)) - 4;
        p.lean += run ? 16 : 4;
        p.dy = (run ? 4 : 2) * Math.abs(Math.cos(ph)) - (run ? 3 : 1);
        if (!p.two && wp !== 'rapier') { p.bu = -35 * Math.sin(ph); p.bl = p.bu + (run ? 70 : 30); }
        if (run) { p.fu -= 8; p.w += wp === 'axe' ? -20 : 6; }
      } else {
        p.dy = Math.sin(t * 2.6) * 1.3;
        p.fu += Math.sin(t * 2.6) * 2;
        p.w += Math.sin(t * 2.6 + 0.5) * 2;
      }
  }
  return p;
}

// --- squelette -------------------------------------------------------------

const dv = (deg) => [Math.sin(deg * D), Math.cos(deg * D)];

function ik(sx, sy, tx, ty, l1, l2) {
  const dx = tx - sx, dy = ty - sy;
  const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
  const base = Math.atan2(dy, dx);
  const cosA = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const off = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const e1 = [sx + Math.cos(base + off) * l1, sy + Math.sin(base + off) * l1];
  const e2 = [sx + Math.cos(base - off) * l1, sy + Math.sin(base - off) * l1];
  const e = e1[1] > e2[1] ? e1 : e2;
  const ux = Math.hypot(dx, dy) > l1 + l2 ? sx + (dx / Math.hypot(dx, dy)) * (l1 + l2) : tx;
  const uy = Math.hypot(dx, dy) > l1 + l2 ? sy + (dy / Math.hypot(dx, dy)) * (l1 + l2) : ty;
  return { elbow: e, hand: [ux, uy] };
}

export function skeleton(p, grounded, wpn, lying) {
  const [ftx, fty] = dv(p.ft), [fsx, fsy] = dv(p.fs);
  const [btx, bty] = dv(p.bt), [bsx, bsy] = dv(p.bs);
  let hipH = grounded
    ? Math.max(SEG.thigh * fty + SEG.shin * fsy, SEG.thigh * bty + SEG.shin * bsy)
    : 50;
  if (lying) hipH = 9;
  hipH = Math.max(hipH, 9);
  // au sol, les pieds restent posés : le bassin ne peut que monter
  const hip = [0, -hipH + (grounded ? Math.min(0, p.dy) : p.dy)];
  const lean = p.lean * D;
  const neck = [hip[0] + Math.sin(lean) * SEG.torso, hip[1] - Math.cos(lean) * SEG.torso];
  const hl = (p.lean + p.head) * D;
  const head = [neck[0] + Math.sin(hl) * (SEG.head + 3), neck[1] - Math.cos(hl) * (SEG.head + 3)];
  const sh = [neck[0] - Math.sin(lean) * 4, neck[1] + Math.cos(lean) * 4];
  const [fux, fuy] = dv(p.fu), [flx, fly] = dv(p.fl);
  const fe = [sh[0] + fux * SEG.upper, sh[1] + fuy * SEG.upper];
  const fh = [fe[0] + flx * SEG.fore, fe[1] + fly * SEG.fore];
  let be, bh;
  const geom = WEAPON_GEOM[wpn];
  if (p.two && geom && geom.grip2 != null) {
    const [wx, wy] = dv(p.w);
    const r = ik(sh[0] - 3, sh[1], fh[0] + wx * geom.grip2, fh[1] + wy * geom.grip2, SEG.upper, SEG.fore);
    be = r.elbow; bh = r.hand;
  } else {
    const [bux, buy] = dv(p.bu), [blx, bly] = dv(p.bl);
    be = [sh[0] - 3 + bux * SEG.upper, sh[1] + buy * SEG.upper];
    bh = [be[0] + blx * SEG.fore, be[1] + bly * SEG.fore];
  }
  const fk = [hip[0] + ftx * SEG.thigh, hip[1] + fty * SEG.thigh];
  const ff = [fk[0] + fsx * SEG.shin, fk[1] + fsy * SEG.shin];
  const bk = [hip[0] - 2 + btx * SEG.thigh, hip[1] + bty * SEG.thigh];
  const bf = [bk[0] + bsx * SEG.shin, bk[1] + bsy * SEG.shin];
  return { hip, neck, head, sh, fe, fh, be, bh, fk, ff, bk, bf };
}

// --- dessin ----------------------------------------------------------------

function limb(ctx, pts, w, color) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = w + 5; ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
}

function drawHead(ctx, sk, p, col, dummy, white) {
  const [hx, hy] = sk.head;
  const r = SEG.head;
  ctx.beginPath(); ctx.arc(hx, hy, r, 0, Math.PI * 2);
  ctx.fillStyle = white ? '#fff' : dummy ? '#c9a560' : col.main;
  ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = PAL.ink; ctx.stroke();
  const a = (p.lean + p.head) * D;
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(a);
  if (dummy) {
    // sac de toile : coutures en croix
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2;
    for (const ex of [1, 7]) {
      ctx.beginPath(); ctx.moveTo(ex - 2.5, -4.5); ctx.lineTo(ex + 2.5, 0.5); ctx.moveTo(ex + 2.5, -4.5); ctx.lineTo(ex - 2.5, 0.5); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(-8, 7); ctx.lineTo(9, 7); ctx.stroke();
    ctx.restore();
    return;
  }
  // casque (calotte de fer + nasal + plumet)
  ctx.beginPath(); ctx.arc(0, 0, r + 2.5, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath();
  ctx.fillStyle = white ? '#fff' : PAL.iron; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = PAL.ink; ctx.stroke();
  ctx.beginPath(); ctx.arc(-1, -2, r - 3, Math.PI * 1.15, Math.PI * 1.55);
  ctx.strokeStyle = white ? '#fff' : PAL.ironLight; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-r - 3, -2.5, 2 * r + 6, 5, 2);
  ctx.fillStyle = white ? '#fff' : PAL.ironLight; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = PAL.ink; ctx.stroke();
  ctx.beginPath(); ctx.roundRect(r - 4, -1, 4, 10, 1.5);
  ctx.fillStyle = white ? '#fff' : PAL.iron; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-2, -r - 2); ctx.quadraticCurveTo(-10, -r - 14, -20, -r - 8); ctx.quadraticCurveTo(-11, -r - 6, -5, -r + 1); ctx.closePath();
  ctx.fillStyle = white ? '#fff' : col.light; ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
  // œil
  ctx.beginPath(); ctx.arc(6, 4.5, 2.2, 0, Math.PI * 2); ctx.fillStyle = PAL.ink; ctx.fill();
  ctx.restore();
}

function bodyTransform(f, a, x, y, p) {
  const sx = 1 + a.sq, sy = 1 - a.sq;
  return { x, y, face: f.face, sx, sy, rot: (p.rot || 0) * D };
}

function toWorld(T, hip, lx, ly) {
  const dx = lx - hip[0], dy = ly - hip[1];
  const c = Math.cos(T.rot), s = Math.sin(T.rot);
  const rx = hip[0] + dx * c - dy * s, ry = hip[1] + dx * s + dy * c;
  return [T.x + rx * T.sx * T.face, T.y + ry * T.sy];
}

function paint(ctx, f, sk, p, col, opts) {
  const white = opts.white;
  const main = white ? '#ffffff' : col.main;
  const back = white ? '#f2f2f2' : col.dark;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  limb(ctx, [sk.hip, sk.bk, sk.bf], 7.5, back);
  if (!p.two) limb(ctx, [sk.sh, sk.be, sk.bh], 6.5, back);
  if (!f.dummy && WEAPON_GEOM[f.wpn].offhand) {
    // seconde dague dans la main arrière, dans l'axe de l'avant-bras
    drawWeapon(ctx, f.wpn, sk.bh[0], sk.bh[1], Math.PI / 2 - (p.bl + 12) * D, { glow: opts.glow, glowColor: col.light });
    ctx.beginPath(); ctx.arc(sk.bh[0], sk.bh[1], 4, 0, 6.3);
    ctx.fillStyle = back; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = PAL.ink; ctx.stroke();
  }
  limb(ctx, [sk.hip, sk.neck], 10, main);
  limb(ctx, [sk.hip, sk.fk, sk.ff], 7.5, main);
  if (!f.dummy) {
    drawWeapon(ctx, f.wpn, sk.fh[0], sk.fh[1], Math.PI / 2 - p.w * D, {
      glow: opts.glow, glowColor: col.light, ribbon: col.main, sway: Math.sin(opts.time * 7),
      hang: opts.hang, spin: opts.time * 4,
    });
  }
  if (p.two) limb(ctx, [sk.sh, sk.be, sk.bh], 6.5, back);
  limb(ctx, [sk.sh, sk.fe, sk.fh], 7, main);
  // mains
  for (const h of p.two ? [sk.bh, sk.fh] : [sk.fh]) {
    ctx.beginPath(); ctx.arc(h[0], h[1], 4.2, 0, 6.3);
    ctx.fillStyle = main; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = PAL.ink; ctx.stroke();
  }
  drawHead(ctx, sk, p, col, f.dummy, white);
}

// Met à jour l'animation (pose lissée, ressorts) puis dessine.
export function drawFighter(ctx, f, a, x, y, col, opts) {
  const dt = opts.dt;
  a.time += dt;
  const target = targetPose(f, a, opts.tf || 0, opts.tick || 0);

  // phase de marche
  a.walk += (Math.abs(f.vx) / U) * dt * 60 * 0.075;

  // rotations spéciales (salto du double saut, vrille du KO)
  const dj = (opts.tick || 0) - f.djT;
  let rot = target.rot || 0;
  if (f.st === 'free' && !f.gr && dj >= 0 && dj < 22) rot = -360 * ((dj + (opts.tf || 0)) / 22);
  const lying = f.st === 'ko' && f.gr && Math.abs(f.vy) < 50;
  if (f.st === 'ko') {
    if (!lying) a.koRot -= dt * 720;
    rot = lying ? -90 : a.koRot;
  } else a.koRot = 0;

  // lissage de la pose
  if (!a.pose) a.pose = { ...target };
  const k = f.st === 'attack' ? 0.6 : f.st === 'hitstun' ? 0.5 : 0.28;
  const kk = 1 - Math.pow(1 - k, dt * 60);
  for (const key of KEYS) a.pose[key] += (target[key] - a.pose[key]) * kk;
  a.pose.two = target.two;
  a.pose.rot = rot;
  // la chaîne du fléau se tend pendant les attaques et pend au repos
  const hangT = f.st === 'attack' ? 0 : 1;
  a.hang += (hangT - a.hang) * (1 - Math.pow(hangT ? 0.9 : 0.5, dt * 60));

  // ressort de squash & stretch
  a.sqv += (-a.sq * 260 - a.sqv * 14) * dt;
  a.sq += a.sqv * dt;
  a.sq = Math.max(-0.3, Math.min(0.3, a.sq));
  if (a.flash > 0) a.flash -= dt;

  const p = a.pose;
  const sk = skeleton(p, f.gr || f.st === 'land', f.wpn, lying);
  const T = bodyTransform(f, a, x + (opts.shakeX || 0), y, p);

  // traînée : enregistre la pointe de l'arme pendant les attaques
  if (!f.dummy) {
    const geom = WEAPON_GEOM[f.wpn];
    const [wx, wy] = [Math.sin(p.w * D), Math.cos(p.w * D)];
    const tip = toWorld(T, sk.hip, sk.fh[0] + wx * geom.len, sk.fh[1] + wy * geom.len);
    const mid = toWorld(T, sk.hip, sk.fh[0] + wx * geom.len * 0.45, sk.fh[1] + wy * geom.len * 0.45);
    a.tip.x = tip[0]; a.tip.y = tip[1];
    const atk = f.atk;
    const trailing = f.st === 'attack' && atk && (atk.ph === 'active' || (atk.ph === 'recovery' && atk.t < 5) || (atk.ph === 'startup' && atk.t > W[f.wpn][atk.id].startup - 2));
    if (trailing) a.trail.push({ x1: tip[0], y1: tip[1], x2: mid[0], y2: mid[1], age: 0, heavy: atk.id.endsWith('heavy') });
  }
  for (const s of a.trail) s.age += dt;
  while (a.trail.length && (a.trail[0].age > 0.13 || a.trail.length > 14)) a.trail.shift();
  const hd = toWorld(T, sk.hip, sk.head[0], sk.head[1]);
  a.head.x = hd[0]; a.head.y = hd[1];

  // images rémanentes d'esquive
  if (f.st === 'dodge' || (f.st === 'attack' && f.atk && f.atk.ph === 'active' && Math.abs(f.vx) > 7 * U)) {
    a.ghostT -= dt;
    if (a.ghostT <= 0) { a.ghostT = 0.025; a.ghosts.push({ T: { ...T }, p: { ...p }, sk, life: 0.22 }); }
  }
  for (const g of a.ghosts) g.life -= dt;
  while (a.ghosts.length && a.ghosts[0].life <= 0) a.ghosts.shift();

  // dessin
  for (const g of a.ghosts) drawGhost(ctx, f, g, col);
  const invuln = f.st === 'dodge' && f.t >= DG.inv0 && f.t <= DG.inv1;
  ctx.save();
  ctx.translate(T.x, T.y);
  ctx.scale(T.face * T.sx, T.sy);
  ctx.translate(sk.hip[0], sk.hip[1]); ctx.rotate(T.rot); ctx.translate(-sk.hip[0], -sk.hip[1]);
  if (invuln) ctx.globalAlpha = 0.55;
  if (opts.alpha != null) ctx.globalAlpha *= opts.alpha;
  paint(ctx, f, sk, p, col, { white: a.flash > 0, glow: opts.glow || 0, time: a.time, hang: a.hang });
  ctx.restore();
}

function drawGhost(ctx, f, g, col) {
  const { T, sk } = g;
  ctx.save();
  ctx.globalAlpha = Math.max(0, g.life / 0.22) * 0.35;
  ctx.translate(T.x, T.y);
  ctx.scale(T.face * T.sx, T.sy);
  ctx.translate(sk.hip[0], sk.hip[1]); ctx.rotate(T.rot); ctx.translate(-sk.hip[0], -sk.hip[1]);
  ctx.strokeStyle = col.light; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 9;
  ctx.beginPath();
  for (const seg of [[sk.hip, sk.bk, sk.bf], [sk.hip, sk.fk, sk.ff], [sk.hip, sk.neck], [sk.sh, sk.fe, sk.fh], [sk.sh, sk.be, sk.bh]]) {
    ctx.moveTo(seg[0][0], seg[0][1]);
    for (let i = 1; i < seg.length; i++) ctx.lineTo(seg[i][0], seg[i][1]);
  }
  ctx.stroke();
  ctx.beginPath(); ctx.arc(sk.head[0], sk.head[1], 12, 0, 6.3); ctx.fillStyle = col.light; ctx.fill();
  ctx.restore();
}

// Ruban lumineux suivant la pointe de l'arme
export function drawTrail(ctx, a, col) {
  const tr = a.trail;
  if (tr.length < 2) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 1; i < tr.length; i++) {
    const s0 = tr[i - 1], s1 = tr[i];
    const al = (1 - s1.age / 0.13) * (i / tr.length);
    if (al <= 0) continue;
    ctx.globalAlpha = al * (s1.heavy ? 0.85 : 0.65);
    ctx.fillStyle = s1.heavy ? col.light : '#fff6e0';
    ctx.beginPath();
    ctx.moveTo(s0.x1, s0.y1); ctx.lineTo(s1.x1, s1.y1); ctx.lineTo(s1.x2, s1.y2); ctx.lineTo(s0.x2, s0.y2);
    ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
