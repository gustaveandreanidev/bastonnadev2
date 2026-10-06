// Test hors navigateur : deux sessions rollback reliées par un faux réseau
// avec latence et gigue. Vérifie qu'aucune désynchronisation n'apparaît.
// Lancer : node tests/rollback_test.js
import { RollbackSession } from '../js/net/rollback.js';
import { createState, hashState } from '../js/sim/state.js';
import { step } from '../js/sim/sim.js';

let seedR = 12345;
const rand = () => ((seedR = (seedR * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

function bot() {
  let cur = 0, left = 0;
  return () => {
    if (--left <= 0) {
      left = 2 + Math.floor(rand() * 20);
      cur = 0;
      const r = rand();
      if (r < 0.4) cur |= rand() < 0.5 ? 1 : 2;
      if (rand() < 0.2) cur |= 4;
      if (rand() < 0.1) cur |= 8;
      if (rand() < 0.3) cur |= 16;
      if (rand() < 0.2) cur |= 32;
      if (rand() < 0.08) cur |= 64;
    }
    return cur;
  };
}

function run({ latency, jitter, ticks, weapons }) {
  const queue = [];
  let now = 0;
  const sessions = [];
  const mk = (i) => new RollbackSession({
    localIndex: i, seed: 777, weapons, inputDelay: 2,
    send: (m) => queue.push({ at: now + latency + rand() * jitter, to: 1 - i, m: JSON.parse(JSON.stringify(m)) }),
    onDesync: (f) => { throw new Error(`DESYNC frame ${f}`); },
  });
  sessions.push(mk(0), mk(1));
  const bots = [bot(), bot()];
  const step_ms = 1000 / 60;
  const offset = [0, 7 * step_ms]; // le joueur 2 démarre 7 frames plus tard
  const next = [offset[0], offset[1]];
  let compared = 0;
  const origCompare = sessions[0].compare.bind(sessions[0]);
  sessions[0].compare = (f) => { if (sessions[0].myHashes.has(f) && sessions[0].theirHashes.has(f)) compared++; origCompare(f); };
  const end = ticks * step_ms;
  while (now < end) {
    now += 1;
    queue.sort((a, b) => a.at - b.at);
    while (queue.length && queue[0].at <= now) { const q = queue.shift(); sessions[q.to].onMessage(q.m); }
    for (let i = 0; i < 2; i++) {
      while (next[i] <= now) {
        sessions[i].rttFrames = (2 * latency) / step_ms;
        sessions[i].tick(bots[i]());
        next[i] += step_ms * (i === 1 ? 1.002 : 1);
      }
    }
  }
  const s0 = sessions[0], s1 = sessions[1];
  return { compared, f0: s0.frame, f1: s1.frame, st0: s0.stats, st1: s1.stats, phase: s0.state.phase, score: s0.state.f.map((f) => f.score) };
}

// 1) déterminisme pur
{
  const a = createState({ seed: 5, weapons: ['axe', 'spear'] });
  const b = createState({ seed: 5, weapons: ['axe', 'spear'] });
  const ba = bot(), bb = bot();
  const inputs = [];
  for (let i = 0; i < 4000; i++) inputs.push([ba(), bb()]);
  for (const inp of inputs) { step(a, inp, []); }
  for (const inp of inputs) { step(b, inp, []); }
  if (hashState(a) !== hashState(b)) throw new Error('simulation non déterministe');
  console.log('déterminisme OK, phase', a.phase, 'score', a.f.map((f) => f.score), 'murs', a.props.walls.map((w) => w.hp));
}

// 2) rollback avec différentes latences
for (const cfg of [
  { latency: 20, jitter: 10, ticks: 5000, weapons: ['rapier', 'axe'] },
  { latency: 60, jitter: 30, ticks: 5000, weapons: ['spear', 'rapier'] },
  { latency: 110, jitter: 40, ticks: 5000, weapons: ['axe', 'axe'] },
]) {
  const r = run(cfg);
  console.log(`latence ${cfg.latency}ms : OK`, JSON.stringify(r));
  if (r.compared < 50) throw new Error('trop peu de checksums comparés');
}
console.log('Tous les tests sont passés.');
