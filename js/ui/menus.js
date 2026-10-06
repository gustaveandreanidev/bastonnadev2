// Écran titre, options, contrôles, pause.
import { h, button, show, screen, panel, overlay } from './dom.js';
import { options, setOption } from '../core/options.js';
import { WEAPONS, WEAPON_IDS, ATTACK_LIST } from '../config.js';
import { sfxPlay } from '../audio/audio.js';

export function titleScreen(app) {
  show(screen('title',
    h('div', { class: 'title-buttons' },
      button('Créer un salon', () => app.openHost()),
      button('Rejoindre un salon', () => app.openJoin()),
      button('Contre un bot', () => app.openBotSelect()),
      button('Entraînement', () => app.openTrainingSelect()),
      h('div', { class: 'row' },
        button('Options', () => optionsScreen(app, () => titleScreen(app)), 'small'),
        button('Contrôles', () => controlsScreen(() => titleScreen(app)), 'small'),
      ),
    ),
    h('div', { class: 'footer' }, 'Z Q S D pour bouger · L attaque légère · M attaque lourde · K esquive'),
  ));
  app.setScene('title');
}

function slider(label, key) {
  const val = h('span', { class: 'val' }, `${Math.round(options[key] * 100)} %`);
  const input = h('input', {
    type: 'range', min: 0, max: 100, value: Math.round(options[key] * 100),
    oninput: (e) => { setOption(key, e.target.value / 100); val.textContent = `${e.target.value} %`; },
    onchange: () => sfxPlay.hit('flesh', 'rapier', 0.4),
  });
  return h('label', { class: 'opt' }, h('span', { class: 'olabel' }, label), input, val);
}

function segmented(label, key, choices) {
  const wrap = h('div', { class: 'seg' });
  const render = () => {
    wrap.replaceChildren(...choices.map(([v, txt]) => h('button', {
      class: `segb ${options[key] === v ? 'on' : ''}`,
      onclick: () => { setOption(key, v); sfxPlay.ui('click'); render(); },
    }, txt)));
  };
  render();
  return h('div', { class: 'opt' }, h('span', { class: 'olabel' }, label), wrap);
}

function toggle(label, key) {
  const b = h('button', { class: `segb ${options[key] ? 'on' : ''}` }, options[key] ? 'Affiché' : 'Masqué');
  b.onclick = () => { setOption(key, !options[key]); sfxPlay.ui('click'); b.className = `segb ${options[key] ? 'on' : ''}`; b.textContent = options[key] ? 'Affiché' : 'Masqué'; };
  return h('div', { class: 'opt' }, h('span', { class: 'olabel' }, label), h('div', { class: 'seg' }, b));
}

export function optionsPanel(onBack) {
  return panel('Options',
    h('div', { class: 'opts' },
      slider('Volume général', 'master'),
      slider('Volume des effets', 'sfx'),
      segmented('Tremblement de l\'écran', 'shake', [[0, 'Désactivé'], [1, 'Faible'], [2, 'Normal'], [3, 'Fort']]),
      segmented('Input delay en ligne', 'inputDelay', [[1, '1'], [2, '2'], [3, '3'], [4, '4']]),
      toggle('Ping', 'showPing'),
      toggle('FPS', 'showFps'),
    ),
    h('p', { class: 'hint' }, 'L\'input delay s\'applique au prochain match en ligne. Plus il est haut, moins il y a de corrections visibles.'),
    h('div', { class: 'row' }, button('Retour', onBack, 'back')),
  );
}

export function optionsScreen(app, onBack) {
  show(screen('menu', optionsPanel(onBack)));
}

export function controlsPanel(onBack) {
  const keys = [
    ['Z', 'Saut (double saut en l\'air)'],
    ['Q / D', 'Gauche / droite · double tap : courir'],
    ['S', 'Accroupi · chute rapide en l\'air · S + Z : descendre d\'une table'],
    ['L', 'Attaque légère'],
    ['M', 'Attaque lourde (maintenir au sol pour charger)'],
    ['K', 'Esquive (invincible un court instant, 1 s de recharge)'],
    ['Échap', 'Menu pause'],
  ];
  return panel('Contrôles',
    h('div', { class: 'controls' },
      h('table', { class: 'keys' }, keys.map(([k, d]) => h('tr', {}, h('td', {}, h('kbd', {}, k)), h('td', {}, d)))),
      h('div', { class: 'movesets' }, WEAPON_IDS.map((id) => h('div', { class: 'moveset' },
        h('h3', {}, WEAPONS[id].name),
        h('ul', {}, ATTACK_LIST.map(([k, key, label]) => h('li', {},
          h('b', {}, WEAPONS[id].attacks[k].name), ` · ${label} `, h('kbd', { class: 'mini' }, key)))),
      ))),
    ),
    h('div', { class: 'row' }, button('Retour', onBack, 'back')),
  );
}

export function controlsScreen(onBack) {
  show(screen('menu', controlsPanel(onBack)));
}

// Menu pause (superposé). En ligne, le combat continue derrière.
export function pauseMenu(app, { online, quitLabel, onResume, onQuit }) {
  const el = h('div', { class: 'screen pause' });
  const main = () => el.replaceChildren(panel('Pause',
    online ? h('p', { class: 'hint' }, 'Attention : en ligne, le combat continue !') : null,
    h('div', { class: 'col' },
      button('Reprendre', onResume),
      button('Options', () => el.replaceChildren(optionsPanel(main))),
      button('Contrôles', () => el.replaceChildren(controlsPanel(main))),
      button(online ? 'Quitter le match' : quitLabel || 'Quitter', onQuit, 'back'),
    ),
  ));
  main();
  return overlay(el);
}
