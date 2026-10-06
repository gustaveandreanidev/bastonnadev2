// Rendu du monde : décor, objets, combattants, particules, lumières.
import { U } from '../sim/units.js';
import { W } from '../sim/tuning.js';
import { PLATFORMS, WORLD } from '../sim/map.js';
import { makeProps } from '../sim/state.js';
import { hitbox, hurtbox } from '../sim/combat.js';
import { wallRect, barrelRect, mugRect } from '../sim/props.js';
import { PROPS } from '../config.js';
import { Camera } from './camera.js';
import { FighterAnim, drawFighter, drawTrail } from './draw_fighter.js';
import {
  getStatic, drawFire, drawCandleFlames, drawLights, drawVignette,
  drawPartition, drawBarrel, drawMug,
} from './draw_map.js';
import { drawParticles } from './particles.js';
import { playerColor, PAL } from './palette.js';

const BACKDROP_PROPS = makeProps();

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.base = 1;
    this.cam = new Camera();
    this.anims = [new FighterAnim(), new FighterAnim()];
    this.flash = 0;
    this.time = 0;
    this.showHitboxes = false;
    this.localIndex = 0;
  }

  setScale(fit) {
    const dpr = window.devicePixelRatio || 1;
    const s = fit * dpr;
    this.canvas.width = Math.round(1280 * s);
    this.canvas.height = Math.round(720 * s);
    this.base = this.canvas.width / 1280;
  }

  resetAnims() {
    this.anims = [new FighterAnim(), new FighterAnim()];
    this.cam.reset();
    this.flash = 0;
  }

  // state = null : décor seul (menus)
  draw(dt, state, prev, alpha) {
    const ctx = this.ctx;
    this.time += dt;
    const t = this.time;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const pos = state ? state.f.map((f, i) => this.interp(f, prev && prev.f[i], alpha)) : [];
    if (state) {
      const pts = pos.filter((_, i) => state.f[i].st !== 'ko' || state.phase !== 'end').map((p) => ({ x: p.x, y: p.y }));
      this.cam.update(dt, pts.length ? pts : pos);
    } else {
      this.cam.update(dt, []);
    }
    this.cam.apply(ctx, this.base);

    ctx.drawImage(getStatic(this.base * 1.25), 0, 0, WORLD.w, WORLD.h);
    drawFire(ctx, t);
    drawCandleFlames(ctx, t);

    const props = state ? state.props : BACKDROP_PROPS;
    props.walls.forEach((w, i) => drawPartition(ctx, i, w.hp, PROPS.partitionHp));
    const pprops = prev ? prev.props : null;
    props.barrels.forEach((b, i) => {
      if (b.st === 2) return;
      const pb = pprops && pprops.barrels[i];
      const x = pb && pb.st === b.st ? pb.x + (b.x - pb.x) * alpha : b.x;
      const y = pb && pb.st === b.st ? pb.y + (b.y - pb.y) * alpha : b.y;
      drawBarrel(ctx, b, x / U, y / U);
    });
    props.mugs.forEach((m, i) => {
      if (m.st === 2) return;
      const pm = pprops && pprops.mugs[i];
      const x = pm && pm.st === m.st ? pm.x + (m.x - pm.x) * alpha : m.x;
      const y = pm && pm.st === m.st ? pm.y + (m.y - pm.y) * alpha : m.y;
      drawMug(ctx, m, x / U, y / U);
    });

    drawParticles(ctx, 0);

    if (state) {
      // ombres
      state.f.forEach((f, i) => this.drawShadow(ctx, pos[i].x, pos[i].y));
      const order = this.localIndex === 0 ? [1, 0] : [0, 1];
      for (const i of order) drawTrail(ctx, this.anims[i], playerColor(i, state.f[i].dummy));
      for (const i of order) {
        const f = state.f[i];
        const col = playerColor(i, f.dummy);
        let glow = 0;
        if (f.atk && f.atk.ph === 'charge') {
          const c = W[f.wpn][f.atk.id].cMax ? f.atk.c / W[f.wpn][f.atk.id].cMax : 0;
          glow = 0.25 + c * 0.75 * (c >= 1 ? 0.75 + 0.25 * Math.sin(t * 30) : 1);
        }
        const shakeX = f.stop > 0 && f.st === 'hitstun' ? (Math.random() - 0.5) * 7 : 0;
        drawFighter(ctx, f, this.anims[i], pos[i].x, pos[i].y, col, {
          dt, tf: alpha, tick: state.tick, glow, shakeX,
        });
        if (f.atk && f.atk.ph === 'charge') this.drawChargeMeter(ctx, f, this.anims[i], col);
      }
    }

    drawParticles(ctx, 1);
    drawLights(ctx, t);
    if (state && this.showHitboxes) this.drawHitboxes(ctx, state);

    // écran
    ctx.setTransform(this.base, 0, 0, this.base, 0, 0);
    drawVignette(ctx);
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,248,235,${Math.min(1, this.flash)})`;
      ctx.fillRect(0, 0, 1280, 720);
      this.flash -= dt * 2.2;
    }
  }

  interp(f, pf, alpha) {
    if (!pf || Math.abs(pf.x - f.x) > 80 * U || Math.abs(pf.y - f.y) > 80 * U) return { x: f.x / U, y: f.y / U };
    return { x: (pf.x + (f.x - pf.x) * alpha) / U, y: (pf.y + (f.y - pf.y) * alpha) / U };
  }

  drawShadow(ctx, x, y) {
    let gy = WORLD.floor;
    for (const p of PLATFORMS) if (x >= p.x1 && x <= p.x2 && p.y >= y - 1 && p.y < gy) gy = p.y;
    const h = Math.max(0, gy - y);
    const s = Math.max(0.25, 1 - h / 300);
    ctx.save();
    ctx.globalAlpha = 0.35 * s;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x, gy, 26 * s, 6 * s, 0, 0, 6.283); ctx.fill();
    ctx.restore();
  }

  drawChargeMeter(ctx, f, a, col) {
    const cfg = W[f.wpn][f.atk.id];
    const c = cfg.cMax ? f.atk.c / cfg.cMax : 0;
    const x = a.head.x - f.face * 38, y = a.head.y - 6;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y, 13, 0, 6.283);
    ctx.fillStyle = 'rgba(20,12,8,0.75)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = PAL.ink; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 13, -Math.PI / 2, -Math.PI / 2 + c * Math.PI * 2);
    ctx.lineWidth = 5; ctx.strokeStyle = c >= 1 ? '#fff6d0' : col.light; ctx.stroke();
    if (c >= 1) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(this.time * 25);
      ctx.beginPath(); ctx.arc(x, y, 18, 0, 6.283); ctx.lineWidth = 3; ctx.strokeStyle = col.light; ctx.stroke();
    }
    ctx.restore();
  }

  drawHitboxes(ctx, s) {
    const rect = (r, c) => { ctx.strokeStyle = c; ctx.strokeRect(r.x1 / U, r.y1 / U, (r.x2 - r.x1) / U, (r.y2 - r.y1) / U); };
    ctx.save(); ctx.lineWidth = 2;
    for (const f of s.f) { rect(hurtbox(f), '#3f3'); const h = hitbox(f); if (h) rect(h, '#f33'); }
    s.props.walls.forEach((w, i) => { if (w.hp > 0) rect(wallRect(i), '#fc3'); });
    s.props.barrels.forEach((b) => { if (b.st !== 2) rect(barrelRect(b), '#3cf'); });
    s.props.mugs.forEach((m) => { if (m.st !== 2) rect(mugRect(m), '#3cf'); });
    ctx.restore();
  }
}
