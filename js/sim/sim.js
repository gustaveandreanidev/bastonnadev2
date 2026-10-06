// Un tick de simulation. step(state, [input0, input1], events)
// Fonction pure vis-à-vis de l'extérieur : seul l'état est modifié,
// les événements (sons, particules) sont empilés dans `ev`.
import { R } from './tuning.js';
import { px } from './units.js';
import { controlFighter, physicsFighter, separate } from './fighter.js';
import { resolveCombat } from './combat.js';
import { updateProps } from './props.js';
import { resetRound, makeProps, spawnFighter } from './state.js';

const ZERO = [0, 0];

export function step(s, inputs, ev) {
  s.tick++;
  s.pt++;
  let inp = inputs;
  let simulate = true;

  if (s.phase === 'countdown') {
    inp = ZERO;
    const b = R.beat;
    if (s.pt === 1) ev.push({ type: 'count', n: 3 });
    else if (s.pt === 1 + b) ev.push({ type: 'count', n: 2 });
    else if (s.pt === 1 + 2 * b) ev.push({ type: 'count', n: 1 });
    else if (s.pt === 1 + 3 * b) { s.phase = 'fight'; s.pt = 0; ev.push({ type: 'go' }); }
  } else if (s.phase === 'ko') {
    inp = ZERO;
    // Ralenti dramatique (identique chez les deux joueurs)
    if (s.final) simulate = s.pt > 120 || s.pt % 3 === 0;
    else simulate = s.pt > 24 || s.pt % 2 === 0;
    const dur = s.final ? R.finalKoPause : R.koPause;
    if (s.pt >= dur) {
      if (s.final) {
        s.phase = 'end'; s.pt = 0;
        const w = s.f[s.winner];
        w.st = 'victory'; w.t = 0; w.atk = null;
        ev.push({ type: 'matchEnd', winner: s.winner });
      } else {
        resetRound(s);
        ev.push({ type: 'round', round: s.round });
      }
      return;
    }
  } else if (s.phase === 'end') {
    inp = ZERO;
  }
  if (!simulate) return;

  const f0 = s.f[0], f1 = s.f[1];
  const m0 = controlFighter(s, f0, f0.dummy ? 0 : inp[0], ev);
  const m1 = controlFighter(s, f1, f1.dummy ? 0 : inp[1], ev);
  if (m0) physicsFighter(s, f0, ev);
  if (m1) physicsFighter(s, f1, ev);
  separate(s);
  resolveCombat(s, ev);
  updateProps(s, ev);

  for (const f of s.f) {
    if (f.since < 99999) f.since++;
    const delay = f.dummy ? R.tRegenDelay : R.regenDelay;
    const rate = f.dummy ? R.tRegenRate : R.regenRate;
    if (s.phase === 'fight' && f.st !== 'ko' && f.since >= delay && f.hp < R.maxHp) {
      f.hp = Math.min(R.maxHp, f.hp + rate);
    }
  }

  if (s.phase === 'fight' && !s.training) checkKO(s, ev);
}

function checkKO(s, ev) {
  const dead = s.f.filter((f) => f.hp <= 0);
  if (!dead.length) return;
  s.phase = 'ko'; s.pt = 0;
  for (const d of dead) {
    d.st = 'ko'; d.t = 0; d.atk = null; d.gr = 0; d.plat = -1;
    d.vx = Math.trunc((d.vx * 3) / 2);
    d.vy = Math.min(Math.trunc((d.vy * 3) / 2), -px(9));
  }
  if (dead.length === 1) {
    const w = s.f[1 - dead[0].i];
    w.score++;
    if (w.score >= R.koToWin) { s.final = 1; s.winner = w.i; }
  }
  for (const d of dead) {
    ev.push({ type: 'ko', i: d.i, final: s.final, x: d.x, y: d.y - px(52), double: dead.length > 1 ? 1 : 0 });
  }
}

// Entraînement : remise à neuf de la taverne et des positions (touche R)
export function resetTraining(s) {
  s.props = makeProps();
  for (const f of s.f) { spawnFighter(f); f.combo = 0; f.lastDmg = 0; }
}
