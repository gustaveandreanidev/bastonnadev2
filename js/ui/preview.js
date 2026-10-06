// Petit stickman de démonstration (lobby, choix d'arme) : enchaîne les
// attaques de l'arme choisie en réutilisant le rendu du jeu.
import { FighterAnim, drawFighter, drawTrail } from '../render/draw_fighter.js';
import { W } from '../sim/tuning.js';
import { playerColor, PAL } from '../render/palette.js';
import { sfxPlay } from '../audio/audio.js';

const SEQ = ['nlight', 'slight', 'nheavy', 'nlight'];

export class FighterPreview {
  constructor(canvas, colorIndex, weapon, { sound = false } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.col = playerColor(colorIndex, false);
    this.sound = sound;
    this.anim = new FighterAnim();
    this.f = {
      i: colorIndex, wpn: weapon, dummy: 0, x: 0, y: 0, vx: 0, vy: 0, face: 1,
      st: 'free', t: 0, gr: 1, crouch: 0, djT: -999, atk: null, stop: 0, hp: 1,
    };
    this.wait = 40; this.seq = 0; this.tick = 0; this.acc = 0; this.last = performance.now();
    this.victory = false;
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  setWeapon(w) {
    this.f.wpn = w; this.f.st = 'free'; this.f.atk = null; this.wait = 18; this.seq = 0;
    this.anim = new FighterAnim();
  }

  setVictory(v) { this.victory = v; this.f.st = v ? 'victory' : 'free'; this.f.atk = null; }

  step() {
    const f = this.f;
    this.tick++;
    if (this.victory) return;
    if (f.st === 'attack') {
      const k = f.atk, a = W[f.wpn][k.id];
      k.t++;
      if (k.ph === 'charge') { if (k.c < 28) k.c++; else { k.ph = 'startup'; k.t = 0; } }
      else if (k.ph === 'startup' && k.t >= a.startup) { k.ph = 'active'; k.t = 0; if (this.sound) sfxPlay.swing(f.wpn, k.id === 'nheavy'); }
      else if (k.ph === 'active' && k.t >= a.active) { k.ph = 'recovery'; k.t = 0; }
      else if (k.ph === 'recovery' && k.t >= a.recovery) { f.st = 'free'; f.atk = null; this.wait = 36; }
    } else if (--this.wait <= 0) {
      const id = SEQ[this.seq++ % SEQ.length];
      f.st = 'attack';
      f.atk = { id, ph: W[f.wpn][id].cMax ? 'charge' : 'startup', t: 0, c: 0 };
    }
  }

  loop(now) {
    if (!this.canvas.isConnected) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.acc += dt;
    while (this.acc >= 1 / 60) { this.step(); this.acc -= 1 / 60; }
    const ctx = this.ctx, c = this.canvas;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    const s = c.height / 200;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    const w = c.width / s;
    // sol
    const g = ctx.createRadialGradient(w / 2, 170, 10, w / 2, 170, 120);
    g.addColorStop(0, 'rgba(255,170,80,0.35)'); g.addColorStop(1, 'rgba(255,170,80,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, 200);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(w / 2 - 10, 172, 34, 7, 0, 0, 6.3); ctx.fill();
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2;
    const x = w / 2 - 22, y = 172;
    const f = this.f;
    let glow = 0;
    if (f.atk && f.atk.ph === 'charge') glow = 0.3 + 0.7 * (f.atk.c / 28);
    drawTrail(ctx, this.anim, this.col);
    drawFighter(ctx, f, this.anim, x, y, this.col, { dt, tf: this.acc * 60, tick: this.tick, glow });
  }
}
