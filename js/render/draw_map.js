// La Taverne : fonctions de dessin du décor (une par élément).
// Le fond statique est pré-rendu une fois dans un canvas hors écran.
import { PAL } from './palette.js';
import { rrect, seeded, makeGlow } from '../core/util.js';
import {
  WORLD, PLATFORMS, PARTITIONS, CANDLES, SCONCES, CHANDELIER, FIREPLACE,
} from '../sim/map.js';
import { U } from '../sim/units.js';
import { PR } from '../sim/tuning.js';

const { floor: FLOOR } = WORLD;

function ol(ctx, w = 3) { ctx.lineWidth = w; ctx.strokeStyle = PAL.ink; ctx.stroke(); }

// --- éléments statiques --------------------------------------------------

function drawStoneWall(ctx, x0, y0, x1, y1, rnd, base = [69, 67, 77], h = 30) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#1d1b22'); g.addColorStop(1, '#2c2a33');
  ctx.fillStyle = g; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  let row = 0;
  for (let y = y0; y < y1; y += h, row++) {
    let x = x0 - (row % 2 ? 26 : 0) - rnd() * 10;
    while (x < x1) {
      const w = 46 + rnd() * 34;
      const v = 0.72 + rnd() * 0.3;
      const dark = 0.55 + 0.45 * ((y - y0) / (y1 - y0 + 1));
      ctx.fillStyle = `rgb(${base[0] * v * dark | 0},${base[1] * v * dark | 0},${base[2] * v * dark | 0})`;
      rrect(ctx, x + 2, y + 2, w - 4, h - 4, 5);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + 6, y + 4); ctx.lineTo(x + w - 8, y + 4); ctx.stroke();
      x += w;
    }
  }
}

function drawPlanks(ctx, x0, y0, x1, y1, rnd, vertical, colA, colB) {
  if (vertical) {
    for (let x = x0; x < x1; x += 34) {
      ctx.fillStyle = rnd() < 0.5 ? colA : colB;
      ctx.fillRect(x, y0, 34, y1 - y0);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x, y0, 2.5, y1 - y0);
      ctx.fillStyle = 'rgba(255,220,170,0.06)'; ctx.fillRect(x + 4, y0, 3, y1 - y0);
      for (let k = 0; k < 2; k++) {
        ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1.2;
        const gx = x + 8 + rnd() * 20;
        ctx.beginPath(); ctx.moveTo(gx, y0 + 6); ctx.bezierCurveTo(gx + 4, y0 + 40, gx - 4, y1 - 40, gx + 2, y1 - 6); ctx.stroke();
      }
    }
  } else {
    let x = x0;
    for (let y = y0, r = 0; y < y1; y += 20, r++) {
      x = x0 - rnd() * 120;
      while (x < x1) {
        const w = 120 + rnd() * 160;
        ctx.fillStyle = rnd() < 0.5 ? colA : colB;
        ctx.fillRect(x, y, w, 20);
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x, y, 2, 20); ctx.fillRect(x, y + 18, w, 2);
        ctx.fillStyle = PAL.ink;
        ctx.beginPath(); ctx.arc(x + 6, y + 10, 1.4, 0, 6.3); ctx.fill();
        x += w;
      }
    }
  }
}

function drawWindow(ctx, cx, top, rnd, moon) {
  const w = 86, h = 120;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, top + h); ctx.lineTo(cx - w / 2, top + w / 2);
  ctx.arc(cx, top + w / 2, w / 2, Math.PI, 0); ctx.lineTo(cx + w / 2, top + h); ctx.closePath();
  const g = ctx.createLinearGradient(0, top, 0, top + h);
  g.addColorStop(0, '#16224a'); g.addColorStop(1, '#2d3f72');
  ctx.fillStyle = g; ctx.fill();
  ctx.clip();
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = `rgba(255,255,230,${0.4 + rnd() * 0.6})`;
    ctx.fillRect(cx - w / 2 + rnd() * w, top + rnd() * h * 0.7, 1.6, 1.6);
  }
  if (moon) {
    ctx.fillStyle = '#f4ecc8'; ctx.beginPath(); ctx.arc(cx + 14, top + 34, 13, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#1b2852'; ctx.beginPath(); ctx.arc(cx + 20, top + 30, 11, 0, 6.3); ctx.fill();
  }
  // collines et toits au loin
  ctx.fillStyle = '#0e1430';
  ctx.beginPath(); ctx.moveTo(cx - w, top + h);
  ctx.quadraticCurveTo(cx - 10, top + h - 40, cx + w, top + h - 18); ctx.lineTo(cx + w, top + h); ctx.fill();
  ctx.restore();
  // meneaux
  ctx.strokeStyle = PAL.woodDark; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx, top + h); ctx.moveTo(cx - w / 2, top + h * 0.55); ctx.lineTo(cx + w / 2, top + h * 0.55); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, top + h); ctx.lineTo(cx - w / 2, top + w / 2);
  ctx.arc(cx, top + w / 2, w / 2, Math.PI, 0); ctx.lineTo(cx + w / 2, top + h); ctx.closePath();
  ctx.lineWidth = 9; ctx.strokeStyle = PAL.stoneLight; ctx.stroke();
  ctx.lineWidth = 3; ctx.strokeStyle = PAL.ink; ctx.stroke();
  ctx.fillStyle = PAL.stoneLight; ctx.fillRect(cx - w / 2 - 10, top + h, w + 20, 10);
  ctx.strokeRect(cx - w / 2 - 10, top + h, w + 20, 10);
}

function drawShelf(ctx, x, y, w, rnd) {
  ctx.fillStyle = PAL.wood; ctx.fillRect(x, y, w, 9);
  ctx.beginPath(); ctx.rect(x, y, w, 9); ol(ctx, 2.5);
  for (const bx of [x + 10, x + w - 18]) {
    ctx.beginPath(); ctx.moveTo(bx, y + 9); ctx.lineTo(bx + 8, y + 9); ctx.lineTo(bx + 8, y + 26); ctx.closePath();
    ctx.fillStyle = PAL.woodDark; ctx.fill(); ol(ctx, 2);
  }
  let bx = x + 8;
  const cols = ['#2f6b3a', '#6b2a2a', '#3a4f7a', '#8a6a2a', PAL.ceramic];
  while (bx < x + w - 14) {
    const t = rnd();
    const c = cols[Math.floor(rnd() * cols.length)];
    if (t < 0.55) {
      const bh = 22 + rnd() * 12;
      ctx.beginPath(); ctx.roundRect(bx, y - bh, 11, bh, 3);
      ctx.fillStyle = c; ctx.fill(); ol(ctx, 2);
      ctx.fillRect(bx + 3.5, y - bh - 7, 4, 7);
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(bx + 2, y - bh + 4, 2, bh - 8);
      bx += 16;
    } else {
      ctx.beginPath(); ctx.ellipse(bx + 9, y - 10, 9, 10, 0, 0, 6.3);
      ctx.fillStyle = PAL.ceramic; ctx.fill(); ol(ctx, 2);
      ctx.fillStyle = PAL.woodDark; ctx.fillRect(bx + 5, y - 22, 8, 4);
      bx += 22;
    }
  }
}

function drawBanner(ctx, x, y, col, emblem) {
  ctx.fillStyle = PAL.woodDark; ctx.fillRect(x - 34, y - 4, 68, 7);
  ctx.beginPath(); ctx.moveTo(x - 28, y); ctx.lineTo(x + 28, y); ctx.lineTo(x + 28, y + 118); ctx.lineTo(x, y + 100); ctx.lineTo(x - 28, y + 118); ctx.closePath();
  const g = ctx.createLinearGradient(x - 28, 0, x + 28, 0);
  g.addColorStop(0, col.dark); g.addColorStop(0.5, col.main); g.addColorStop(1, col.dark);
  ctx.fillStyle = g; ctx.fill(); ol(ctx, 3);
  ctx.strokeStyle = PAL.gold; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - 22, y + 6); ctx.lineTo(x + 22, y + 6); ctx.lineTo(x + 22, y + 104); ctx.lineTo(x, y + 90); ctx.lineTo(x - 22, y + 104); ctx.closePath(); ctx.stroke();
  ctx.save(); ctx.translate(x, y + 48);
  ctx.strokeStyle = PAL.goldLight; ctx.lineWidth = 4; ctx.lineCap = 'round';
  if (emblem === 0) {
    ctx.beginPath(); ctx.moveTo(-14, -16); ctx.lineTo(14, 16); ctx.moveTo(14, -16); ctx.lineTo(-14, 16); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, 20); ctx.moveTo(-12, -8); ctx.lineTo(12, -8); ctx.stroke();
  }
  ctx.restore();
}

function drawFireplaceStatic(ctx, rnd) {
  const { x } = FIREPLACE;
  // manteau de cheminée en pierre claire
  drawStoneWall(ctx, x - 110, 60, x + 110, FLOOR, rnd, [118, 110, 112], 28);
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 4; ctx.strokeRect(x - 110, 60, 220, FLOOR - 60);
  // ouverture
  const ow = 150, oh = 116, oy = FLOOR - oh;
  ctx.beginPath();
  ctx.moveTo(x - ow / 2, FLOOR); ctx.lineTo(x - ow / 2, oy + 30);
  ctx.quadraticCurveTo(x - ow / 2, oy, x, oy - 6);
  ctx.quadraticCurveTo(x + ow / 2, oy, x + ow / 2, oy + 30);
  ctx.lineTo(x + ow / 2, FLOOR); ctx.closePath();
  const g = ctx.createLinearGradient(0, oy, 0, FLOOR);
  g.addColorStop(0, '#060404'); g.addColorStop(1, '#2a140a');
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 10; ctx.strokeStyle = PAL.stoneDark; ctx.stroke();
  ol(ctx, 3.5);
  // linteau de bois
  ctx.beginPath(); ctx.roundRect(x - 124, oy - 34, 248, 20, 4);
  ctx.fillStyle = PAL.woodDark; ctx.fill(); ol(ctx, 3);
  ctx.fillStyle = 'rgba(255,220,170,0.1)'; ctx.fillRect(x - 118, oy - 31, 236, 4);
  // chenets
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(x + s * 46, FLOOR); ctx.lineTo(x + s * 46, FLOOR - 26); ctx.lineTo(x + s * 54, FLOOR - 32);
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 6; ctx.stroke();
  }
  // bûches
  ctx.save();
  for (const [lx, ly, a] of [[x - 26, FLOOR - 12, 0.12], [x + 22, FLOOR - 13, -0.15], [x, FLOOR - 24, 0.02]]) {
    ctx.save(); ctx.translate(lx, ly); ctx.rotate(a);
    ctx.beginPath(); ctx.roundRect(-34, -8, 68, 16, 8);
    ctx.fillStyle = '#3a2214'; ctx.fill(); ol(ctx, 2.5);
    ctx.beginPath(); ctx.ellipse(34, 0, 5, 8, 0, 0, 6.3); ctx.fillStyle = '#7a4a2a'; ctx.fill(); ol(ctx, 2);
    ctx.restore();
  }
  ctx.restore();
}

function drawTable(ctx, p, rnd) {
  const top = p.y, x1 = p.x1, x2 = p.x2;
  // pieds
  for (const lx of [x1 + 22, x2 - 36]) {
    ctx.beginPath(); ctx.roundRect(lx, top + 10, 14, FLOOR - top - 10, 2);
    ctx.fillStyle = PAL.woodDark; ctx.fill(); ol(ctx, 2.5);
  }
  ctx.beginPath(); ctx.rect(x1 + 30, FLOOR - 34, x2 - x1 - 60, 8);
  ctx.fillStyle = PAL.plank; ctx.fill(); ol(ctx, 2);
  // plateau
  ctx.beginPath(); ctx.roundRect(x1 - 6, top - 2, x2 - x1 + 12, 16, 4);
  ctx.fillStyle = PAL.woodMid; ctx.fill(); ol(ctx, 3);
  ctx.fillStyle = PAL.woodLight; ctx.fillRect(x1 - 2, top + 1, x2 - x1 + 4, 3);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5;
  for (let k = 0; k < 3; k++) {
    const sx = x1 + 30 + rnd() * (x2 - x1 - 60);
    ctx.beginPath(); ctx.moveTo(sx, top + 5); ctx.lineTo(sx + 40, top + 6); ctx.stroke();
  }
  // banc
  ctx.beginPath(); ctx.roundRect(x1 + 10, FLOOR - 40, x2 - x1 - 20, 9, 3);
  ctx.fillStyle = PAL.wood; ctx.fill(); ol(ctx, 2.2);
  for (const bx of [x1 + 22, x2 - 30]) { ctx.fillStyle = PAL.woodDark; ctx.fillRect(bx, FLOOR - 31, 8, 31); ctx.strokeRect(bx, FLOOR - 31, 8, 31); }
}

function drawGallery(ctx, p) {
  // chaînes
  ctx.strokeStyle = PAL.iron; ctx.lineWidth = 3; ctx.setLineDash([6, 4]);
  for (const cx of [p.x1 + 14, p.x2 - 14]) { ctx.beginPath(); ctx.moveTo(cx, 60); ctx.lineTo(cx, p.y - 40); ctx.stroke(); }
  ctx.setLineDash([]);
  // rambarde
  ctx.fillStyle = PAL.woodDark;
  for (let x = p.x1 + 8; x <= p.x2 - 8; x += 26) { ctx.beginPath(); ctx.rect(x - 3, p.y - 42, 6, 42); ctx.fill(); ol(ctx, 1.5); }
  ctx.beginPath(); ctx.roundRect(p.x1 + 2, p.y - 46, p.x2 - p.x1 - 4, 8, 3);
  ctx.fillStyle = PAL.wood; ctx.fill(); ol(ctx, 2.2);
  // plancher
  ctx.beginPath(); ctx.roundRect(p.x1 - 4, p.y - 2, p.x2 - p.x1 + 8, 18, 3);
  ctx.fillStyle = PAL.woodMid; ctx.fill(); ol(ctx, 3);
  ctx.fillStyle = PAL.woodLight; ctx.fillRect(p.x1, p.y + 1, p.x2 - p.x1, 3);
  for (const bx of [p.x1 + 16, p.x2 - 16]) {
    ctx.beginPath(); ctx.moveTo(bx - 10, p.y + 16); ctx.lineTo(bx + 10, p.y + 16); ctx.lineTo(bx, p.y + 34); ctx.closePath();
    ctx.fillStyle = PAL.woodDark; ctx.fill(); ol(ctx, 2);
  }
}

function drawCandleStick(ctx, c) {
  ctx.beginPath(); ctx.ellipse(c.x, c.y - 2, 9, 3, 0, 0, 6.3);
  ctx.fillStyle = PAL.brass; ctx.fill(); ol(ctx, 2);
  ctx.beginPath(); ctx.roundRect(c.x - 4, c.y - 2 - c.h, 8, c.h, 2);
  ctx.fillStyle = '#efe3c4'; ctx.fill(); ol(ctx, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(c.x - 2.5, c.y - c.h, 2, c.h - 4);
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(c.x, c.y - 2 - c.h); ctx.lineTo(c.x, c.y - 6 - c.h); ctx.stroke();
}

function drawSconce(ctx, s) {
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(s.x, s.y + 30); ctx.quadraticCurveTo(s.x, s.y + 10, s.x + 0, s.y + 4); ctx.stroke();
  ctx.strokeStyle = PAL.iron; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.roundRect(s.x - 8, s.y + 26, 16, 10, 2); ctx.fillStyle = PAL.iron; ctx.fill(); ol(ctx, 2);
  drawCandleStick(ctx, { x: s.x, y: s.y + 4, h: 18 });
}

function drawChandelierStatic(ctx) {
  const { x, y } = CHANDELIER;
  ctx.strokeStyle = PAL.iron; ctx.lineWidth = 3; ctx.setLineDash([5, 3]);
  ctx.beginPath(); ctx.moveTo(x, 50); ctx.lineTo(x, y - 30); ctx.stroke(); ctx.setLineDash([]);
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x, y - 30); ctx.lineTo(x + s * 60, y); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(x, y + 4, 70, 12, 0, 0, 6.3);
  ctx.lineWidth = 9; ctx.strokeStyle = PAL.ink; ctx.stroke();
  ctx.lineWidth = 5; ctx.strokeStyle = PAL.iron; ctx.stroke();
  for (const cx of chandelierCandles()) drawCandleStick(ctx, { x: cx, y: y + (Math.abs(cx - x) < 40 ? 12 : 4), h: 14 });
}

const chandelierCandles = () => [-60, -30, 0, 30, 60].map((d) => CHANDELIER.x + d);

function drawSideWalls(ctx, rnd) {
  for (const [x0, x1] of [[0, WORLD.left], [WORLD.right, WORLD.w]]) {
    drawStoneWall(ctx, x0, 0, x1, FLOOR, rnd, [92, 88, 98], 36);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x0, 0, x1 - x0, FLOOR);
    ctx.fillStyle = 'rgba(255,200,140,0.12)';
    ctx.fillRect(x0 === 0 ? x1 - 4 : x0, 0, 4, FLOOR);
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x0 === 0 ? x1 : x0, 0); ctx.lineTo(x0 === 0 ? x1 : x0, FLOOR); ctx.stroke();
  }
}

function paintStatic(ctx) {
  const rnd = seeded(1337);
  drawStoneWall(ctx, 0, 0, WORLD.w, FLOOR, rnd);
  // lambris
  drawPlanks(ctx, 40, 500, WORLD.w - 40, FLOOR, rnd, true, '#4d2d1a', '#55321d');
  ctx.fillStyle = PAL.woodDark; ctx.fillRect(40, 494, WORLD.w - 80, 12);
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2.5; ctx.strokeRect(40, 494, WORLD.w - 80, 12);
  // poteaux et poutres
  for (const px of [420, 860]) {
    ctx.fillStyle = '#3b2314'; ctx.fillRect(px - 14, 50, 28, FLOOR - 50);
    ctx.strokeRect(px - 14, 50, 28, FLOOR - 50);
    ctx.fillStyle = 'rgba(255,220,170,0.07)'; ctx.fillRect(px - 10, 50, 5, FLOOR - 50);
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(px, 130); ctx.lineTo(px + s * 70, 62); ctx.lineTo(px + s * 82, 62); ctx.lineTo(px + s * 4, 144); ctx.closePath();
      ctx.fillStyle = '#3b2314'; ctx.fill(); ol(ctx, 2.5);
    }
  }
  drawWindow(ctx, 250, 150, rnd, true);
  drawWindow(ctx, 1030, 150, rnd, false);
  drawShelf(ctx, 300, 300, 100, rnd);
  drawShelf(ctx, 880, 300, 100, rnd);
  drawFireplaceStatic(ctx, rnd);
  drawBanner(ctx, 500, 92, PAL.players[0], 0);
  drawBanner(ctx, 780, 92, PAL.players[1], 1);
  // poutre maîtresse du plafond
  ctx.beginPath(); ctx.rect(0, 26, WORLD.w, 34);
  ctx.fillStyle = '#3b2314'; ctx.fill(); ol(ctx, 3);
  ctx.fillStyle = 'rgba(255,220,170,0.08)'; ctx.fillRect(0, 30, WORLD.w, 5);
  ctx.fillStyle = '#120b08'; ctx.fillRect(0, 0, WORLD.w, 26);
  // plancher
  drawPlanks(ctx, 0, FLOOR, WORLD.w, WORLD.h, rnd, false, '#5a3520', '#633b23');
  const fg = ctx.createLinearGradient(0, FLOOR, 0, WORLD.h);
  fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = fg; ctx.fillRect(0, FLOOR, WORLD.w, WORLD.h - FLOOR);
  ctx.fillStyle = PAL.ink; ctx.fillRect(0, FLOOR - 2, WORLD.w, 4);
  drawSideWalls(ctx, rnd);
  for (const s of SCONCES) drawSconce(ctx, s);
  drawChandelierStatic(ctx);
  for (const p of PLATFORMS) (p.kind === 'table' ? drawTable : drawGallery)(ctx, p, rnd);
  for (const c of CANDLES) drawCandleStick(ctx, c);
}

let staticCanvas = null, staticScale = 0;
export function getStatic(scale) {
  scale = Math.min(3, Math.max(1, Math.ceil(scale * 4) / 4));
  if (staticCanvas && staticScale === scale) return staticCanvas;
  staticCanvas = document.createElement('canvas');
  staticCanvas.width = Math.round(WORLD.w * scale);
  staticCanvas.height = Math.round(WORLD.h * scale);
  const ctx = staticCanvas.getContext('2d');
  ctx.scale(scale, scale);
  paintStatic(ctx);
  staticScale = scale;
  return staticCanvas;
}

// --- éléments animés ------------------------------------------------------

export function flameAt(ctx, x, y, s, t, seed) {
  const fl = 1 + Math.sin(t * 13 + seed) * 0.12 + Math.sin(t * 29 + seed * 3) * 0.08;
  const sway = Math.sin(t * 7 + seed * 2) * 1.5 * s;
  ctx.beginPath();
  ctx.moveTo(x - 3.2 * s, y);
  ctx.quadraticCurveTo(x - 4 * s, y - 6 * s * fl, x + sway, y - 13 * s * fl);
  ctx.quadraticCurveTo(x + 4 * s, y - 6 * s * fl, x + 3.2 * s, y);
  ctx.quadraticCurveTo(x, y + 2.5 * s, x - 3.2 * s, y);
  ctx.fillStyle = PAL.ember; ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + sway * 0.3, y - 3.5 * s, 1.7 * s, 3.5 * s * fl, 0, 0, 6.3);
  ctx.fillStyle = PAL.flameCore; ctx.fill();
}

export function candlePoints() {
  const pts = [];
  for (const c of CANDLES) pts.push({ x: c.x, y: c.y - 6 - c.h, r: 90, k: 0.55 });
  for (const s of SCONCES) pts.push({ x: s.x, y: s.y - 18, r: 120, k: 0.65 });
  for (const cx of chandelierCandles()) pts.push({ x: cx, y: CHANDELIER.y + (Math.abs(cx - CHANDELIER.x) < 40 ? 12 : 4) - 18, r: 110, k: 0.45 });
  return pts;
}
const CANDLE_PTS = candlePoints();

export function drawFire(ctx, t) {
  const x = FIREPLACE.x, base = FLOOR - 20;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) {
    const off = (i - 3) * 15;
    const h = 52 + Math.sin(t * 6 + i * 1.9) * 12 + Math.sin(t * 15 + i) * 6 - Math.abs(off) * 0.5;
    const w = 17 - Math.abs(i - 3) * 1.5;
    const sway = Math.sin(t * 4 + i) * 6;
    const g = ctx.createLinearGradient(0, base, 0, base - h);
    g.addColorStop(0, 'rgba(255,120,30,0.9)'); g.addColorStop(0.6, 'rgba(255,170,60,0.6)'); g.addColorStop(1, 'rgba(255,200,90,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x + off - w, base);
    ctx.quadraticCurveTo(x + off - w, base - h * 0.5, x + off + sway, base - h);
    ctx.quadraticCurveTo(x + off + w, base - h * 0.5, x + off + w, base);
    ctx.closePath(); ctx.fill();
  }
  for (let i = 0; i < 4; i++) {
    const off = (i - 1.5) * 18;
    const h = 26 + Math.sin(t * 9 + i * 2.3) * 8;
    ctx.fillStyle = 'rgba(255,240,180,0.55)';
    ctx.beginPath(); ctx.ellipse(x + off, base - h * 0.4, 8, h * 0.5, 0, 0, 6.3); ctx.fill();
  }
  ctx.restore();
}

export function drawCandleFlames(ctx, t) {
  CANDLE_PTS.forEach((c, i) => flameAt(ctx, c.x, c.y + 6, 1, t, i * 1.7));
}

let halo, fireHalo, vignette;
export function drawLights(ctx, t) {
  if (!halo) {
    halo = makeGlow(256, [[0, 'rgba(255,190,110,0.55)'], [0.4, 'rgba(255,140,60,0.18)'], [1, 'rgba(255,120,40,0)']]);
    fireHalo = makeGlow(512, [[0, 'rgba(255,150,60,0.55)'], [0.35, 'rgba(255,110,40,0.22)'], [1, 'rgba(200,60,20,0)']]);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const ff = 0.85 + Math.sin(t * 9) * 0.08 + Math.sin(t * 23) * 0.05;
  ctx.globalAlpha = ff;
  ctx.drawImage(fireHalo, FIREPLACE.x - 330 * ff, FLOOR - 60 - 330 * ff, 660 * ff, 660 * ff);
  CANDLE_PTS.forEach((c, i) => {
    const f = 0.8 + Math.sin(t * 11 + i * 2.1) * 0.1 + Math.sin(t * 27 + i) * 0.06;
    ctx.globalAlpha = c.k * f;
    const r = c.r * f;
    ctx.drawImage(halo, c.x - r, c.y - r, r * 2, r * 2);
  });
  ctx.restore();
}

export function drawVignette(ctx) {
  if (!vignette) {
    vignette = document.createElement('canvas');
    vignette.width = 640; vignette.height = 360;
    const g = vignette.getContext('2d');
    const grd = g.createRadialGradient(320, 200, 120, 320, 180, 420);
    grd.addColorStop(0, 'rgba(10,5,2,0)'); grd.addColorStop(1, 'rgba(10,5,2,0.62)');
    g.fillStyle = grd; g.fillRect(0, 0, 640, 360);
  }
  ctx.drawImage(vignette, 0, 0, 1280, 720);
}

// --- décors simulés -------------------------------------------------------

export function drawPartition(ctx, i, hp, maxHp) {
  const p = PARTITIONS[i];
  const x = p.x, top = p.top, w = p.w + 10;
  const state = hp <= 0 ? 2 : hp <= maxHp / 2 ? 1 : 0;
  const rnd = seeded(91 + i * 7);
  ctx.save();
  ctx.lineJoin = 'round';
  const planks = [x - w / 2, x - w / 6, x + w / 6];
  const pw = w / 3;
  if (state === 2) {
    // souches déchiquetées
    planks.forEach((px0, k) => {
      const hgt = 14 + rnd() * 26;
      ctx.beginPath();
      ctx.moveTo(px0, FLOOR); ctx.lineTo(px0, FLOOR - hgt);
      ctx.lineTo(px0 + pw * 0.35, FLOOR - hgt - 8 - rnd() * 6);
      ctx.lineTo(px0 + pw * 0.6, FLOOR - hgt + 3);
      ctx.lineTo(px0 + pw, FLOOR - hgt - 5 - rnd() * 4); ctx.lineTo(px0 + pw, FLOOR);
      ctx.closePath();
      ctx.fillStyle = k % 2 ? PAL.woodMid : PAL.wood; ctx.fill(); ol(ctx, 2.2);
    });
    ctx.restore();
    return;
  }
  const tilt = state === 1 ? 0.025 : 0;
  ctx.translate(x, FLOOR); ctx.rotate(tilt); ctx.translate(-x, -FLOOR);
  planks.forEach((px0, k) => {
    let ptop = top + 4;
    ctx.beginPath();
    if (state === 1 && k === 1) {
      ptop = top + 34;
      ctx.moveTo(px0, FLOOR); ctx.lineTo(px0, ptop + 6); ctx.lineTo(px0 + pw * 0.4, ptop - 6);
      ctx.lineTo(px0 + pw * 0.7, ptop + 4); ctx.lineTo(px0 + pw, ptop - 2); ctx.lineTo(px0 + pw, FLOOR);
    } else ctx.rect(px0, ptop, pw, FLOOR - ptop);
    ctx.fillStyle = k % 2 ? PAL.woodMid : PAL.wood; ctx.fill(); ol(ctx, 2);
    ctx.fillStyle = 'rgba(255,220,170,0.12)'; ctx.fillRect(px0 + 2, ptop + 6, 2, FLOOR - ptop - 10);
  });
  // traverses
  for (const ty of [top + 18, FLOOR - 26]) {
    ctx.beginPath(); ctx.rect(x - w / 2 - 3, ty, w + 6, 9);
    ctx.fillStyle = PAL.woodDark; ctx.fill(); ol(ctx, 2);
    ctx.fillStyle = PAL.iron;
    for (const nx of [x - w / 3, x, x + w / 3]) { ctx.beginPath(); ctx.arc(nx, ty + 4.5, 1.6, 0, 6.3); ctx.fill(); }
  }
  ctx.beginPath(); ctx.rect(x - w / 2 - 4, top - 4, w + 8, 10);
  ctx.fillStyle = PAL.woodDark; ctx.fill(); ol(ctx, 2.5);
  if (state === 1) {
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x - w / 2 + 3, top + 50); ctx.lineTo(x - w / 2 + 8, top + 64); ctx.lineTo(x - w / 2 + 4, top + 78); ctx.lineTo(x - w / 2 + 9, top + 92);
    ctx.moveTo(x + w / 2 - 4, top + 30); ctx.lineTo(x + w / 2 - 9, top + 44); ctx.lineTo(x + w / 2 - 5, top + 58);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawBarrel(ctx, b, x, y) {
  const B = PR.barrel;
  ctx.save();
  ctx.lineJoin = 'round';
  if (b.st === 0) {
    const w = (B.hw * 2) / U, h = B.h / U;
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 3, 0); ctx.quadraticCurveTo(-w / 2 - 4, -h / 2, -w / 2 + 3, -h);
    ctx.lineTo(w / 2 - 3, -h); ctx.quadraticCurveTo(w / 2 + 4, -h / 2, w / 2 - 3, 0); ctx.closePath();
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, PAL.woodDark); g.addColorStop(0.4, PAL.woodLight); g.addColorStop(1, PAL.woodDark);
    ctx.fillStyle = g; ctx.fill(); ol(ctx, 3);
    ctx.strokeStyle = 'rgba(40,20,10,0.6)'; ctx.lineWidth = 1.5;
    for (const sx of [-12, -4, 4, 12]) { ctx.beginPath(); ctx.moveTo(sx * 0.9, -2); ctx.quadraticCurveTo(sx * 1.15, -h / 2, sx * 0.9, -h + 2); ctx.stroke(); }
    for (const hy of [-10, -h + 10]) {
      ctx.beginPath(); ctx.moveTo(-w / 2 - 0.5, hy); ctx.quadraticCurveTo(0, hy + 3, w / 2 + 0.5, hy);
      ctx.strokeStyle = PAL.ink; ctx.lineWidth = 6; ctx.stroke();
      ctx.strokeStyle = PAL.iron; ctx.lineWidth = 3.5; ctx.stroke();
    }
    ctx.beginPath(); ctx.ellipse(0, -h, w / 2 - 3, 4, 0, 0, 6.3);
    ctx.fillStyle = PAL.woodMid; ctx.fill(); ol(ctx, 2);
  } else {
    const r = B.r / U;
    ctx.translate(x, y - r);
    ctx.rotate(b.rot / B.r);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.3);
    ctx.fillStyle = PAL.woodMid; ctx.fill();
    ctx.lineWidth = 7; ctx.strokeStyle = PAL.ink; ctx.stroke();
    ctx.lineWidth = 4; ctx.strokeStyle = PAL.iron; ctx.stroke();
    ctx.strokeStyle = 'rgba(40,20,10,0.6)'; ctx.lineWidth = 1.5;
    for (const k of [-10, -3.5, 3.5, 10]) { ctx.beginPath(); ctx.moveTo(k, -Math.sqrt(r * r - k * k) + 3); ctx.lineTo(k, Math.sqrt(r * r - k * k) - 3); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(7, -7, 3.5, 0, 6.3); ctx.fillStyle = PAL.woodDark; ctx.fill(); ol(ctx, 1.5);
  }
  ctx.restore();
}

export function drawMug(ctx, m, x, y) {
  ctx.save();
  ctx.translate(x, y - 9);
  if (m.st === 1) ctx.rotate((m.rot * Math.PI) / 180);
  ctx.lineJoin = 'round';
  // anse
  ctx.beginPath(); ctx.arc(8, 0, 5, -1.3, 1.3);
  ctx.lineWidth = 5; ctx.strokeStyle = PAL.ink; ctx.stroke();
  ctx.lineWidth = 2.5; ctx.strokeStyle = PAL.woodMid; ctx.stroke();
  // corps
  ctx.beginPath(); ctx.roundRect(-8, -8, 16, 17, 2);
  ctx.fillStyle = PAL.woodMid; ctx.fill(); ol(ctx, 2.2);
  ctx.fillStyle = PAL.iron; ctx.fillRect(-8, -4, 16, 2.5); ctx.fillRect(-8, 4, 16, 2.5);
  // mousse
  ctx.beginPath();
  ctx.arc(-4.5, -9, 4, Math.PI, 0); ctx.arc(1, -10, 4.5, Math.PI, 0); ctx.arc(5, -9, 3.5, Math.PI, 0);
  ctx.lineTo(8, -7); ctx.lineTo(-8, -7); ctx.closePath();
  ctx.fillStyle = PAL.foam; ctx.fill(); ol(ctx, 1.8);
  ctx.restore();
}
