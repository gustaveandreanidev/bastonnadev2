// Point d'entrée : boucle à pas fixe (60 ticks/s), scènes, flux en ligne.
import { Renderer } from './render/renderer.js';
import { HUD } from './render/hud.js';
import { drawLogo } from './render/logo.js';
import { clearParticles, spawn, PT } from './render/particles.js';
import { FX } from './game/fx.js';
import { LocalSession } from './game/local_session.js';
import { RollbackSession } from './net/rollback.js';
import { readInput, onKey } from './core/input.js';
import { options } from './core/options.js';
import { initAudio } from './audio/audio.js';
import { titleScreen, pauseMenu } from './ui/menus.js';
import { hostScreen, joinScreen, trainingSelect, botSelect } from './ui/rooms.js';
import { BOT_LEVELS } from './game/bot.js';
import { WEAPON_IDS } from './config.js';
import { lobbyScreen, makeLobbyState } from './ui/lobby.js';
import { endScreen } from './ui/end.js';
import { clearUI, toast, hideToast } from './ui/dom.js';
import { PAL } from './render/palette.js';
import { rand, pick } from './core/util.js';

const STEP = 1000 / 60;
const canvas = document.getElementById('game');
const stage = document.getElementById('stage');
const renderer = new Renderer(canvas);
const hud = new HUD();
const fx = new FX(renderer);

const app = {
  scene: 'title',        // 'title' | 'menu' | 'game' | 'end'
  mode: null,            // 'training' | 'online'
  session: null,
  net: null,
  lob: null,
  names: ['Joueur 1', 'Joueur 2'],
  li: 0,
  closePause: null,
  lastWeapon: 'rapier',
  endUI: null,
  rematch: { me: false, them: false },

  setScene(s) { this.scene = s; },

  goTitle(message) {
    this.stopSession();
    if (this.net) { this.net.onClose = null; this.net.destroy(); this.net = null; }
    if (this.lob && this.lob.cdTimer) clearInterval(this.lob.cdTimer);
    this.lob = null;
    renderer.localIndex = 0;
    titleScreen(this);
    if (message) toast(message, 4500, 'big');
  },

  openHost() { hostScreen(this); },
  openJoin() { joinScreen(this); },
  openTrainingSelect() { trainingSelect(this); },
  openBotSelect() { botSelect(this); },

  stopSession() {
    if (this.closePause) { this.closePause(); this.closePause = null; }
    this.session = null;
    this.mode = null;
    this.endUI = null;
    renderer.showHitboxes = false;
    fx.reset();
    fx.hooks = {};
  },

  // --- entraînement ---------------------------------------------------------
  startTraining(weapon) {
    this.stopSession();
    this.lastWeapon = weapon;
    clearUI(); hideToast();
    clearParticles();
    renderer.resetAnims(); hud.reset();
    this.names = [options.name || 'Joueur 1', 'Mannequin'];
    this.li = 0; renderer.localIndex = 0;
    this.mode = 'training';
    this.session = new LocalSession({ weapons: [weapon, 'rapier'], training: true, onEvents: (f, ev, r) => fx.onEvents(f, ev, r) });
    this.scene = 'game';
  },

  // --- contre un bot ------------------------------------------------------------
  startBot(cfg) {
    this.stopSession();
    this.botCfg = cfg;
    this.lastWeapon = cfg.weapon;
    clearUI(); hideToast();
    clearParticles();
    renderer.resetAnims(); hud.reset();
    const botWeapon = cfg.botWeapon === 'random' ? WEAPON_IDS[Math.floor(Math.random() * WEAPON_IDS.length)] : cfg.botWeapon;
    this.names = [options.name || 'Joueur 1', `Bot (${BOT_LEVELS[cfg.level].label})`];
    this.li = 0; renderer.localIndex = 0;
    this.mode = 'bot';
    this.session = new LocalSession({
      weapons: [cfg.weapon, botWeapon], botLevel: cfg.level,
      onEvents: (f, ev, r) => fx.onEvents(f, ev, r),
    });
    fx.hooks.matchEnd = () => setTimeout(() => this.showEnd(), 2200);
    this.scene = 'game';
  },

  // --- en ligne -------------------------------------------------------------
  enterLobby(net, li, code) {
    this.net = net;
    this.li = li;
    net.onClose = () => this.goTitle('Ton adversaire s\'est déconnecté.');
    net.on('leave', () => this.goTitle('Ton adversaire a quitté le salon.'));
    this.lob = makeLobbyState(net, li, code, this.lob);
    lobbyScreen(this, this.lob);
  },

  leaveOnline() {
    if (this.net) this.net.send({ t: 'leave' });
    setTimeout(() => this.goTitle(), 60);
  },

  startOnline({ net, li, seed, weapons, names }) {
    this.stopSession();
    clearUI(); hideToast();
    clearParticles();
    renderer.resetAnims(); hud.reset();
    this.names = names; this.li = li; renderer.localIndex = li;
    this.mode = 'online';
    this.rematch = { me: false, them: false };
    const session = new RollbackSession({
      localIndex: li, seed, weapons, inputDelay: options.inputDelay,
      send: (m) => net.send(m),
      onEvents: (f, ev, r) => fx.onEvents(f, ev, r),
      onDesync: (f) => toast(`Désynchronisation détectée (frame ${f}) : la partie peut diverger.`, 6000, 'big'),
    });
    net.on('in', (m) => session.onMessage(m));
    net.on('ck', (m) => session.onMessage(m));
    net.on('rematch', () => { this.rematch.them = true; this.checkRematch(); });
    fx.hooks.matchEnd = () => setTimeout(() => this.showEnd(), 2200);
    this.session = session;
    this.scene = 'game';
  },

  showEnd() {
    if (!this.session || this.scene === 'end' || this.session.state.phase !== 'end') return;
    if (this.closePause) { this.closePause(); this.closePause = null; }
    this.scene = 'end';
    const online = this.mode === 'online';
    if (this.mode === 'bot') {
      this.endUI = endScreen(this, {
        state: this.session.state, names: this.names, li: this.li, online: false,
        rematchLabel: 'Rejouer',
        onRematch: () => this.startBot(this.botCfg),
        onChange: () => this.openBotSelect(),
        onMenu: () => this.goTitle(),
      });
      return;
    }
    this.endUI = endScreen(this, {
      state: this.session.state, names: this.names, li: this.li, online,
      onRematch: () => {
        this.rematch.me = true;
        this.net.send({ t: 'rematch' });
        this.endUI.setStatus(this.rematch.them ? '' : 'En attente de l\'adversaire…');
        this.checkRematch();
      },
      onMenu: () => this.leaveOnline(),
    });
    if (this.rematch.them) this.endUI.setStatus('Ton adversaire veut une revanche !');
  },

  checkRematch() {
    if (this.endUI && this.rematch.them && !this.rematch.me) this.endUI.setStatus('Ton adversaire veut une revanche !');
    if (!(this.rematch.me && this.rematch.them)) return;
    const net = this.net, li = this.li, code = this.lob.code;
    this.stopSession();
    for (const t of ['in', 'ck', 'rematch']) net.off(t);
    this.enterLobby(net, li, code);
  },

  // --- pause ----------------------------------------------------------------
  togglePause() {
    if (this.scene !== 'game' || !this.session) return;
    if (this.closePause) { this.resume(); return; }
    const online = this.mode === 'online';
    if (!online) this.session.paused = true;
    this.closePause = pauseMenu(this, {
      online, quitLabel: { training: 'Quitter l\'entraînement', bot: 'Abandonner le match' }[this.mode],
      onResume: () => this.resume(),
      onQuit: () => (online ? this.leaveOnline() : this.goTitle()),
    });
  },

  resume() {
    if (this.closePause) { this.closePause(); this.closePause = null; }
    if (this.session) this.session.paused = false;
  },
};

// --- clavier global -----------------------------------------------------------
onKey((e) => {
  initAudio();
  if (e.repeat) return;
  if (e.key === 'Escape') {
    if (app.scene === 'game') app.togglePause();
    return;
  }
  const typing = e.target && (e.target.tagName === 'INPUT');
  if (typing) return;
  if (app.mode === 'training' && app.scene === 'game' && !app.closePause) {
    const k = e.key.toLowerCase();
    if (k === 'r') { app.session.reset(); clearParticles(); hud.reset(); }
    if (k === 'h') renderer.showHitboxes = !renderer.showHitboxes;
  }
});
window.addEventListener('pointerdown', () => initAudio(), { once: false });

// --- mise à l'échelle -----------------------------------------------------------
function fit() {
  const w = window.innerWidth, hgt = window.innerHeight;
  const s = Math.min(w / 1280, hgt / 720);
  stage.style.transform = `translate(${(w - 1280 * s) / 2}px, ${(hgt - 720 * s) / 2}px) scale(${s})`;
  renderer.setScale(s);
}
window.addEventListener('resize', fit);
fit();

// --- boucle principale -----------------------------------------------------------
let last = performance.now(), acc = 0;
let fpsT = 0, fpsN = 0, fps = 60;

function loop(now) {
  let dt = now - last;
  last = now;
  if (dt > 250) dt = 250;
  fpsT += dt; fpsN++;
  if (fpsT >= 500) { fps = (fpsN * 1000) / fpsT; fpsT = 0; fpsN = 0; }

  const s = app.session;
  if (s && !app.debugFreeze) {
    if (app.mode === 'online' && app.net && app.net.ping != null) s.rttFrames = app.net.ping / STEP;
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 8) {
      const bits = app.closePause || app.scene !== 'game' ? 0 : readInput();
      s.tick(bits);
      acc -= STEP; n++;
    }
    if (n >= 8) acc = 0;
  } else acc = 0;

  if (app.debugFreeze) { requestAnimationFrame(loop); return; }
  const sec = dt / 1000;
  const state = s ? s.state : null;
  fx.update(sec, state);
  if (app.scene === 'end' && Math.random() < sec * 60) {
    spawn(PT.CONFETTI, rand(0, 1280), -10, rand(-40, 40), rand(60, 160), 5, rand(4, 7),
      pick([PAL.gold, PAL.goldLight, PAL.players[0].main, PAL.players[1].main, '#fff']), 60, 0.4, rand(0, 6), rand(-8, 8));
  }
  renderer.draw(sec, state, s ? s.prevState : null, s ? Math.min(1, acc / STEP) : 0);
  if (s && app.scene === 'game') {
    hud.draw(renderer.ctx, renderer.base, state, {
      names: app.names,
      ping: app.mode === 'online' && app.net ? app.net.ping : null,
      showPing: options.showPing, showFps: options.showFps, fps,
      rollbacks: app.mode === 'online' ? s.stats.rollbacks : null,
      hitboxes: renderer.showHitboxes,
    }, sec);
  } else if (app.scene === 'title') {
    drawLogo(renderer.ctx, renderer.base, renderer.time);
  }
  if (!s && options.showFps) {
    const ctx = renderer.ctx;
    ctx.setTransform(renderer.base, 0, 0, renderer.base, 0, 0);
    ctx.font = '15px serif'; ctx.fillStyle = '#ecd9b0';
    ctx.fillText(`${Math.round(fps)} FPS`, 18, 700);
  }
  requestAnimationFrame(loop);
}

function boot() {
  titleScreen(app);
  requestAnimationFrame(loop);
}

// Attendre les polices pour que le canvas les utilise
Promise.race([
  Promise.all([document.fonts.load("40px 'MedievalSharp'"), document.fonts.load("20px 'Alegreya SC'")]),
  new Promise((r) => setTimeout(r, 1500)),
]).finally(boot);

// Débogage : avance la simulation de n ticks (utile quand l'onglet est masqué)
app.debugStep = (n, bits = 0) => {
  for (let k = 0; k < n; k++) {
    if (app.session) app.session.tick(typeof bits === 'function' ? bits(k) : bits);
    fx.update(1 / 60, app.session ? app.session.state : null);
    renderer.draw(1 / 60, app.session ? app.session.state : null, app.session ? app.session.prevState : null, 1);
  }
  if (app.session && app.scene === 'game') {
    hud.draw(renderer.ctx, renderer.base, app.session.state, { names: app.names, showPing: false, showFps: false, hitboxes: renderer.showHitboxes }, 1 / 60);
  }
};
app.renderer = renderer; app.fx = fx;
window.bastonnade = app;
