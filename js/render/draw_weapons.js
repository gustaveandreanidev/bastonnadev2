// Fonctions de dessin des armes. Repère local : la main est à l'origine,
// l'arme pointe vers +x, le tranchant (sens du coup) est du côté +y.
import { PAL } from './palette.js';

export const WEAPON_GEOM = {
  rapier: { len: 90, butt: 16, grip2: null },
  axe: { len: 76, butt: 14, grip2: -26 },
  spear: { len: 132, butt: 50, grip2: -38 },
  daggers: { len: 42, butt: 10, grip2: null, offhand: true },
  hammer: { len: 86, butt: 14, grip2: -30 },
  flail: { len: 72, butt: 10, grip2: null },
};

function outline(ctx, w = 2) {
  ctx.lineWidth = w;
  ctx.strokeStyle = PAL.ink;
  ctx.stroke();
}

function drawRapier(ctx, o) {
  // lame
  ctx.beginPath();
  ctx.moveTo(6, -2.6); ctx.lineTo(88, -0.6); ctx.lineTo(92, 0); ctx.lineTo(88, 0.6); ctx.lineTo(6, 2.6); ctx.closePath();
  ctx.fillStyle = PAL.steel; ctx.fill(); outline(ctx, 1.6);
  ctx.strokeStyle = PAL.steelBright; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(10, -0.7); ctx.lineTo(80, -0.3); ctx.stroke();
  if (o.glow) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = o.glowColor; ctx.globalAlpha = o.glow; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(90, 0); ctx.stroke(); ctx.restore();
  }
  // poignée
  ctx.beginPath(); ctx.roundRect(-13, -2.8, 13, 5.6, 2);
  ctx.fillStyle = PAL.leather; ctx.fill(); outline(ctx, 1.5);
  ctx.strokeStyle = PAL.leatherLight; ctx.lineWidth = 1;
  for (let i = -11; i < 0; i += 3) { ctx.beginPath(); ctx.moveTo(i, -2.5); ctx.lineTo(i + 2, 2.5); ctx.stroke(); }
  // arc de garde (protège-main)
  ctx.beginPath(); ctx.moveTo(4, -1); ctx.bezierCurveTo(2, 12, -12, 12, -15, 3);
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 4; ctx.stroke();
  ctx.strokeStyle = PAL.gold; ctx.lineWidth = 2; ctx.stroke();
  // coquille
  ctx.beginPath(); ctx.ellipse(4, 0, 3.5, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = PAL.gold; ctx.fill(); outline(ctx, 1.6);
  ctx.beginPath(); ctx.ellipse(3.2, -2, 1.2, 3.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = PAL.goldLight; ctx.fill();
  // quillons
  ctx.beginPath(); ctx.moveTo(4, -12); ctx.lineTo(4, 12);
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.stroke();
  ctx.strokeStyle = PAL.brass; ctx.lineWidth = 2.5; ctx.stroke();
  // pommeau
  ctx.beginPath(); ctx.arc(-15, 0, 4, 0, Math.PI * 2);
  ctx.fillStyle = PAL.gold; ctx.fill(); outline(ctx, 1.5);
}

function drawAxe(ctx, o) {
  // manche
  ctx.beginPath(); ctx.roundRect(-14, -3.2, 82, 6.4, 3);
  ctx.fillStyle = PAL.woodMid; ctx.fill(); outline(ctx, 2);
  ctx.strokeStyle = PAL.woodLight; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-10, -1.2); ctx.lineTo(60, -1.2); ctx.stroke();
  // lanières de cuir
  ctx.fillStyle = PAL.leather;
  for (const gx of [-10, -2, 6]) { ctx.beginPath(); ctx.roundRect(gx, -3.8, 4.5, 7.6, 1.5); ctx.fill(); outline(ctx, 1); }
  // fer : lame barbue côté +y, pointe arrière côté -y
  ctx.beginPath();
  ctx.moveTo(52, 3); ctx.lineTo(54, 10);
  ctx.quadraticCurveTo(46, 22, 44, 34);
  ctx.quadraticCurveTo(62, 36, 82, 26);
  ctx.quadraticCurveTo(76, 14, 72, 3);
  ctx.closePath();
  ctx.fillStyle = PAL.iron; ctx.fill(); outline(ctx, 2.2);
  // fil de la lame
  ctx.beginPath(); ctx.moveTo(45.5, 32); ctx.quadraticCurveTo(62, 34, 80, 25.5);
  ctx.strokeStyle = PAL.steelBright; ctx.lineWidth = 2.6; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(56, 10); ctx.quadraticCurveTo(62, 16, 70, 12);
  ctx.strokeStyle = PAL.ironLight; ctx.lineWidth = 1.5; ctx.stroke();
  // œil et pointe arrière
  ctx.beginPath(); ctx.moveTo(54, -3); ctx.lineTo(58, -14); ctx.lineTo(66, -14); ctx.lineTo(70, -3); ctx.closePath();
  ctx.fillStyle = PAL.iron; ctx.fill(); outline(ctx, 2);
  ctx.beginPath(); ctx.roundRect(51, -4.5, 22, 9, 2);
  ctx.fillStyle = PAL.ironLight; ctx.fill(); outline(ctx, 1.8);
  ctx.fillStyle = PAL.ink;
  for (const rx of [56, 68]) { ctx.beginPath(); ctx.arc(rx, 0, 1.4, 0, 6.3); ctx.fill(); }
  if (o.glow) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = o.glow;
    ctx.strokeStyle = o.glowColor; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(45.5, 32); ctx.quadraticCurveTo(62, 34, 80, 25.5); ctx.stroke();
    ctx.restore();
  }
}

function drawSpear(ctx, o) {
  // hampe
  ctx.beginPath(); ctx.roundRect(-50, -2.6, 154, 5.2, 2.6);
  ctx.fillStyle = PAL.woodMid; ctx.fill(); outline(ctx, 1.8);
  ctx.strokeStyle = PAL.woodLight; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-46, -1); ctx.lineTo(98, -1); ctx.stroke();
  // talon de fer
  ctx.beginPath(); ctx.moveTo(-50, -3); ctx.lineTo(-58, 0); ctx.lineTo(-50, 3); ctx.closePath();
  ctx.fillStyle = PAL.iron; ctx.fill(); outline(ctx, 1.4);
  // ruban aux couleurs du joueur
  const sway = o.sway || 0;
  ctx.beginPath(); ctx.moveTo(98, 0);
  ctx.quadraticCurveTo(90 - 6, 10 + sway * 4, 80 - 4 * sway, 20 + sway * 6);
  ctx.quadraticCurveTo(86, 10 + sway * 2, 96, 1);
  ctx.fillStyle = o.ribbon || PAL.cloth; ctx.fill(); outline(ctx, 1.4);
  // douille
  ctx.beginPath(); ctx.roundRect(98, -4, 12, 8, 2);
  ctx.fillStyle = PAL.iron; ctx.fill(); outline(ctx, 1.6);
  // fer en feuille
  ctx.beginPath();
  ctx.moveTo(108, 0); ctx.quadraticCurveTo(116, -9, 124, -6); ctx.lineTo(136, 0);
  ctx.lineTo(124, 6); ctx.quadraticCurveTo(116, 9, 108, 0); ctx.closePath();
  ctx.fillStyle = PAL.steel; ctx.fill(); outline(ctx, 1.8);
  ctx.beginPath(); ctx.moveTo(110, 0); ctx.lineTo(133, 0);
  ctx.strokeStyle = PAL.ironLight; ctx.lineWidth = 1.2; ctx.stroke();
  if (o.glow) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = o.glow;
    ctx.fillStyle = o.glowColor;
    ctx.beginPath(); ctx.ellipse(122, 0, 20, 9, 0, 0, 6.3); ctx.fill();
    ctx.restore();
  }
}

function drawDagger(ctx, o) {
  // lame à double tranchant
  ctx.beginPath();
  ctx.moveTo(5, -4); ctx.lineTo(36, -2.2); ctx.lineTo(44, 0); ctx.lineTo(36, 2.2); ctx.lineTo(5, 4); ctx.closePath();
  ctx.fillStyle = PAL.steel; ctx.fill(); outline(ctx, 1.6);
  ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(38, 0);
  ctx.strokeStyle = PAL.ironLight; ctx.lineWidth = 1.2; ctx.stroke();
  if (o.glow) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = o.glow;
    ctx.strokeStyle = o.glowColor; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(44, 0); ctx.stroke(); ctx.restore();
  }
  // garde recourbée
  ctx.beginPath(); ctx.moveTo(1, -9); ctx.quadraticCurveTo(6, 0, 1, 9);
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
  ctx.strokeStyle = PAL.brass; ctx.lineWidth = 2.6; ctx.stroke();
  // poignée et pommeau
  ctx.beginPath(); ctx.roundRect(-10, -2.6, 11, 5.2, 2);
  ctx.fillStyle = PAL.leather; ctx.fill(); outline(ctx, 1.4);
  ctx.beginPath(); ctx.arc(-11, 0, 3.2, 0, 6.3);
  ctx.fillStyle = PAL.brass; ctx.fill(); outline(ctx, 1.4);
}

function drawHammer(ctx, o) {
  // manche
  ctx.beginPath(); ctx.roundRect(-14, -3.4, 82, 6.8, 3);
  ctx.fillStyle = PAL.woodMid; ctx.fill(); outline(ctx, 2);
  ctx.strokeStyle = PAL.woodLight; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-10, -1.3); ctx.lineTo(60, -1.3); ctx.stroke();
  ctx.fillStyle = PAL.leather;
  for (const gx of [-12, -4]) { ctx.beginPath(); ctx.roundRect(gx, -4, 6, 8, 1.5); ctx.fill(); outline(ctx, 1); }
  // langlets de fer
  ctx.beginPath(); ctx.rect(46, -4.2, 16, 8.4); ctx.fillStyle = PAL.iron; ctx.fill(); outline(ctx, 1.5);
  // tête : masse côté +y (frappe), bec côté -y
  ctx.beginPath(); ctx.roundRect(60, -9, 24, 36, 4);
  ctx.fillStyle = PAL.iron; ctx.fill(); outline(ctx, 2.4);
  ctx.beginPath(); ctx.roundRect(57, 18, 30, 12, 3);
  ctx.fillStyle = PAL.ironLight; ctx.fill(); outline(ctx, 2.2);
  ctx.fillStyle = PAL.steelBright; ctx.fillRect(60, 26, 24, 2.5);
  ctx.beginPath(); ctx.moveTo(62, -9); ctx.lineTo(72, -26); ctx.lineTo(82, -9); ctx.closePath();
  ctx.fillStyle = PAL.iron; ctx.fill(); outline(ctx, 2);
  ctx.beginPath(); ctx.moveTo(84, -3); ctx.lineTo(92, 0); ctx.lineTo(84, 3); ctx.closePath();
  ctx.fillStyle = PAL.ironLight; ctx.fill(); outline(ctx, 1.5);
  ctx.fillStyle = PAL.ink;
  for (const [rx, ry] of [[66, -2], [78, -2], [66, 10], [78, 10]]) { ctx.beginPath(); ctx.arc(rx, ry, 1.6, 0, 6.3); ctx.fill(); }
  if (o.glow) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = o.glow;
    ctx.strokeStyle = o.glowColor; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.roundRect(56, -12, 32, 44, 6); ctx.stroke();
    ctx.restore();
  }
}

function drawFlail(ctx, o) {
  // manche
  ctx.beginPath(); ctx.roundRect(-12, -3.4, 38, 6.8, 3);
  ctx.fillStyle = PAL.woodMid; ctx.fill(); outline(ctx, 2);
  ctx.beginPath(); ctx.roundRect(-12, -4, 9, 8, 2); ctx.fillStyle = PAL.leather; ctx.fill(); outline(ctx, 1.2);
  ctx.beginPath(); ctx.roundRect(22, -5, 8, 10, 2); ctx.fillStyle = PAL.iron; ctx.fill(); outline(ctx, 1.6);
  // la chaîne pend sous l'effet de la gravité hors des attaques
  const hang = o.hang || 0;
  const ang = o.angle || 0;
  const gx = Math.sin(ang), gy = Math.cos(ang);
  let dx = (1 - hang) + hang * gx, dy = hang * gy;
  const dl = Math.hypot(dx, dy) || 1;
  dx /= dl; dy /= dl;
  const L = 42;
  const bx = 31 + dx * L, by = dy * L;
  const cx = 31 + dx * L * 0.5 + gx * 8 * hang, cy = dy * L * 0.5 + gy * 8 * hang;
  ctx.fillStyle = PAL.ironLight; ctx.strokeStyle = PAL.ink; ctx.lineWidth = 1.4;
  for (let k = 0; k <= 7; k++) {
    const t = k / 7;
    const px = (1 - t) * (1 - t) * 31 + 2 * (1 - t) * t * cx + t * t * bx;
    const py = 2 * (1 - t) * t * cy + t * t * by;
    ctx.beginPath(); ctx.ellipse(px, py, 3.2, 2.2, Math.atan2(dy, dx) + (k % 2) * 1.2, 0, 6.3); ctx.fill(); ctx.stroke();
  }
  // boule à pointes
  ctx.save(); ctx.translate(bx, by); ctx.rotate((o.spin || 0));
  ctx.fillStyle = PAL.iron;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - 0.25) * 8, Math.sin(a - 0.25) * 8);
    ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
    ctx.lineTo(Math.cos(a + 0.25) * 8, Math.sin(a + 0.25) * 8);
    ctx.closePath(); ctx.fill(); outline(ctx, 1.5);
  }
  ctx.beginPath(); ctx.arc(0, 0, 10, 0, 6.3);
  ctx.fillStyle = PAL.iron; ctx.fill(); outline(ctx, 2.2);
  ctx.beginPath(); ctx.arc(-3, -3, 3.5, 0, 6.3); ctx.fillStyle = PAL.ironLight; ctx.fill();
  if (o.glow) {
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = o.glow;
    ctx.strokeStyle = o.glowColor; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 17, 0, 6.3); ctx.stroke();
  }
  ctx.restore();
}

const DRAW = { rapier: drawRapier, axe: drawAxe, spear: drawSpear, daggers: drawDagger, hammer: drawHammer, flail: drawFlail };

// Dessine l'arme à la main (hx, hy), direction angle écran `ang` (radians, 0 = +x)
export function drawWeapon(ctx, id, hx, hy, ang, o = {}) {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(ang);
  ctx.lineJoin = 'round';
  DRAW[id](ctx, { ...o, angle: ang });
  ctx.restore();
}
