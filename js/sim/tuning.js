// Conversion de config.js en entiers (unités de simulation).
// Calculé une fois au chargement, identique chez les deux joueurs.
import { PHYS, DODGE, RULES, PROPS, WEAPONS } from '../config.js';
import { WORLD, PLATFORMS, PARTITIONS } from './map.js';
import { U, px } from './units.js';

export const P = {
  hw: px(PHYS.width / 2), h: px(PHYS.height), ch: px(PHYS.crouchHeight),
  grav: px(PHYS.gravity), maxFall: px(PHYS.maxFall), fastFall: px(PHYS.fastFall),
  walk: px(PHYS.walkSpeed), run: px(PHYS.runSpeed),
  gAcc: px(PHYS.groundAccel), gFric: px(PHYS.groundFriction),
  air: px(PHYS.airSpeed), aAcc: px(PHYS.airAccel), aFric: px(PHYS.airFriction),
  jump: px(PHYS.jumpVel), djump: px(PHYS.doubleJumpVel),
  tapWin: PHYS.doubleTapWindow, buffer: PHYS.inputBuffer,
  airLandLag: PHYS.airAttackLandLag, hsFric: px(PHYS.hitstunFriction),
  bounce: px(PHYS.wallBounceSpeed), push: px(PHYS.pushSpeed),
};

export const DG = {
  dur: DODGE.duration, dash: DODGE.dashTicks, speed: px(DODGE.speed),
  down: px(DODGE.airDownSpeed), inv0: DODGE.invulnStart, inv1: DODGE.invulnEnd,
  cd: DODGE.cooldown,
};

const maxHp = RULES.maxHp * U;
export const R = {
  maxHp, koToWin: RULES.koToWin,
  regenDelay: RULES.regenDelay, regenRate: Math.max(1, Math.round(maxHp / RULES.regenTime)),
  tRegenDelay: RULES.trainingRegenDelay,
  tRegenRate: Math.max(1, Math.round(maxHp / RULES.trainingRegenTime)),
  beat: RULES.countdownBeat, koPause: RULES.koPause, finalKoPause: RULES.finalKoPause,
  cHsDecay: RULES.comboHitstunDecay, cHsMin: RULES.comboMinHitstun,
  cKbGrow: RULES.comboKbGrowth, cKbMax: RULES.comboMaxKb,
};

const b = PROPS.barrel, m = PROPS.mug;
export const PR = {
  partHp: PROPS.partitionHp, crashSpeed: px(PROPS.crashSpeed), crashDmg: PROPS.crashDamage,
  barrel: {
    min: px(b.minSpeed), max: px(b.maxSpeed), fromKb: Math.round(b.speedFromKb * 100),
    hop: px(b.hop), fric: px(b.rollFriction), burst: px(b.burstSpeed), harm: px(b.harmSpeed),
    dmg: b.damage * U, kbx: px(b.kb[0]), kby: px(b.kb[1]), hs: b.hitstun, stop: b.hitstop,
    wallDmg: b.wallDamage, hw: px(22), h: px(54), r: px(23),
  },
  mug: {
    speed: px(m.speed), lift: px(m.lift), grav: px(m.gravity),
    dmg: m.damage * U, kbx: px(m.kb[0]), kby: px(m.kb[1]), hs: m.hitstun, stop: m.hitstop,
    r: px(9),
  },
};

export const WU = {
  floor: px(WORLD.floor), left: px(WORLD.left), right: px(WORLD.right), ceil: px(WORLD.ceil),
};
export const PLATS = PLATFORMS.map((p) => ({ x1: px(p.x1), x2: px(p.x2), y: px(p.y) }));
export const PARTS = PARTITIONS.map((p) => ({ x: px(p.x), hw: px(p.w / 2), top: px(p.top) }));

function compileAttack(a) {
  return {
    startup: a.startup, active: a.active, recovery: a.recovery,
    dmg: Math.round(a.damage * U), kbx: px(a.kb[0]), kby: px(a.kb[1]),
    hs: a.hitstun, stop: a.hitstop, prop: a.prop | 0,
    lunge: px(a.lunge || 0), cancel: !!a.cancel,
    landLag: a.landLag != null ? a.landLag : P.airLandLag,
    plunge: px(a.plunge || 0), diveX: px(a.diveX != null ? a.diveX : 2), untilLand: !!a.untilLand, spin: !!a.spin, armor: !!a.armor,
    cMax: a.charge ? a.charge.max : 0,
    cDmg: a.charge ? Math.round(a.charge.dmg * 100) : 100,
    cKb: a.charge ? Math.round(a.charge.kb * 100) : 100,
    hb: { x: px(a.hitbox.x), y: px(a.hitbox.y), w: px(a.hitbox.w), h: px(a.hitbox.h) },
  };
}

export const W = {};
for (const id of Object.keys(WEAPONS)) {
  const atk = {};
  for (const k of Object.keys(WEAPONS[id].attacks)) atk[k] = compileAttack(WEAPONS[id].attacks[k]);
  W[id] = atk;
}

export const isAirAttack = (id) => id === 'alight' || id === 'aheavy';
