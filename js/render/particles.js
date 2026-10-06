// Système de particules en pool (tableaux typés, aucune allocation par frame).
// Purement visuel : ne fait pas partie de l'état simulé.
// Rendu par lots : les particules sont triées par (calque, couleur, opacité)
// et chaque lot est rempli en un seul appel fill().
import { WORLD, PLATFORMS } from '../sim/map.js';
import { makeGlow } from '../core/util.js';

export const PT = {
  SPARK: 0, DUST: 1, SPLINTER: 2, DROP: 3, PUDDLE: 4, SMOKE: 5, EMBER: 6,
  LINE: 7, RING: 8, CONFETTI: 9, SHARD: 10, FLASH: 11, STAR: 12,
};
const ADDITIVE = [1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1];
const COLLIDE = [0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0];
const SPRITE = [0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0]; // dessinés à part (images, anneaux)

const N = 3000;
const x = new Float32Array(N), y = new Float32Array(N);
const vx = new Float32Array(N), vy = new Float32Array(N);
const life = new Float32Array(N), max = new Float32Array(N);
const size = new Float32Array(N), rot = new Float32Array(N), vr = new Float32Array(N);
const grav = new Float32Array(N), drag = new Float32Array(N);
const type = new Uint8Array(N), rest = new Uint8Array(N);
const colId = new Uint16Array(N);
const colors = [];
const colorIndex = new Map();
const keys = new Float64Array(N);
let cursor = 0;
let alive = 0;

function colorId(c) {
  let id = colorIndex.get(c);
  if (id === undefined) { id = colors.length; colors.push(c); colorIndex.set(c, id); }
  return id;
}

let glowSprite, smokeSprite, flashSprite;
function sprites() {
  if (glowSprite) return;
  glowSprite = makeGlow(64, [[0, 'rgba(255,240,200,1)'], [0.25, 'rgba(255,170,60,0.7)'], [1, 'rgba(255,100,20,0)']]);
  smokeSprite = makeGlow(128, [[0, 'rgba(120,110,105,0.55)'], [0.6, 'rgba(90,82,78,0.25)'], [1, 'rgba(80,72,70,0)']]);
  flashSprite = makeGlow(128, [[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,240,200,0.8)'], [1, 'rgba(255,200,120,0)']]);
}

export function spawn(t, px, py, pvx, pvy, l, s, c, g = 0, d = 0, r = 0, rv = 0) {
  let i = cursor;
  for (let k = 0; k < N; k++) {
    if (life[i] <= 0) break;
    i = (i + 1) % N;
  }
  cursor = (i + 1) % N;
  type[i] = t; x[i] = px; y[i] = py; vx[i] = pvx; vy[i] = pvy;
  life[i] = max[i] = l; size[i] = s; colId[i] = colorId(c);
  grav[i] = g; drag[i] = d; rot[i] = r; vr[i] = rv; rest[i] = 0;
}

export function clearParticles() { life.fill(0); }
export const particleCount = () => alive;

function groundBelow(px, py0, py1) {
  if (py1 >= WORLD.floor && py0 <= WORLD.floor + 2) return WORLD.floor;
  for (const p of PLATFORMS) {
    if (px >= p.x1 && px <= p.x2 && py0 <= p.y && py1 >= p.y) return p.y;
  }
  return -1;
}

export function updateParticles(dt) {
  alive = 0;
  for (let i = 0; i < N; i++) {
    if (life[i] <= 0) continue;
    life[i] -= dt;
    if (life[i] <= 0) continue;
    alive++;
    if (rest[i]) continue;
    const t = type[i];
    vy[i] += grav[i] * dt;
    if (drag[i]) { const k = Math.max(0, 1 - drag[i] * dt); vx[i] *= k; vy[i] *= k; }
    const oy = y[i];
    x[i] += vx[i] * dt; y[i] += vy[i] * dt;
    rot[i] += vr[i] * dt;
    if (COLLIDE[t] && vy[i] > 0) {
      const gy = groundBelow(x[i], oy, y[i]);
      if (gy >= 0) {
        y[i] = gy - (t === PT.DROP ? 0 : 1.5);
        if (t === PT.DROP) {
          type[i] = PT.PUDDLE; life[i] = max[i] = 2.5 + Math.random() * 2.5;
          size[i] *= 1.6 + Math.random(); vx[i] = 0; vy[i] = 0; rest[i] = 1;
        } else if (vy[i] > 90) {
          vy[i] *= -0.32; vx[i] *= 0.55; vr[i] *= 0.5;
        } else {
          vy[i] = 0; vx[i] = 0; vr[i] = 0; rest[i] = 1;
          if (t === PT.SPLINTER || t === PT.SHARD) rot[i] = Math.round(rot[i] / Math.PI) * Math.PI + (Math.random() - 0.5) * 0.3;
        }
      }
    }
    if (x[i] < WORLD.left - 5 && vx[i] < 0) { vx[i] *= -0.4; x[i] = WORLD.left - 5; }
    if (x[i] > WORLD.right + 5 && vx[i] > 0) { vx[i] *= -0.4; x[i] = WORLD.right + 5; }
  }
}

function alphaOf(i) {
  const l = life[i] / max[i];
  switch (type[i]) {
    case PT.SPARK: return Math.min(1, l * 1.6);
    case PT.DUST: return 0.55 * l;
    case PT.SPLINTER: case PT.SHARD: return Math.min(1, life[i] / 1.2);
    case PT.DROP: return 0.9;
    case PT.PUDDLE: return 0.7 * Math.min(1, l * 2);
    case PT.LINE: return l * 0.85;
    case PT.STAR: return l;
    case PT.CONFETTI: return Math.min(1, life[i]);
    default: return 1;
  }
}

// Tous les contours ont la même orientation que arc() (règle nonzero : pas de trous)
function quad(ctx, x0, y0, x1, y1, w0, w1) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  ctx.moveTo(x0 - nx * w0, y0 - ny * w0);
  ctx.lineTo(x1 - nx * w1, y1 - ny * w1);
  ctx.lineTo(x1 + nx * w1, y1 + ny * w1);
  ctx.lineTo(x0 + nx * w0, y0 + ny * w0);
  ctx.closePath();
}

function poly(ctx, px, py, r, sx, pts) {
  const c = Math.cos(r), s = Math.sin(r);
  for (let k = 0; k < pts.length; k += 2) {
    const lx = pts[k] * sx, ly = pts[k + 1];
    const wx = px + lx * c - ly * s, wy = py + lx * s + ly * c;
    if (k === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
  }
  ctx.closePath();
}

const SPL = [-1, -0.18, 1, -0.3, 0.7, 0.25, -0.9, 0.18];
const SHD = [-1, 0.5, 0, -0.7, 0.8, 0.4];
const CONF = [-1, -0.45, 1, -0.45, 1, 0.45, -1, 0.45];
const tmp = new Array(16);

function shape(ctx, i) {
  const t = type[i], l = life[i] / max[i], s = size[i];
  switch (t) {
    case PT.SPARK: {
      const k = 0.028 + 0.02 * l;
      quad(ctx, x[i], y[i], x[i] - vx[i] * k, y[i] - vy[i] * k, s * (0.4 + 0.6 * l) * 0.5, s * 0.12);
      break;
    }
    case PT.LINE: {
      const sp = Math.hypot(vx[i], vy[i]) || 1;
      quad(ctx, x[i], y[i], x[i] - (vx[i] / sp) * s, y[i] - (vy[i] / sp) * s, 1 + 1.5 * l, 0.3);
      break;
    }
    case PT.DROP: {
      const sp = Math.hypot(vx[i], vy[i]) || 1;
      const len = Math.max(s, sp * 0.022);
      quad(ctx, x[i], y[i], x[i] - (vx[i] / sp) * len, y[i] - (vy[i] / sp) * len, s * 0.5, s * 0.35);
      ctx.moveTo(x[i] + s * 0.5, y[i]); ctx.arc(x[i], y[i], s * 0.5, 0, 6.283);
      break;
    }
    case PT.DUST: {
      const r = s * (1 + (1 - l) * 1.4);
      ctx.moveTo(x[i] + r, y[i]); ctx.arc(x[i], y[i], r, 0, 6.283);
      break;
    }
    case PT.PUDDLE:
      ctx.moveTo(x[i] + s * 1.6, y[i] - 1); ctx.ellipse(x[i], y[i] - 1, s * 1.6, s * 0.35, 0, 0, 6.283);
      break;
    case PT.SPLINTER:
      for (let k = 0; k < 8; k++) tmp[k] = SPL[k] * s;
      tmp.length = 8; poly(ctx, x[i], y[i], rot[i], 1, tmp);
      break;
    case PT.SHARD:
      for (let k = 0; k < 6; k++) tmp[k] = SHD[k] * s;
      tmp.length = 6; poly(ctx, x[i], y[i], rot[i], 1, tmp);
      break;
    case PT.CONFETTI:
      for (let k = 0; k < 8; k++) tmp[k] = CONF[k] * s;
      tmp.length = 8; poly(ctx, x[i], y[i], rot[i], Math.max(0.15, Math.abs(Math.cos(rot[i] * 2.3))), tmp);
      break;
    case PT.STAR: {
      const r0 = s * (0.5 + (1 - l) * 0.8);
      const c = Math.cos(rot[i]), sn = Math.sin(rot[i]);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * 6.283, r = k % 2 ? r0 * 0.28 : r0;
        const lx = Math.cos(a) * r, ly = Math.sin(a) * r;
        const wx = x[i] + lx * c - ly * sn, wy = y[i] + lx * sn + ly * c;
        if (k === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
      }
      ctx.closePath();
      break;
    }
  }
}

function drawSprite(ctx, i) {
  const l = life[i] / max[i];
  switch (type[i]) {
    case PT.SMOKE: {
      const s = size[i] * (1 + (1 - l) * 2);
      ctx.globalAlpha = 0.5 * l * Math.min(1, (1 - l) * 6);
      ctx.drawImage(smokeSprite, x[i] - s, y[i] - s, s * 2, s * 2);
      break;
    }
    case PT.EMBER: {
      const s = size[i] * (0.6 + 0.4 * Math.sin(life[i] * 30 + i));
      ctx.globalAlpha = Math.min(1, l * 2);
      ctx.drawImage(glowSprite, x[i] - s * 3, y[i] - s * 3, s * 6, s * 6);
      break;
    }
    case PT.FLASH: {
      const s = size[i] * (0.6 + (1 - l) * 0.6);
      ctx.globalAlpha = l;
      ctx.drawImage(flashSprite, x[i] - s, y[i] - s, s * 2, s * 2);
      break;
    }
    case PT.RING:
      ctx.globalAlpha = l;
      ctx.strokeStyle = colors[colId[i]]; ctx.lineWidth = 2 + 7 * l;
      ctx.beginPath(); ctx.arc(x[i], y[i], size[i] * (1 - l * l) + 4, 0, 6.283); ctx.stroke();
      break;
  }
}

// Trie les particules du groupe (0 : au sol, 1 : devant, 2 : additif) et remplit par lots
function batch(ctx, group) {
  let n = 0;
  for (let i = 0; i < N; i++) {
    if (life[i] <= 0) continue;
    const t = type[i];
    if (SPRITE[t]) continue;
    const g = ADDITIVE[t] ? 2 : (t === PT.PUDDLE || rest[i]) ? 0 : 1;
    if (g !== group) continue;
    const lvl = Math.round(alphaOf(i) * 12);
    if (lvl <= 0) continue;
    keys[n++] = ((colId[i] * 16 + lvl) * 4 + (t === PT.SPLINTER ? 1 : 0)) * 4096 + i;
  }
  if (!n) return;
  const view = keys.subarray(0, n);
  view.sort();
  let k = 0;
  while (k < n) {
    const key = Math.floor(view[k] / 4096);
    ctx.beginPath();
    let j = k;
    for (; j < n && Math.floor(view[j] / 4096) === key; j++) shape(ctx, view[j] % 4096);
    const outline = key % 4;
    const lvl = Math.floor(key / 4) % 16;
    const cid = Math.floor(key / 64);
    ctx.globalAlpha = lvl / 12;
    ctx.fillStyle = colors[cid];
    ctx.fill();
    if (outline) { ctx.strokeStyle = 'rgba(28,18,13,0.55)'; ctx.lineWidth = 1; ctx.stroke(); }
    k = j;
  }
}

// layer 0 : derrière les personnages (flaques, éclats au sol). layer 1 : devant.
export function drawParticles(ctx, layer) {
  sprites();
  ctx.save();
  if (layer === 0) {
    batch(ctx, 0);
  } else {
    for (let i = 0; i < N; i++) if (life[i] > 0 && type[i] === PT.SMOKE) drawSprite(ctx, i);
    batch(ctx, 1);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < N; i++) if (life[i] > 0 && SPRITE[type[i]] && type[i] !== PT.SMOKE) drawSprite(ctx, i);
    batch(ctx, 2);
  }
  ctx.restore();
}
