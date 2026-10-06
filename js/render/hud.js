// HUD en jeu : pseudos, barres de vie (avec régénération), KO, esquive,
// annonces (compte à rebours, K.O.), ping/FPS, infos d'entraînement.
import { PAL, playerColor } from './palette.js';
import { R, DG } from '../sim/tuning.js';
import { U } from '../sim/units.js';
import { rrect, easeOut, clamp } from '../core/util.js';

const FONT_TITLE = "'MedievalSharp', 'Georgia', serif";
const FONT_TEXT = "'Alegreya SC', 'Georgia', serif";

export class HUD {
  constructor() { this.chip = [1, 1]; this.combo = { n: 0, t: 0, dmg: 0 }; this.time = 0; }

  reset() { this.chip = [1, 1]; this.combo = { n: 0, t: 0, dmg: 0 }; }

  draw(ctx, base, s, info, dt) {
    this.time += dt;
    ctx.setTransform(base, 0, 0, base, 0, 0);
    for (let i = 0; i < 2; i++) this.panel(ctx, s, i, info, dt);
    this.announce(ctx, s);
    if (s.training) this.trainingInfo(ctx, s, dt, info);
    else if (s.phase === 'fight' || s.phase === 'countdown') {
      ctx.font = `18px ${FONT_TEXT}`;
      ctx.textAlign = 'center';
      outlined(ctx, `Manche ${s.round}`, 640, 34, '#ecd9b0', 4);
    }
    const lines = [];
    if (info.showPing && info.ping != null) lines.push(`Ping ${Math.round(info.ping)} ms`);
    if (info.showFps) lines.push(`${Math.round(info.fps)} FPS`);
    if (info.rollbacks != null && info.showFps) lines.push(`rollbacks ${info.rollbacks}`);
    ctx.font = `15px ${FONT_TEXT}`;
    ctx.textAlign = 'left';
    lines.forEach((l, k) => outlined(ctx, l, 18, 700 - k * 20, '#ecd9b0', 3));
  }

  panel(ctx, s, i, info, dt) {
    const f = s.f[i];
    const col = playerColor(i, f.dummy);
    const right = i === 1;
    const W = 400;
    const x0 = right ? 1280 - 24 - W : 24;
    const hp = f.hp / R.maxHp;
    this.chip[i] = Math.max(hp, this.chip[i] - dt * 0.45);
    if (this.chip[i] < hp) this.chip[i] = hp;

    // plaque du pseudo
    const name = info.names[i] || `Joueur ${i + 1}`;
    ctx.font = `22px ${FONT_TITLE}`;
    const nw = Math.min(260, ctx.measureText(name).width + 34);
    const px = right ? 1280 - 24 - nw : 24;
    rrect(ctx, px, 14, nw, 36, 8);
    const g = ctx.createLinearGradient(0, 14, 0, 50);
    g.addColorStop(0, PAL.woodMid); g.addColorStop(1, PAL.woodDark);
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = PAL.ink; ctx.stroke();
    ctx.fillStyle = col.main;
    ctx.beginPath(); ctx.arc(right ? px + nw - 14 : px + 14, 32, 6, 0, 6.3); ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
    ctx.textAlign = right ? 'right' : 'left';
    ctx.fillStyle = PAL.parchment;
    ctx.fillText(name, right ? px + nw - 26 : px + 26, 40, nw - 34);

    // compteur de KO (3 écus)
    if (!s.training) {
      for (let k = 0; k < R.koToWin; k++) {
        const cx = right ? px - 22 - k * 30 : px + nw + 22 + k * 30;
        shield(ctx, cx, 32, k < f.score, col);
      }
    }

    // barre de vie
    const by = 58, bh = 24;
    rrect(ctx, x0 - 4, by - 4, W + 8, bh + 8, 8);
    ctx.fillStyle = PAL.iron; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = PAL.ink; ctx.stroke();
    rrect(ctx, x0, by, W, bh, 5);
    ctx.fillStyle = '#1a0f0b'; ctx.fill();
    ctx.save();
    rrect(ctx, x0, by, W, bh, 5); ctx.clip();
    const fillW = (w) => (right ? [x0 + W - w, w] : [x0, w]);
    let [cx0, cw] = fillW(W * this.chip[i]);
    ctx.fillStyle = '#f5e6c8'; ctx.fillRect(cx0, by, cw, bh);
    const regen = f.since >= (f.dummy ? R.tRegenDelay : R.regenDelay) && f.hp < R.maxHp && f.st !== 'ko';
    [cx0, cw] = fillW(W * hp);
    const hg = ctx.createLinearGradient(0, by, 0, by + bh);
    if (regen) { hg.addColorStop(0, '#b8f07a'); hg.addColorStop(1, '#3f9a3a'); }
    else { hg.addColorStop(0, col.light); hg.addColorStop(0.5, col.main); hg.addColorStop(1, col.dark); }
    ctx.fillStyle = hg; ctx.fillRect(cx0, by, cw, bh);
    if (regen) {
      ctx.globalAlpha = 0.35; ctx.fillStyle = '#ffffff';
      const off = (this.time * 60) % 24;
      for (let sx = -24; sx < W + 24; sx += 24) {
        const xx = right ? x0 + W - sx - off : x0 + sx + off;
        ctx.beginPath(); ctx.moveTo(xx, by + bh); ctx.lineTo(xx + 8, by); ctx.lineTo(xx + 16, by); ctx.lineTo(xx + 8, by + bh); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(cx0, by + 2, cw, 4);
    ctx.restore();
    // graduations
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5;
    for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x0 + (W * k) / 4, by + 2); ctx.lineTo(x0 + (W * k) / 4, by + bh - 2); ctx.stroke(); }
    ctx.font = `bold 16px ${FONT_TEXT}`;
    ctx.textAlign = right ? 'left' : 'right';
    outlined(ctx, `${Math.ceil(hp * 100)}${regen ? ' +' : ''}`, right ? x0 + 8 : x0 + W - 8, by + 18, '#fff', 3);

    // esquive
    const dx = right ? x0 - 26 : x0 + W + 26, dy = by + bh / 2;
    const ready = f.dcd <= 0 && (f.gr || f.adodge > 0);
    const prog = 1 - f.dcd / DG.cd;
    ctx.beginPath(); ctx.arc(dx, dy, 15, 0, 6.3);
    ctx.fillStyle = ready ? col.dark : '#2a1d16'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = PAL.ink; ctx.stroke();
    ctx.beginPath(); ctx.arc(dx, dy, 15, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
    ctx.strokeStyle = ready ? '#fff4d6' : col.light; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = ready ? '#fff' : 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(dx - 8, dy - 4); ctx.lineTo(dx + 6, dy - 4); ctx.moveTo(dx - 4, dy + 1); ctx.lineTo(dx + 8, dy + 1); ctx.moveTo(dx - 8, dy + 6); ctx.lineTo(dx + 3, dy + 6);
    ctx.stroke();
  }

  announce(ctx, s) {
    const b = R.beat;
    let text = null, scale = 1, alpha = 1, color = 'gold';
    if (s.phase === 'countdown') {
      const k = Math.floor((s.pt - 1) / b);
      if (k >= 0 && k < 3) {
        const p = ((s.pt - 1) % b) / b;
        text = String(3 - k);
        scale = 1.8 - 0.8 * easeOut(clamp(p * 4, 0, 1));
        alpha = p > 0.8 ? (1 - p) * 5 : 1;
      }
    } else if (s.phase === 'fight' && s.pt < 60 && !s.training) {
      const p = s.pt / 60;
      text = 'Bastonnade !';
      scale = 1.5 - 0.5 * easeOut(clamp(p * 5, 0, 1));
      alpha = p > 0.7 ? (1 - p) / 0.3 : 1;
    } else if (s.phase === 'ko' && s.pt < (s.final ? 200 : 120)) {
      const p = s.pt / (s.final ? 200 : 120);
      text = 'K.O. !';
      color = 'red';
      scale = 2 - easeOut(clamp(p * 6, 0, 1));
      alpha = p > 0.8 ? (1 - p) * 5 : 1;
    }
    if (!text) return;
    ctx.save();
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.translate(640, 300);
    ctx.scale(scale, scale);
    ctx.font = `${text.length > 3 ? 92 : 130}px ${FONT_TITLE}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 16; ctx.strokeStyle = PAL.ink; ctx.strokeText(text, 0, 0);
    const g = ctx.createLinearGradient(0, -50, 0, 50);
    if (color === 'red') { g.addColorStop(0, '#ffb08a'); g.addColorStop(0.5, '#e8442f'); g.addColorStop(1, '#7a1410'); }
    else { g.addColorStop(0, '#fff3c0'); g.addColorStop(0.5, '#f3c24a'); g.addColorStop(1, '#a8651c'); }
    ctx.fillStyle = g; ctx.fillText(text, 0, 0);
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.strokeText(text, 0, -2);
    ctx.restore();
  }

  trainingInfo(ctx, s, dt, info) {
    const d = s.f[1];
    const c = this.combo;
    if (d.combo > 0) { if (d.combo >= c.n || c.t <= 0) { c.n = d.combo; } c.t = 1.6; c.dmg = d.lastDmg; }
    else c.t -= dt;
    const W = 420, x = 640 - W / 2, y = 640;
    rrect(ctx, x, y, W, 62, 10);
    const g = ctx.createLinearGradient(0, y, 0, y + 62);
    g.addColorStop(0, PAL.parchment); g.addColorStop(1, PAL.parchmentDark);
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = PAL.ink; ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = PAL.ink;
    ctx.font = `22px ${FONT_TITLE}`;
    const last = d.lastDmg ? (d.lastDmg / U).toFixed(d.lastDmg % U ? 1 : 0) : '-';
    const combo = c.t > 0 && c.n > 1 ? `${c.n} coups` : '-';
    ctx.fillText(`Dernier coup : ${last}     Combo : ${combo}`, 640, y + 28);
    ctx.font = `15px ${FONT_TEXT}`;
    ctx.fillStyle = PAL.inkSoft;
    ctx.fillText(`R : réinitialiser la taverne   ·   H : hitbox ${info.hitboxes ? '(on)' : '(off)'}   ·   Échap : menu`, 640, y + 50);
    if (c.t > 0 && c.n > 1) {
      ctx.save();
      ctx.translate(1040, 190);
      const sc = 1 + Math.max(0, c.t - 1.4) * 2;
      ctx.scale(sc, sc);
      ctx.font = `46px ${FONT_TITLE}`;
      ctx.lineWidth = 9; ctx.strokeStyle = PAL.ink; ctx.lineJoin = 'round';
      ctx.globalAlpha = clamp(c.t * 2, 0, 1);
      ctx.strokeText(`${c.n} coups !`, 0, 0);
      ctx.fillStyle = '#f3c24a'; ctx.fillText(`${c.n} coups !`, 0, 0);
      ctx.restore();
    }
  }
}

function outlined(ctx, text, x, y, color, w) {
  ctx.lineJoin = 'round';
  ctx.lineWidth = w; ctx.strokeStyle = PAL.ink; ctx.strokeText(text, x, y);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}

function shield(ctx, x, y, filled, col) {
  ctx.beginPath();
  ctx.moveTo(x - 11, y - 13); ctx.lineTo(x + 11, y - 13); ctx.lineTo(x + 11, y);
  ctx.quadraticCurveTo(x + 10, y + 10, x, y + 15); ctx.quadraticCurveTo(x - 10, y + 10, x - 11, y); ctx.closePath();
  ctx.fillStyle = filled ? col.main : 'rgba(30,20,15,0.8)'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = PAL.ink; ctx.stroke();
  ctx.lineWidth = 1.5; ctx.strokeStyle = filled ? PAL.goldLight : PAL.iron; ctx.stroke();
  if (filled) {
    ctx.strokeStyle = PAL.goldLight; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 5, y - 6); ctx.lineTo(x + 5, y + 5); ctx.moveTo(x + 5, y - 6); ctx.lineTo(x - 5, y + 5); ctx.stroke();
  }
}
