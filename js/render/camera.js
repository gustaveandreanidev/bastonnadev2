// Caméra légèrement dynamique : cadre les deux combattants, tremble, zoome.
import { WORLD } from '../sim/map.js';
import { clamp } from '../core/util.js';
import { options, SHAKE_SCALE } from '../core/options.js';

export class Camera {
  constructor() {
    this.x = 640; this.y = 360; this.zoom = 1;
    this.trauma = 0; this.sx = 0; this.sy = 0; this.t = 0;
    this.focus = null;
  }

  addShake(v) { this.trauma = Math.min(1.2, this.trauma + v); }

  update(dt, pts) {
    this.t += dt;
    let tx = 640, ty = 360, tz = 1;
    if (this.focus && this.t < this.focus.until) {
      tx = this.focus.x; ty = this.focus.y; tz = this.focus.zoom;
    } else {
      this.focus = null;
      if (pts.length) {
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        for (const p of pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y - 60); y1 = Math.max(y1, p.y); }
        tx = (x0 + x1) / 2; ty = (y0 + y1) / 2 - 20;
        tz = clamp(Math.min(1280 / (x1 - x0 + 640), 720 / (y1 - y0 + 420)), 1, 1.22);
      }
    }
    const k = 1 - Math.exp(-dt * (this.focus ? 6 : 3.2));
    this.zoom += (tz - this.zoom) * k;
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;
    const hw = 640 / this.zoom, hh = 360 / this.zoom;
    this.x = clamp(this.x, hw, WORLD.w - hw);
    this.y = clamp(this.y, hh, WORLD.h - hh);

    this.trauma = Math.max(0, this.trauma - dt * 1.7);
    const s = this.trauma * this.trauma * 26 * SHAKE_SCALE[options.shake];
    this.sx = s * (Math.sin(this.t * 71) * 0.6 + Math.sin(this.t * 133) * 0.4);
    this.sy = s * (Math.sin(this.t * 83 + 1) * 0.6 + Math.sin(this.t * 121 + 2) * 0.4);
  }

  apply(ctx, base) {
    const z = this.zoom * base;
    ctx.setTransform(z, 0, 0, z, base * (640 - (this.x + this.sx) * this.zoom), base * (360 - (this.y + this.sy) * this.zoom));
  }

  reset() { this.x = 640; this.y = 360; this.zoom = 1; this.trauma = 0; this.focus = null; }
}
