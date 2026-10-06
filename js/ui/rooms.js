// Créer / rejoindre un salon, choix d'arme de l'entraînement.
import { h, button, show, screen, panel, compactPanel } from './dom.js';
import { Net, makeCode, normalizeCode } from '../net/peer.js';
import { WEAPON_IDS, WEAPONS } from '../config.js';
import { BOT_LEVELS } from '../game/bot.js';
import { sfxPlay } from '../audio/audio.js';
import { weaponCard } from './weapon_card.js';
import { FighterPreview } from './preview.js';
import { PAL } from '../render/palette.js';

export function hostScreen(app) {
  let cancelled = false;
  let net = null;
  const status = h('p', { class: 'status' }, 'Ouverture du salon…');
  const codeBox = h('div', { class: 'code' }, '·····');
  const copyBtn = button('Copier', () => {
    const code = codeBox.textContent;
    const done = () => { copyBtn.textContent = 'Copié !'; setTimeout(() => { copyBtn.textContent = 'Copier'; }, 1500); };
    try { navigator.clipboard.writeText(code).then(done, () => selectCode()); } catch { selectCode(); }
  }, 'small');
  const selectCode = () => { const r = document.createRange(); r.selectNodeContents(codeBox); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
  copyBtn.disabled = true;
  const waiting = h('div', { class: 'waiting' }, h('span', { class: 'spinner' }), h('span', {}, 'En attente d\'un adversaire'), h('span', { class: 'dots' }));
  waiting.style.visibility = 'hidden';

  show(screen('menu', panel('Créer un salon',
    h('p', {}, 'Donne ce code à ton adversaire :'),
    h('div', { class: 'row center' }, codeBox, copyBtn),
    waiting, status,
    h('div', { class: 'row' }, button('Annuler', () => { cancelled = true; if (net) net.destroy(); app.goTitle(); }, 'back')),
  )));
  app.setScene('menu');

  (async () => {
    for (let attempt = 0; attempt < 5 && !cancelled; attempt++) {
      const code = makeCode(5);
      try {
        net = await Net.host(code);
        if (cancelled) { net.destroy(); return; }
        codeBox.textContent = code;
        copyBtn.disabled = false;
        status.textContent = '';
        waiting.style.visibility = 'visible';
        net.onGuest = () => { if (!cancelled) app.enterLobby(net, 0, code); };
        return;
      } catch (e) {
        if (e.type === 'unavailable-id') continue;
        status.textContent = e.message;
        status.classList.add('error');
        return;
      }
    }
  })();
}

export function joinScreen(app) {
  let busy = false;
  const input = h('input', {
    class: 'codein', maxLength: 6, placeholder: 'CODE', autofocus: true, spellcheck: false, autocomplete: 'off',
    oninput: (e) => { e.target.value = normalizeCode(e.target.value); },
    onkeydown: (e) => { if (e.key === 'Enter') go(); },
  });
  const status = h('p', { class: 'status' });
  const goBtn = button('Rejoindre', () => go());
  async function go() {
    if (busy) return;
    const code = normalizeCode(input.value);
    if (code.length < 4) { status.textContent = 'Le code fait entre 4 et 6 caractères.'; status.className = 'status error'; return; }
    busy = true; goBtn.disabled = true;
    status.className = 'status'; status.textContent = 'Connexion…';
    try {
      const net = await Net.join(code);
      app.enterLobby(net, 1, code);
    } catch (e) {
      status.textContent = e.message; status.className = 'status error';
      busy = false; goBtn.disabled = false;
    }
  }
  show(screen('menu', panel('Rejoindre un salon',
    h('p', {}, 'Tape le code donné par ton adversaire :'),
    h('div', { class: 'row center' }, input, goBtn),
    status,
    h('div', { class: 'row' }, button('Retour', () => app.goTitle(), 'back')),
  )));
  app.setScene('menu');
}

export function trainingSelect(app) {
  let weapon = app.lastWeapon || 'rapier';
  const cv = h('canvas', { width: 520, height: 400, class: 'preview big' });
  const preview = new FighterPreview(cv, 0, weapon, { sound: false });
  const cards = h('div', { class: 'cards grid' });
  const render = () => cards.replaceChildren(...WEAPON_IDS.map((id) => weaponCard(id, {
    selected: id === weapon, color: PAL.players[0].main,
    onPick: (w) => { weapon = w; preview.setWeapon(w); render(); },
  })));
  render();
  show(screen('menu', compactPanel('Entraînement',
    h('p', {}, 'Choisis ton arme, puis frappe le mannequin à volonté.'),
    h('div', { class: 'row top' }, h('div', { class: 'previewbox' }, cv), cards),
    h('div', { class: 'row' },
      button('Retour', () => app.goTitle(), 'back'),
      button('Commencer', () => app.startTraining(weapon), 'primary'),
    ),
  )));
  app.setScene('menu');
}

export function botSelect(app) {
  const cfg = { weapon: app.lastWeapon || 'rapier', botWeapon: 'random', level: 'normal', ...(app.botCfg || {}) };
  const cv = h('canvas', { width: 520, height: 400, class: 'preview big' });
  const preview = new FighterPreview(cv, 0, cfg.weapon, { sound: false });
  const cards = h('div', { class: 'cards grid' });
  const renderCards = () => cards.replaceChildren(...WEAPON_IDS.map((id) => weaponCard(id, {
    selected: id === cfg.weapon, color: PAL.players[0].main,
    onPick: (w) => { cfg.weapon = w; preview.setWeapon(w); renderCards(); },
  })));
  const chips = h('div', { class: 'seg chips' });
  const renderChips = () => chips.replaceChildren(...[...WEAPON_IDS, 'random'].map((id) => h('button', {
    class: `segb ${cfg.botWeapon === id ? 'on' : ''}`,
    onclick: () => { cfg.botWeapon = id; sfxPlay.ui('click'); renderChips(); },
  }, id === 'random' ? 'Au hasard' : WEAPONS[id].name)));
  const levels = h('div', { class: 'seg' });
  const renderLevels = () => levels.replaceChildren(...Object.entries(BOT_LEVELS).map(([id, l]) => h('button', {
    class: `segb ${cfg.level === id ? 'on' : ''}`,
    onclick: () => { cfg.level = id; sfxPlay.ui('click'); renderLevels(); },
  }, l.label)));
  renderCards(); renderChips(); renderLevels();
  show(screen('menu', compactPanel('Contre un bot',
    h('div', { class: 'row top' },
      h('div', { class: 'col narrow' }, h('h3', {}, 'Ton arme'), h('div', { class: 'previewbox' }, cv)),
      cards),
    h('div', { class: 'opts wide' },
      h('div', { class: 'opt' }, h('span', { class: 'olabel' }, 'Arme du bot'), chips),
      h('div', { class: 'opt' }, h('span', { class: 'olabel' }, 'Difficulté'), levels)),
    h('div', { class: 'row' },
      button('Retour', () => app.goTitle(), 'back'),
      button('Combattre !', () => app.startBot(cfg), 'primary'),
    ),
  )));
  app.setScene('menu');
}
