// Logo « Bastonnade » dessiné au canvas (écran titre).
import { PAL } from './palette.js';
import { drawWeapon } from './draw_weapons.js';

const FONT = "'MedievalSharp', 'Georgia', serif";

export function drawLogo(ctx, base, t) {
  ctx.setTransform(base, 0, 0, base, 0, 0);
  const cx = 640, cy = 168 + Math.sin(t * 1.6) * 3;
  ctx.save();
  // armes croisées derrière le titre
  ctx.save();
  ctx.translate(cx, cy + 6);
  ctx.scale(2.3, 2.3);
  drawWeapon(ctx, 'axe', -46, 34, -0.95, {});
  drawWeapon(ctx, 'rapier', 46, 34, -Math.PI + 0.95, {});
  ctx.restore();
  // écu central
  ctx.beginPath();
  ctx.moveTo(cx - 70, cy - 74); ctx.lineTo(cx + 70, cy - 74); ctx.lineTo(cx + 70, cy - 10);
  ctx.quadraticCurveTo(cx + 64, cy + 50, cx, cy + 78); ctx.quadraticCurveTo(cx - 64, cy + 50, cx - 70, cy - 10); ctx.closePath();
  const sg = ctx.createLinearGradient(cx - 70, 0, cx + 70, 0);
  sg.addColorStop(0, PAL.players[0].dark); sg.addColorStop(0.5, PAL.players[0].main); sg.addColorStop(0.5, PAL.players[1].main); sg.addColorStop(1, PAL.players[1].dark);
  ctx.fillStyle = sg; ctx.fill();
  ctx.lineWidth = 7; ctx.strokeStyle = PAL.ink; ctx.stroke();
  ctx.lineWidth = 3; ctx.strokeStyle = PAL.gold; ctx.stroke();
  // banderole
  const by = cy + 6;
  ctx.beginPath();
  ctx.moveTo(cx - 380, by - 50); ctx.quadraticCurveTo(cx, by - 80, cx + 380, by - 50);
  ctx.lineTo(cx + 360, by + 40); ctx.quadraticCurveTo(cx, by + 10, cx - 360, by + 40); ctx.closePath();
  const bg = ctx.createLinearGradient(0, by - 70, 0, by + 40);
  bg.addColorStop(0, '#f4e3bb'); bg.addColorStop(1, '#c9a46a');
  ctx.fillStyle = bg; ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = PAL.ink; ctx.stroke();
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + s * 370, by - 30); ctx.lineTo(cx + s * 440, by - 34); ctx.lineTo(cx + s * 410, by + 2); ctx.lineTo(cx + s * 444, by + 38); ctx.lineTo(cx + s * 356, by + 30); ctx.closePath();
    ctx.fillStyle = '#b48a52'; ctx.fill(); ctx.lineWidth = 5; ctx.stroke();
  }
  // titre
  ctx.font = `104px ${FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const letters = 'Bastonnade'.split('');
  const widths = letters.map((l) => ctx.measureText(l).width);
  const total = widths.reduce((a, b) => a + b, 0);
  let x = cx - total / 2;
  letters.forEach((l, i) => {
    const lx = x + widths[i] / 2;
    const ly = by - 16 + Math.sin(t * 3 + i * 0.6) * 3 - Math.cos((lx - cx) / 420) * 0 - ((lx - cx) / 380) ** 2 * -14;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(Math.sin(t * 2 + i) * 0.03);
    ctx.lineWidth = 16; ctx.strokeStyle = PAL.ink; ctx.strokeText(l, 0, 0);
    const g = ctx.createLinearGradient(0, -48, 0, 48);
    g.addColorStop(0, '#fff2bf'); g.addColorStop(0.45, '#f2bf45'); g.addColorStop(0.55, '#d8902a'); g.addColorStop(1, '#8a4a16');
    ctx.fillStyle = g; ctx.fillText(l, 0, 0);
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.strokeText(l, 0, -2);
    ctx.restore();
    x += widths[i];
  });
  ctx.font = `24px ${FONT}`;
  ctx.lineWidth = 6; ctx.strokeStyle = PAL.ink;
  ctx.strokeText('~ Baston de taverne en un contre un ~', cx, by + 62);
  ctx.fillStyle = PAL.parchment;
  ctx.fillText('~ Baston de taverne en un contre un ~', cx, by + 62);
  ctx.restore();
}
