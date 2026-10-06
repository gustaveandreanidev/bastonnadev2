// Rollback netcode (style GGPO) indépendant du transport.
// - chaque client simule immédiatement avec ses entrées locales (+ input delay)
// - l'entrée adverse inconnue est prédite (répétition de la dernière connue)
// - à l'arrivée de la vraie entrée : retour à l'état sauvegardé et re-simulation
import { createState, cloneState, hashState } from '../sim/state.js';
import { step } from '../sim/sim.js';

const RING = 64;          // snapshots conservés
const MAX_PRED = 8;       // fenêtre de prédiction (frames)
const CHECK_EVERY = 30;   // checksum toutes les 30 frames confirmées

export class RollbackSession {
  constructor({ localIndex, seed, weapons, inputDelay = 2, send, onEvents, onDesync }) {
    this.li = localIndex;
    this.state = createState({ seed, weapons });
    this.prevState = this.state;
    this.frame = 0;
    this.delay = Math.max(0, inputDelay | 0);
    this.send = send;
    this.onEvents = onEvents || (() => {});
    this.onDesync = onDesync || (() => {});
    this.local = [];
    this.remote = [];
    this.used = [];
    for (let f = 0; f < this.delay; f++) this.local[f] = 0;
    this.lastRemote = -1;
    this.remoteAck = -1;
    this.remoteFrame = 0;
    this.snap = new Array(RING);
    this.rollTo = -1;
    this.myHashes = new Map();
    this.theirHashes = new Map();
    this.checkedUpTo = -1;
    this.rttFrames = 0;
    this.skipCooldown = 0;
    this.desynced = false;
    this.stats = { rollbacks: 0, resimFrames: 0, stalls: 0 };
  }

  // Appelée une fois par tick (60/s) avec les entrées locales du moment
  tick(bits) {
    const lf = this.frame + this.delay;
    if (this.local[lf] === undefined) this.local[lf] = bits;
    this.sendInputs();
    this.doRollback();
    if (this.frame - this.lastRemote > MAX_PRED) { this.stats.stalls++; return false; }
    if (this.skipCooldown > 0) this.skipCooldown--;
    else if (this.aheadOfRemote()) { this.skipCooldown = 6; this.stats.stalls++; return false; }
    this.advance(false);
    this.checksums();
    return true;
  }

  inputsFor(f) {
    const l = this.local[f] | 0;
    let r = this.remote[f];
    if (r === undefined) r = this.lastRemote >= 0 ? this.remote[this.lastRemote] : 0;
    this.used[f] = r;
    return this.li === 0 ? [l, r] : [r, l];
  }

  advance(resim) {
    const f = this.frame;
    const sn = { f, s: cloneState(this.state) };
    this.snap[f % RING] = sn;
    this.prevState = sn.s;
    const ev = [];
    step(this.state, this.inputsFor(f), ev);
    this.frame++;
    this.onEvents(f, ev, resim);
  }

  doRollback() {
    if (this.rollTo < 0) return;
    const target = this.rollTo;
    this.rollTo = -1;
    if (target >= this.frame) return;
    const sn = this.snap[target % RING];
    if (!sn || sn.f !== target) { console.warn('rollback impossible', target); return; }
    this.state = cloneState(sn.s);
    const end = this.frame;
    this.frame = target;
    this.stats.rollbacks++;
    this.stats.resimFrames += end - target;
    while (this.frame < end) this.advance(true);
  }

  sendInputs() {
    const to = this.frame + this.delay;
    const from = Math.max(this.remoteAck + 1, to - 40, 0);
    const d = [];
    for (let f = from; f <= to; f++) d.push(this.local[f] | 0);
    this.send({ t: 'in', f: from, d, cf: this.frame, ack: this.lastRemote });
  }

  aheadOfRemote() {
    const est = this.remoteFrame + Math.round(this.rttFrames / 2);
    return this.frame > est + 2;
  }

  onMessage(msg) {
    if (msg.t === 'in') {
      if (msg.ack > this.remoteAck) this.remoteAck = msg.ack;
      if (msg.cf > this.remoteFrame) this.remoteFrame = msg.cf;
      for (let k = 0; k < msg.d.length; k++) {
        const f = msg.f + k;
        if (this.remote[f] !== undefined) continue;
        const v = msg.d[k];
        this.remote[f] = v;
        if (f < this.frame && this.used[f] !== v && (this.rollTo < 0 || f < this.rollTo)) this.rollTo = f;
      }
      while (this.remote[this.lastRemote + 1] !== undefined) this.lastRemote++;
    } else if (msg.t === 'ck') {
      this.theirHashes.set(msg.f, msg.h);
      this.compare(msg.f);
    }
  }

  checksums() {
    const confirmed = Math.min(this.lastRemote, this.frame - 1);
    let f = (Math.floor(this.checkedUpTo / CHECK_EVERY) + 1) * CHECK_EVERY;
    for (; f <= confirmed; f += CHECK_EVERY) {
      let st = null;
      if (f + 1 === this.frame) st = this.state;
      else {
        const sn = this.snap[(f + 1) % RING];
        if (sn && sn.f === f + 1) st = sn.s;
      }
      this.checkedUpTo = f;
      if (!st) continue;
      const h = hashState(st);
      this.myHashes.set(f, h);
      this.send({ t: 'ck', f, h });
      this.compare(f);
    }
  }

  compare(f) {
    const a = this.myHashes.get(f), b = this.theirHashes.get(f);
    if (a === undefined || b === undefined) return;
    this.myHashes.delete(f); this.theirHashes.delete(f);
    if (a !== b && !this.desynced) { this.desynced = true; this.onDesync(f); }
  }
}
