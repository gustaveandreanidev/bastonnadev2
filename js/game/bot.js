// IA du mode « Contre un bot ». Le bot ne triche pas : il lit l'état du jeu
// et produit les mêmes entrées clavier qu'un joueur (mêmes règles, mêmes
// temps de récupération). La difficulté règle son temps de réaction, sa
// lecture des attaques adverses et son agressivité.
import { W, P, PARTS } from '../sim/tuning.js';
import { IN, U } from '../sim/units.js';

export const BOT_LEVELS = {
  facile: { label: 'Facile', think: 16, dodge: 0.12, aggro: 0.35, combo: 0.15, heavy: 0.2, punish: 0.3, miss: 0.35, run: false },
  normal: { label: 'Normal', think: 8, dodge: 0.4, aggro: 0.6, combo: 0.55, heavy: 0.3, punish: 0.65, miss: 0.12, run: true },
  difficile: { label: 'Difficile', think: 3, dodge: 0.75, aggro: 0.85, combo: 0.9, heavy: 0.35, punish: 0.9, miss: 0.03, run: true },
};

const overlap = (a, b) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
const chance = (p) => Math.random() < p;

// Hitbox d'une attaque si elle partait de (x, y) tournée vers `face`
function hitboxAt(wpn, id, x, y, face, extra = 0) {
  const hb = W[wpn][id].hb;
  const x1 = face > 0 ? x + hb.x - extra : x - hb.x - hb.w - extra;
  return { x1, y1: y + hb.y - extra, x2: x1 + hb.w + 2 * extra, y2: y + hb.y + hb.h + extra };
}

const hurt = (f, dx = 0) => ({ x1: f.x + dx - P.hw, y1: f.y - P.h, x2: f.x + dx + P.hw, y2: f.y });

export class Bot {
  constructor(index, level = 'normal') {
    this.i = index;
    this.L = BOT_LEVELS[level] || BOT_LEVELS.normal;
    this.timer = 0;
    this.move = 0;        // direction voulue (-1, 0, 1)
    this.down = 0;
    this.hold = 0;        // frames de charge restantes (M maintenu)
    this.want = 0;        // action à presser dès que possible
    this.wantDir = 0;
    this.prevOut = 0;
    this.tap = 0;         // séquence de double tap pour courir
    this.stuck = 0;
    this.threatSeen = -1;
  }

  input(s) {
    const me = s.f[this.i], op = s.f[1 - this.i];
    if (s.phase !== 'fight' || me.st === 'ko') { this.reset(); return this.out(0); }

    // Charge d'une attaque lourde : on garde M enfoncé
    if (this.hold > 0) {
      this.hold--;
      return this.out(IN.HV | (this.wantDir > 0 ? IN.R : this.wantDir < 0 ? IN.L : 0));
    }

    const dx = op.x - me.x, adx = Math.abs(dx), dir = dx >= 0 ? 1 : -1;
    const dy = op.y - me.y;
    const free = me.st === 'free';

    // Défense : lire l'attaque adverse et esquiver (décision une fois par attaque)
    if (op.st === 'attack' && op.atk && (op.atk.ph === 'startup' || op.atk.ph === 'charge') && me.dcd === 0) {
      const id = op.atk.id;
      const key = s.tick - op.atk.t;
      if (this.threatSeen !== key && overlap(hitboxAt(op.wpn, id, op.x, op.y, op.face, 22 * U), hurt(me))) {
        this.threatSeen = key;
        if (free && chance(this.L.dodge) && (me.gr || me.adodge > 0)) {
          this.want = IN.DG;
          this.wantDir = chance(0.65) ? -dir : 0;
        }
      }
    }

    // Enchaînements : annuler la récupération d'un coup réussi
    if (me.st === 'attack' && me.atk && me.atk.hit && W[me.wpn][me.atk.id].cancel && !this.want) {
      if (chance(this.L.combo / 3)) { this.want = IN.LT; this.wantDir = chance(0.5) ? dir : 0; }
    }

    // Réflexion périodique : déplacement et choix d'attaque
    if (--this.timer <= 0) {
      this.timer = this.L.think + Math.floor(Math.random() * 4);
      this.think(s, me, op, dx, adx, dir, dy);
    }

    let out = 0;
    // déplacement
    let mv = this.move;
    if (me.st === 'free' && mv) {
      if (this.tap > 0) {
        // double tap pour courir : relâche, appui, relâche, appui
        this.tap--;
        if (this.tap === 3 || this.tap === 1) mv = 0;
      }
      out |= mv > 0 ? IN.R : IN.L;
      // bloqué par une cloison ou un rebord : sauter
      if (me.gr && Math.abs(me.vx) < P.walk / 3) this.stuck++; else this.stuck = 0;
      if (this.stuck > 6 || this.partitionAhead(s, me, mv)) {
        if (me.gr) { this.want = this.want || IN.J; this.stuck = 0; }
      }
      if (!me.gr && me.vy > 0 && me.jumps > 0 && this.partitionAhead(s, me, mv) && !this.want) this.want = IN.J;
    }
    if (this.down) out |= IN.D;
    // chute rapide pour retomber sur l'adversaire
    if (!me.gr && me.vy > 0 && dy > 40 * U && adx < 80 * U) out |= IN.D;

    // action en attente (appui franc : il faut relâcher entre deux appuis)
    if (this.want) {
      const w = this.want;
      if (this.prevOut & w) {
        out &= ~w;
      } else {
        out |= w;
        if (this.wantDir) out = (out & ~(IN.L | IN.R)) | (this.wantDir > 0 ? IN.R : IN.L);
        else if (w === IN.LT) out &= ~(IN.L | IN.R);
        if (w === IN.HV && this.hold > 0) this.hold--;
        this.want = 0;
      }
    }
    return this.out(out);
  }

  think(s, me, op, dx, adx, dir, dy) {
    const L = this.L;
    const wpn = me.wpn;
    const nl = W[wpn].nlight.hb;
    const reach = nl.x + nl.w + P.hw;                 // portée max de l'attaque légère
    const opReach = W[op.wpn].nlight.hb.x + W[op.wpn].nlight.hb.w + P.hw;
    const slower = W[wpn].nlight.startup > W[op.wpn].nlight.startup + 2;
    // une arme lente se bat à la limite de sa portée, hors de portée adverse si possible
    const ideal = slower && reach > opReach ? (reach + opReach) / 2 : nl.x + nl.w * 0.55;
    const tooClose = slower ? Math.min(opReach, reach - 10 * U) : Math.max(0, nl.x - 6 * U);
    this.down = 0;

    // déplacement horizontal vers la bonne distance
    if (adx > ideal + 12 * U) this.move = dir;
    else if (adx < tooClose && chance(0.7)) this.move = -dir;
    else this.move = chance(0.25) ? dir : 0;
    if (L.run && me.gr && adx > 320 * U && this.tap === 0 && me.st === 'free' && Math.abs(me.vx) <= P.walk) this.tap = 4;

    // verticalité : rejoindre l'adversaire sur une table ou la galerie
    if (dy < -60 * U && adx < 260 * U && me.gr && !this.want) this.want = IN.J;
    else if (dy < -60 * U && !me.gr && me.vy > 0 && me.jumps > 0 && !this.want) this.want = IN.J;
    else if (dy > 60 * U && me.gr && me.plat >= 0 && adx < 200 * U) { this.down = 1; this.want = IN.J; }

    if (me.st !== 'free' || this.want || op.st === 'ko') return;

    // attaque : choisir un coup qui touche à la position prévue de l'adversaire
    const punish = op.st === 'hitstun' || (op.st === 'attack' && op.atk && op.atk.ph === 'recovery') || op.st === 'land';
    if (!chance(punish ? L.punish : L.aggro)) return;
    const ids = me.gr ? ['nlight', 'slight', 'nheavy'] : ['alight', 'aheavy'];
    const options = [];
    for (const id of ids) {
      const a = W[wpn][id];
      const lead = Math.min(a.startup, 14);
      const reach = a.lunge ? a.lunge * 4 : 0;
      const box = hitboxAt(wpn, id, me.x + dir * reach, me.y + (me.gr ? 0 : me.vy * lead), dir);
      if (!overlap(box, hurt(op, op.vx * lead))) continue;
      let w = id.endsWith('heavy') ? L.heavy : 1;
      if (punish && id.endsWith('heavy')) w *= 3;
      // armure : encaisser le harcèlement d'une arme plus rapide
      if (a.armor && slower && adx < opReach + 10 * U) w = 1.5 + L.heavy * 3;
      options.push([id, w]);
    }
    if (!options.length) return;
    let r = Math.random() * options.reduce((t, o) => t + o[1], 0);
    let pickId = options[0][0];
    for (const [id, w] of options) { r -= w; if (r <= 0) { pickId = id; break; } }
    // erreur volontaire : le bot rate parfois son timing
    if (chance(L.miss)) { this.timer += 6; return; }

    const heavy = pickId.endsWith('heavy');
    this.want = heavy ? IN.HV : IN.LT;
    this.wantDir = pickId === 'slight' || heavy || pickId === 'alight' ? dir : 0;
    if (pickId === 'nlight' && me.face !== dir) { this.want = IN.LT; this.wantDir = dir; }
    if (pickId === 'nheavy' && W[wpn].nheavy.cMax) {
      // charge si l'adversaire est encore loin d'arriver
      this.hold = chance(0.4) ? Math.floor(Math.random() * W[wpn].nheavy.cMax * 0.8) : 0;
    }
  }

  partitionAhead(s, me, mv) {
    for (let i = 0; i < PARTS.length; i++) {
      if (s.props.walls[i].hp <= 0) continue;
      const p = PARTS[i];
      const gap = (p.x - me.x) * mv;
      if (gap > 0 && gap < P.hw + p.hw + 34 * U && me.y > p.top) return true;
    }
    return false;
  }

  reset() { this.hold = 0; this.want = 0; this.tap = 0; this.move = 0; this.down = 0; }

  out(bits) { this.prevOut = bits; return bits; }
}

