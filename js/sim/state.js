// État simulé : un objet JSON pur, uniquement des entiers et des chaînes.
// Il est copié pour le rollback et haché pour détecter les désynchros.
import { SPAWNS, BARRELS, MUGS, PARTITIONS } from './map.js';
import { WU, R, PR } from './tuning.js';
import { px } from './units.js';

export function makeFighter(i, weapon, dummy = false) {
  const f = {
    i, wpn: weapon, dummy: dummy ? 1 : 0,
    x: 0, y: 0, vx: 0, vy: 0, face: 1,
    st: 'free', t: 0, gr: 1, plat: -1,
    jumps: 1, adodge: 1, dcd: 0, ddx: 0, ddy: 0,
    hp: R.maxHp, since: 9999,
    hs: 0, stop: 0, lag: 0,
    prev: 0, bufA: 0, bufT: 0, tapDir: 0, tapT: -99, run: 0, crouch: 0, drop: 0, ff: 0,
    atk: null, djT: -99,
    score: 0, dmgOut: 0, hits: 0, best: 0, combo: 0, lastDmg: 0,
  };
  spawnFighter(f);
  return f;
}

export function spawnFighter(f) {
  const sp = SPAWNS[f.i];
  f.x = px(sp.x); f.y = WU.floor; f.vx = 0; f.vy = 0; f.face = sp.facing;
  f.st = 'free'; f.t = 0; f.gr = 1; f.plat = -1;
  f.jumps = 1; f.adodge = 1; f.dcd = 0;
  f.hp = R.maxHp; f.since = 9999; f.hs = 0; f.stop = 0; f.lag = 0;
  f.bufA = 0; f.bufT = 0; f.run = 0; f.crouch = 0; f.drop = 0; f.atk = null;
  f.combo = 0;
}

export function makeProps() {
  return {
    walls: PARTITIONS.map((p, id) => ({ id, hp: PR.partHp })),
    barrels: BARRELS.map((b, id) => ({
      id, x: px(b.x), y: WU.floor, vx: 0, vy: 0, st: 0, owner: -1, rot: 0, gr: 1,
    })),
    mugs: MUGS.map((m, id) => ({
      id, x: px(m.x), y: px(m.y), vx: 0, vy: 0, st: 0, owner: -1, rot: 0,
    })),
  };
}

export function createState({ seed, weapons, training = false }) {
  return {
    tick: 0,
    phase: training ? 'fight' : 'countdown',
    pt: 0, final: 0, winner: -1, round: 1,
    training: training ? 1 : 0,
    rng: seed | 0,
    f: [makeFighter(0, weapons[0]), makeFighter(1, weapons[1], training)],
    props: makeProps(),
  };
}

export function resetRound(s) {
  for (const f of s.f) spawnFighter(f);
  // Les tonneaux encore en mouvement s'immobilisent ; les dégâts restent.
  for (const b of s.props.barrels) if (b.st === 1) { b.vx = 0; b.st = 3; b.owner = -1; }
  s.phase = 'countdown'; s.pt = 0; s.round++;
}

export const cloneState = (s) => structuredClone(s);

// FNV-1a 32 bits sur la sérialisation JSON (ordre des clés stable)
export function hashState(s) {
  const str = JSON.stringify(s);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
