// Carte d'arme : dessin, descriptif et jauges (vitesse, portée, puissance).
import { h } from './dom.js';
import { WEAPONS } from '../config.js';
import { drawWeapon } from '../render/draw_weapons.js';
import { sfxPlay, initAudio } from '../audio/audio.js';

const ANGLE = { rapier: -0.55, axe: -0.75, spear: -0.32, daggers: -0.9, hammer: -0.8, flail: -0.6 };
const ORIGIN = { rapier: [44, 102], axe: [56, 112], spear: [26, 96], daggers: [56, 96], hammer: [50, 112], flail: [46, 100] };
const SCALE = { rapier: 1.25, axe: 1.35, spear: 0.95, daggers: 1.6, hammer: 1.2, flail: 1.3 };

export function drawWeaponIcon(canvas, id, color) {
  const ctx = canvas.getContext('2d');
  const s = canvas.width / 160;
  ctx.setTransform(s, 0, 0, s, 0, 0);
  ctx.clearRect(0, 0, 160, 120);
  const [ox, oy] = ORIGIN[id];
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(SCALE[id], SCALE[id]);
  drawWeapon(ctx, id, 0, 0, ANGLE[id], { ribbon: color, hang: 0.55 });
  if (id === 'daggers') drawWeapon(ctx, id, 50, 0, -Math.PI - ANGLE[id], {});
  ctx.restore();
}

function gauge(label, v) {
  const pips = [];
  for (let i = 0; i < 5; i++) pips.push(h('span', { class: `pip ${i < v ? 'on' : ''}` }));
  return h('div', { class: 'gauge' }, h('span', { class: 'glabel' }, label), h('span', { class: 'pips' }, pips));
}

export function weaponCard(id, { selected, onPick, color }) {
  const w = WEAPONS[id];
  const cv = h('canvas', { width: 320, height: 240, class: 'wicon' });
  drawWeaponIcon(cv, id, color);
  const card = h('div', { class: `wcard ${selected ? 'selected' : ''}`, tabIndex: 0 },
    cv,
    h('div', { class: 'wname' }, w.name),
    h('div', { class: 'wdesc' }, w.desc),
    gauge('Vitesse', w.gauges.speed),
    gauge('Portée', w.gauges.range),
    gauge('Puissance', w.gauges.power),
  );
  const pick = () => { initAudio(); sfxPlay.ui('click'); onPick(id); };
  card.addEventListener('click', pick);
  card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') pick(); });
  card.addEventListener('mouseenter', () => sfxPlay.ui('hover'));
  return card;
}
