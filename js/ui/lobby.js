// Lobby : pseudos, choix d'arme en direct, Prêt, compte à rebours.
import { h, button, show, screen } from './dom.js';
import { WEAPONS, WEAPON_IDS } from '../config.js';
import { weaponCard } from './weapon_card.js';
import { FighterPreview } from './preview.js';
import { PAL } from '../render/palette.js';
import { options, setOption } from '../core/options.js';
import { sfxPlay } from '../audio/audio.js';

export function lobbyScreen(app, lob) {
  const { net, li } = lob;
  const ri = 1 - li;
  let countdown = null;
  const me = lob.me, them = lob.them;

  const sync = (hello = 0) => net.send({ t: 'lobby', name: me.name, wpn: me.wpn, ready: me.ready, hello });

  // --- colonnes joueurs ---
  const prevs = [];
  const playerCol = (idx) => {
    const isMe = idx === li;
    const p = isMe ? me : them;
    const cv = h('canvas', { width: 300, height: 260, class: 'preview' });
    prevs[idx] = new FighterPreview(cv, idx, p.wpn, { sound: false });
    const name = isMe
      ? h('input', {
        class: 'namein', maxLength: 16, value: me.name, spellcheck: false,
        oninput: (e) => { me.name = e.target.value.trim() || `Joueur ${li + 1}`; setOption('name', e.target.value.trim()); sync(); },
      })
      : h('div', { class: 'namelabel' }, them.name);
    const wname = h('div', { class: 'pwpn' }, WEAPONS[p.wpn].name);
    const ready = h('div', { class: `badge ${p.ready ? 'ready' : ''}` }, p.ready ? 'Prêt !' : 'Pas prêt');
    const col = h('div', { class: `pcol p${idx}` },
      h('div', { class: 'ptag' }, isMe ? 'Toi' : 'Adversaire'),
      h('div', { class: 'previewbox' }, cv), name, wname, ready);
    col.update = () => {
      if (!isMe) name.textContent = them.name;
      wname.textContent = WEAPONS[p.wpn].name;
      ready.className = `badge ${p.ready ? 'ready' : ''}`;
      ready.textContent = p.ready ? 'Prêt !' : 'Pas prêt';
    };
    return col;
  };
  const cols = [playerCol(0), playerCol(1)];

  // --- cartes d'armes ---
  const cards = h('div', { class: 'cards grid' });
  const renderCards = () => cards.replaceChildren(...WEAPON_IDS.map((id) => weaponCard(id, {
    selected: id === me.wpn, color: PAL.players[li].main,
    onPick: (w) => {
      if (countdown) return;
      if (w === me.wpn) return;
      me.wpn = w; me.ready = false;
      prevs[li].setWeapon(w);
      renderCards(); refresh(); sync();
    },
  })));
  renderCards();

  const readyBtn = button('Prêt', () => {
    if (countdown) return;
    me.ready = !me.ready;
    refresh(); sync(); maybeStart();
  }, 'primary');
  const pingEl = h('span', { class: 'ping' }, 'Ping …');
  const cdEl = h('div', { class: 'countdown' });

  function refresh() {
    cols.forEach((c) => c.update());
    readyBtn.textContent = me.ready ? 'Annuler Prêt' : 'Prêt';
    readyBtn.classList.toggle('on', me.ready);
  }

  // l'hôte décide du lancement quand les deux sont prêts
  function maybeStart() {
    if (li !== 0 || countdown || !me.ready || !them.ready) return;
    const seed = (Math.random() * 2 ** 31) | 0;
    net.send({ t: 'start', seed });
    beginCountdown(seed);
  }

  function beginCountdown(seed) {
    let n = 3;
    countdown = true;
    readyBtn.disabled = true;
    cdEl.textContent = n; cdEl.classList.add('show');
    sfxPlay.count(n);
    const timer = setInterval(() => {
      n--;
      if (n > 0) { cdEl.textContent = n; sfxPlay.count(n); return; }
      clearInterval(timer);
      const weapons = li === 0 ? [me.wpn, them.wpn] : [them.wpn, me.wpn];
      const names = li === 0 ? [me.name, them.name] : [them.name, me.name];
      app.startOnline({ net, li, seed, weapons, names, lob });
    }, 1000);
    lob.cdTimer = timer;
  }

  net.on('lobby', (m) => {
    them.name = String(m.name || `Joueur ${ri + 1}`).slice(0, 16);
    if (WEAPONS[m.wpn] && m.wpn !== them.wpn) { them.wpn = m.wpn; prevs[ri].setWeapon(m.wpn); }
    them.ready = !!m.ready;
    if (m.hello) sync();
    refresh(); maybeStart();
  });
  net.on('start', (m) => { if (!countdown) beginCountdown(m.seed | 0); });

  const pingTimer = setInterval(() => {
    if (!pingEl.isConnected) { clearInterval(pingTimer); return; }
    pingEl.textContent = net.ping == null ? 'Ping …' : `Ping ${Math.round(net.ping)} ms`;
  }, 400);

  show(screen('lobby',
    h('div', { class: 'lobbyhead' },
      h('h2', {}, `Salon ${lob.code}`), pingEl),
    h('div', { class: 'lobbybody' },
      cols[0],
      h('div', { class: 'lobbymid' },
        h('p', { class: 'hint' }, 'Choisis ton arme. Ton adversaire voit ton choix en direct.'),
        cards,
        h('div', { class: 'row' },
          button('Quitter le salon', () => app.leaveOnline(), 'back'),
          readyBtn),
      ),
      cols[1],
    ),
    cdEl,
  ));
  app.setScene('menu');
  refresh();
  sync(1);
}

export function makeLobbyState(net, li, code, prev) {
  const defName = `Joueur ${li + 1}`;
  return {
    net, li, code,
    me: { name: (prev && prev.me.name) || options.name || defName, wpn: (prev && prev.me.wpn) || 'rapier', ready: false },
    them: { name: (prev && prev.them.name) || `Joueur ${2 - li}`, wpn: (prev && prev.them.wpn) || 'rapier', ready: false },
  };
}
