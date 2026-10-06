// Écran de fin : vainqueur, statistiques, revanche.
import { h, button, show, screen } from './dom.js';
import { U } from '../sim/units.js';
import { PAL } from '../render/palette.js';
import { FighterPreview } from './preview.js';

const fmt = (v) => (v / U).toFixed(v % U ? 1 : 0);

export function endScreen(app, { state, names, li, onRematch, onMenu, onChange, rematchLabel = 'Revanche' }) {
  const w = state.winner;
  const status = h('p', { class: 'status' });
  const rows = [
    ['Dégâts infligés', (f) => fmt(f.dmgOut)],
    ['Coups donnés', (f) => f.hits],
    ['Plus gros coup', (f) => fmt(f.best)],
    ['K.O.', (f) => f.score],
  ];
  const table = h('table', { class: 'stats' },
    h('tr', {}, h('th', {}), ...[0, 1].map((i) => h('th', { style: `color:${PAL.players[i].main}` }, names[i]))),
    rows.map(([label, fn]) => h('tr', {}, h('td', {}, label), ...[0, 1].map((i) => h('td', { class: i === w ? 'win' : '' }, fn(state.f[i]))))),
  );
  const rematchBtn = button(rematchLabel, () => { rematchBtn.disabled = true; onRematch(); }, 'primary');
  const cv = h('canvas', { width: 300, height: 260, class: 'preview' });
  const prev = new FighterPreview(cv, w, state.f[w].wpn);
  prev.setVictory(true);
  const title = w === li ? 'Victoire !' : 'Défaite…';
  show(screen('end',
    h('div', { class: 'endbanner' },
      h('h1', { style: `--pc:${PAL.players[w].main}` }, title),
      h('div', { class: 'winner' }, `${names[w]} remporte la Bastonnade !`)),
    h('div', { class: 'panel endpanel' },
      h('div', { class: 'row' }, h('div', { class: 'previewbox' }, cv), table),
      status,
      h('div', { class: 'row' },
        button('Retour au menu', onMenu, 'back'),
        onChange ? button('Changer d\'arme', onChange) : null,
        onRematch ? rematchBtn : null),
    ),
  ));
  return {
    setStatus: (t) => { status.textContent = t; },
    enableRematch: () => { rematchBtn.disabled = false; },
  };
}
