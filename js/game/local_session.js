// Session locale (entraînement ou contre un bot) : pas de réseau, pas de rollback.
import { createState, cloneState } from '../sim/state.js';
import { step, resetTraining } from '../sim/sim.js';
import { Bot } from './bot.js';

export class LocalSession {
  constructor({ weapons, training = false, botLevel = null, onEvents }) {
    this.state = createState({ seed: (Math.random() * 2 ** 31) | 0, weapons, training });
    this.prevState = cloneState(this.state);
    this.frame = 0;
    this.onEvents = onEvents || (() => {});
    this.bot = botLevel ? new Bot(1, botLevel) : null;
    this.paused = false;
  }

  tick(bits) {
    if (this.paused) return false;
    this.prevState = cloneState(this.state);
    const ev = [];
    step(this.state, [bits, this.bot ? this.bot.input(this.state) : 0], ev);
    this.onEvents(this.frame, ev, false);
    this.frame++;
    return true;
  }

  reset() {
    resetTraining(this.state);
    this.prevState = cloneState(this.state);
  }
}
