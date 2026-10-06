// Transforme les événements de simulation en juice : particules, sons,
// tremblements, flashs. Gère les doublons dus au rollback (re-simulation).
import { U } from '../sim/units.js';
import { FIREPLACE, CANDLES, WORLD } from '../sim/map.js';
import { spawn, PT, updateParticles } from '../render/particles.js';
import { sfxPlay } from '../audio/audio.js';
import { PAL, playerColor } from '../render/palette.js';
import { rand, pick } from '../core/util.js';

const SPARK_COLS = ['#fff6d0', '#ffd36b', '#ffb347', '#ff8a2a'];
const WOOD_COLS = [PAL.wood, PAL.woodMid, PAL.woodLight, PAL.woodPale, PAL.plank];
const DUST = '#b8a088';

export class FX {
  constructor(renderer) {
    this.r = renderer;
    this.played = new Map();   // frame -> Set(signatures)
    this.state = null;
    this.lineT = [0, 0];
    this.runT = [0, 0];
    this.chargeT = [0, 0];
    this.ambT = 0;
    this.hooks = {};           // callbacks UI (ko, matchEnd...)
  }

  reset() { this.played.clear(); }

  onEvents(frame, events, resim) {
    let set = this.played.get(frame);
    if (!set) { set = new Set(); this.played.set(frame, set); }
    for (const e of events) {
      const sig = `${e.type}:${e.i ?? ''}:${e.id ?? ''}:${e.n ?? ''}`;
      if (set.has(sig)) continue;
      set.add(sig);
      this.handle(e, resim);
    }
    if (this.played.size > 240) {
      for (const k of this.played.keys()) { if (k < frame - 120) this.played.delete(k); }
    }
  }

  anim(i) { return this.r.anims[i]; }
  shake(v) { this.r.cam.addShake(v); }

  handle(e, resim) {
    const x = e.x != null ? e.x / U : 640, y = e.y != null ? e.y / U : 360;
    switch (e.type) {
      case 'hit': return this.hit(e, x, y);
      case 'clash': return this.clash(x, y);
      case 'armor':
        // super armure : le coup passe sans interrompre (éclat métallique)
        for (let k = 0; k < 14; k++) this.spark(x, y, rand(200, 450), 0.25);
        spawn(PT.RING, x, y, 0, 0, 0.22, 46, 'rgba(255,240,200,0.9)');
        this.anim(e.i).flash = 0.05;
        sfxPlay.clash(x);
        this.shake(0.12);
        return;
      case 'jump':
        this.dust(x, y, 8, 120, 0.4);
        this.anim(e.i).kick(-3.2);
        sfxPlay.jump();
        return;
      case 'djump':
        for (let k = 0; k < 14; k++) {
          const a = (k / 14) * Math.PI * 2;
          spawn(PT.DUST, x + Math.cos(a) * 12, y + 4, Math.cos(a) * 140, Math.sin(a) * 30 + 40, 0.35, 5, '#e8ddd0', 0, 3);
        }
        spawn(PT.RING, x, y + 2, 0, 0, 0.25, 34, 'rgba(255,240,220,0.6)');
        this.anim(e.i).kick(-2.6);
        sfxPlay.djump();
        return;
      case 'land': {
        const v = Math.min(1, e.v / U / 14);
        if (v > 0.15) this.dust(x, y, 4 + v * 14, 90 + v * 160, 0.45);
        this.anim(e.i).kick(1.2 + v * 4);
        if (v > 0.3) sfxPlay.land(v);
        return;
      }
      case 'dodge':
        this.dust(x, y, 10, 160, 0.4);
        for (let k = 0; k < 6; k++) spawn(PT.LINE, x + rand(-20, 20), y - rand(20, 90), -e.dir * rand(300, 500) || rand(-200, 200), 0, 0.18, rand(30, 60), '#ffffff');
        sfxPlay.dodge();
        return;
      case 'brake':
        for (let k = 0; k < 10; k++) spawn(PT.DUST, x + rand(-8, 8), y - 2, e.dir * rand(60, 220), -rand(10, 60), rand(0.3, 0.6), rand(3, 7), DUST, 0, 2);
        sfxPlay.brake();
        return;
      case 'swing':
        sfxPlay.swing(e.wpn, e.heavy);
        if (e.wpn === 'hammer' && e.id === 'nheavy') {
          // Séisme : onde de choc au sol des deux côtés
          const gx = x + e.face * 40;
          spawn(PT.RING, gx, y, 0, 0, 0.4, 120, 'rgba(255,230,190,0.8)');
          this.dust(gx, y, 24, 380, 0.7);
          for (let k = 0; k < 12; k++) spawn(PT.SPLINTER, gx + rand(-60, 60), y, rand(-260, 260), rand(-380, -120), rand(4, 7), rand(3, 5), pick(WOOD_COLS), 1500, 0.2, rand(0, 6), rand(-16, 16));
          sfxPlay.slam(gx);
          this.shake(0.4);
        }
        return;
      case 'atk': {
        const id = e.id;
        if (id === 'nheavy') sfxPlay.charge();
        return;
      }
      case 'chargeFull': {
        const a = this.anim(e.i);
        spawn(PT.RING, a.tip.x, a.tip.y, 0, 0, 0.3, 30, '#fff6d0');
        for (let k = 0; k < 14; k++) this.spark(a.tip.x, a.tip.y, rand(100, 300), 0.3);
        sfxPlay.chargeFull();
        return;
      }
      case 'wallHit': this.splinters(x, y, 8, 220); this.dust(x, y, 4, 80, 0.4); sfxPlay.wood(0.5, x); this.shake(0.08); return;
      case 'wallCrack': this.splinters(x, y, 18, 320); this.dust(x, y, 8, 120, 0.5); sfxPlay.woodBreak(false, x); this.shake(0.15); return;
      case 'wallBreak':
        this.splinters(x, y, 46, 520, true);
        for (let k = 0; k < 20; k++) spawn(PT.SMOKE, x + rand(-20, 20), y + rand(-50, 50), rand(-60, 60), rand(-60, 0), rand(0.6, 1.2), rand(14, 26), '#999', 0, 1.5);
        sfxPlay.woodBreak(true, x);
        this.shake(0.4);
        return;
      case 'barrelHit': this.splinters(x, y, 6, 200); sfxPlay.wood(0.8, x); this.shake(0.1); return;
      case 'barrelBurst':
        this.splinters(x, y, 40, 480, true);
        this.liquid(x, y, 46, PAL.ale, 420, e.vx / U);
        this.dust(x, y + 20, 10, 150, 0.5);
        spawn(PT.RING, x, y, 0, 0, 0.35, 70, 'rgba(255,220,150,0.7)');
        sfxPlay.woodBreak(true, x); sfxPlay.splash(true, x);
        this.shake(0.35);
        return;
      case 'mugHit': sfxPlay.clink(x); this.liquid(x, y - 6, 6, PAL.foam, 120, 0); return;
      case 'mugBreak':
        for (let k = 0; k < 12; k++) spawn(PT.SHARD, x, y, rand(-240, 240) + e.vx / U * 8, rand(-320, -60), rand(5, 8), rand(2.5, 5), pick([PAL.woodMid, PAL.iron, PAL.woodLight]), 1300, 0.4, rand(0, 6), rand(-14, 14));
        this.liquid(x, y, 26, PAL.ale, 300, e.vx / U * 0.4);
        for (let k = 0; k < 8; k++) spawn(PT.DROP, x, y, rand(-140, 140), rand(-260, -80), 1.5, rand(2, 4), PAL.foam, 1200);
        sfxPlay.glass(x); sfxPlay.splash(false, x);
        this.shake(0.1);
        return;
      case 'bounce':
        this.dust(x, y, 12, 200, 0.5);
        sfxPlay.thud(Math.min(1, e.v / U / 14), x);
        this.shake(0.12);
        return;
      case 'wallbounce':
        this.dust(x, y, 10, 160, 0.45);
        for (let k = 0; k < 6; k++) spawn(PT.SPLINTER, x, y, rand(-200, 200), rand(-300, -50), rand(4, 7), rand(3, 6), pick(WOOD_COLS), 1400, 0.3, rand(0, 6), rand(-12, 12));
        sfxPlay.thud(0.8, x);
        this.shake(0.22);
        return;
      case 'slam':
        this.dust(x, y, 26, 360, 0.7);
        spawn(PT.RING, x, y, 0, 0, 0.4, 110, 'rgba(255,230,190,0.8)');
        for (let k = 0; k < 16; k++) spawn(PT.SPLINTER, x + rand(-30, 30), y, rand(-320, 320), rand(-420, -120), rand(5, 9), rand(3, 6), pick(WOOD_COLS), 1500, 0.2, rand(0, 6), rand(-16, 16));
        sfxPlay.slam(x);
        this.shake(0.45);
        return;
      case 'ko': return this.ko(e, x, y);
      case 'count': if (!resim) sfxPlay.count(e.n); return;
      case 'go':
        sfxPlay.go();
        for (let k = 0; k < 40; k++) spawn(PT.EMBER, rand(300, 980), rand(200, 500), rand(-80, 80), rand(-160, -40), rand(0.8, 1.6), rand(1.5, 3), '#fff');
        return;
      case 'round': this.r.cam.focus = null; return;
      case 'matchEnd':
        sfxPlay.fanfare();
        if (this.hooks.matchEnd) this.hooks.matchEnd(e.winner);
        return;
    }
  }

  hit(e, x, y) {
    const power = Math.min(1.5, e.dmg / U / 18);
    const heavy = e.heavy || power > 0.8;
    const n = 10 + Math.round(power * 30);
    const kx = e.kbx / U, ky = e.kby / U;
    const dir = Math.atan2(ky, kx);
    for (let k = 0; k < n; k++) {
      const a = dir + rand(-1.1, 1.1);
      const sp = rand(200, 650) * (0.7 + power * 0.6);
      spawn(PT.SPARK, x, y, Math.cos(a) * sp, Math.sin(a) * sp, rand(0.15, 0.35), rand(2, 3.5), pick(SPARK_COLS), 900, 2.5);
    }
    spawn(PT.STAR, x, y, 0, 0, heavy ? 0.16 : 0.1, heavy ? 58 : 36, '#fffaf0', 0, 0, rand(0, 3));
    spawn(PT.FLASH, x, y, 0, 0, 0.14, heavy ? 120 : 70, '#fff');
    if (heavy) spawn(PT.RING, x, y, 0, 0, 0.3, 80 + power * 40, 'rgba(255,240,210,0.9)');
    this.dust(x, y, 4, 120, 0.3);
    if (e.kind === 'barrel') this.splinters(x, y, 10, 260);
    const v = this.anim(e.i);
    v.flash = heavy ? 0.13 : 0.09;
    v.kick(heavy ? 5 : 2.5);
    this.shake(0.12 + power * 0.32);
    sfxPlay.hit('flesh', e.wpn || 'axe', power, x);
    if (e.src >= 0 && this.hooks.hit) this.hooks.hit(e);
  }

  clash(x, y) {
    for (let k = 0; k < 46; k++) {
      const a = rand(0, Math.PI * 2), sp = rand(250, 800);
      spawn(PT.SPARK, x, y, Math.cos(a) * sp, Math.sin(a) * sp - 100, rand(0.2, 0.5), rand(2, 4), pick(SPARK_COLS), 1100, 1.8);
    }
    spawn(PT.FLASH, x, y, 0, 0, 0.2, 160, '#fff');
    spawn(PT.STAR, x, y, 0, 0, 0.18, 70, '#ffffff', 0, 0, rand(0, 3));
    spawn(PT.RING, x, y, 0, 0, 0.35, 90, 'rgba(255,250,230,0.9)');
    sfxPlay.clash(x);
    this.shake(0.3);
  }

  ko(e, x, y) {
    for (let k = 0; k < 70; k++) {
      const a = rand(0, Math.PI * 2), sp = rand(300, 1000);
      spawn(PT.SPARK, x, y, Math.cos(a) * sp, Math.sin(a) * sp, rand(0.3, 0.7), rand(2.5, 4.5), pick(SPARK_COLS), 700, 1.5);
    }
    for (let k = 0; k < 3; k++) spawn(PT.RING, x, y, 0, 0, 0.4 + k * 0.15, 120 + k * 70, 'rgba(255,240,210,0.9)');
    spawn(PT.FLASH, x, y, 0, 0, 0.35, 260, '#fff');
    this.r.flash = e.final ? 0.9 : 0.55;
    this.shake(e.final ? 1.1 : 0.75);
    this.anim(e.i).flash = 0.25;
    sfxPlay.ko(e.final);
    if (e.final) {
      const cam = this.r.cam;
      cam.focus = { x, y: y + 10, zoom: 1.6, until: cam.t + 3.2 };
    }
    if (this.hooks.ko) this.hooks.ko(e);
  }

  spark(x, y, sp, life) {
    const a = rand(0, Math.PI * 2);
    spawn(PT.SPARK, x, y, Math.cos(a) * sp, Math.sin(a) * sp, life, rand(1.5, 3), pick(SPARK_COLS), 600, 2);
  }

  dust(x, y, n, sp, life) {
    for (let k = 0; k < n; k++) {
      const s = k % 2 ? 1 : -1;
      spawn(PT.DUST, x + rand(-10, 10), y - rand(0, 6), s * rand(0.3, 1) * sp, -rand(10, 60), rand(life * 0.6, life * 1.3), rand(4, 9), DUST, -40, 3);
    }
  }

  splinters(x, y, n, sp, big) {
    for (let k = 0; k < n; k++) {
      const a = rand(-Math.PI, 0) + rand(-0.3, 0.3);
      const v = rand(0.3, 1) * sp;
      spawn(PT.SPLINTER, x + rand(-8, 8), y + rand(-20, 20), Math.cos(a) * v, Math.sin(a) * v - 80,
        rand(6, 11), big && k % 4 === 0 ? rand(8, 14) : rand(3, 7), pick(WOOD_COLS), 1500, 0.25, rand(0, 6), rand(-18, 18));
    }
  }

  liquid(x, y, n, col, sp, bias) {
    for (let k = 0; k < n; k++) {
      const a = rand(-Math.PI, 0);
      const v = rand(0.3, 1) * sp;
      spawn(PT.DROP, x, y, Math.cos(a) * v + bias * 20, Math.sin(a) * v - 60, 2, rand(2.5, 5), col, 1300, 0.2);
    }
  }

  // Effets continus (chaque image) : ambiance, poussière de course, charge, lignes de vitesse
  update(dt, state) {
    updateParticles(dt);
    this.ambT += dt;
    if (Math.random() < dt * 18) spawn(PT.EMBER, FIREPLACE.x + rand(-50, 50), WORLD.floor - rand(20, 60), rand(-20, 20), rand(-90, -40), rand(1.5, 3), rand(1.2, 2.4), '#fff', -10, 0.3);
    if (Math.random() < dt * 4) spawn(PT.SMOKE, FIREPLACE.x + rand(-40, 40), WORLD.floor - 90, rand(-15, 15), rand(-40, -20), rand(2.5, 4), rand(14, 22), '#888', -4, 0.2);
    if (Math.random() < dt * 0.8) { const c = pick(CANDLES); spawn(PT.SMOKE, c.x, c.y - c.h - 16, rand(-5, 5), -rand(15, 30), 2.5, 5, '#888', -2, 0.2); }
    if (!state) return;
    state.f.forEach((f, i) => {
      const a = this.anim(i);
      const px = f.x / U, py = f.y / U;
      const sp = Math.hypot(f.vx, f.vy) / U;
      // lignes de vitesse sur les gros knockbacks
      if ((f.st === 'hitstun' || f.st === 'ko') && sp > 9 && f.stop === 0) {
        this.lineT[i] -= dt;
        if (this.lineT[i] <= 0) {
          this.lineT[i] = 0.016;
          for (let k = 0; k < 2; k++) {
            spawn(PT.LINE, px + rand(-40, 40), py - rand(10, 100), f.vx / U * 50, f.vy / U * 50, 0.16, rand(60, 120), '#ffffff');
          }
          if (Math.random() < 0.5) spawn(PT.DUST, px, py - 50, -f.vx / U * 10, -f.vy / U * 10, 0.4, 6, '#ddd', 0, 2);
        }
      }
      // poussière de course
      if (f.gr && f.st === 'free' && Math.abs(f.vx) / U > 6.5) {
        this.runT[i] -= dt;
        if (this.runT[i] <= 0) { this.runT[i] = 0.07; spawn(PT.DUST, px - Math.sign(f.vx) * 10, py - 3, -f.vx / U * 8, -rand(10, 40), 0.4, rand(3, 6), DUST, -30, 2); }
      }
      // particules aspirées pendant la charge
      if (f.atk && f.atk.ph === 'charge') {
        this.chargeT[i] -= dt;
        if (this.chargeT[i] <= 0) {
          this.chargeT[i] = 0.03;
          const ang = rand(0, Math.PI * 2), r = rand(40, 70);
          const col = playerColor(i, f.dummy).light;
          spawn(PT.EMBER, a.tip.x + Math.cos(ang) * r, a.tip.y + Math.sin(ang) * r, -Math.cos(ang) * r * 4, -Math.sin(ang) * r * 4, 0.25, 2.2, col);
        }
      }
    });
  }
}

