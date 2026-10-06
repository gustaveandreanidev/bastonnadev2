// =====================================================================
//  BASTONNADE : fichier d'équilibrage
//  Toutes les valeurs de gameplay sont ici.
//  Unités : pixels (monde logique 1280x720) et frames (60 par seconde).
//  Les vitesses sont en pixels par frame. Les dégâts en points de vie
//  (barre de 100). Modifier ce fichier suffit pour rééquilibrer le jeu.
// =====================================================================

export const PHYS = {
  width: 40,            // largeur de la hurtbox
  height: 104,          // hauteur debout
  crouchHeight: 70,     // hauteur accroupi
  gravity: 0.72,
  maxFall: 13,
  fastFall: 19,         // vitesse de chute rapide (S en l'air)
  walkSpeed: 4.6,
  runSpeed: 7.8,
  groundAccel: 1.2,
  groundFriction: 0.9,
  airSpeed: 5.8,
  airAccel: 0.6,
  airFriction: 0.15,
  jumpVel: 15.5,
  doubleJumpVel: 13.5,
  doubleTapWindow: 14,  // frames pour un double tap (course)
  inputBuffer: 7,       // frames de mémoire d'une touche pressée trop tôt
  airAttackLandLag: 7,  // frames bloquées si on atterrit pendant une attaque aérienne
  hitstunFriction: 0.45,
  wallBounceSpeed: 9,   // au-dessus, un corps projeté rebondit sur les murs
  pushSpeed: 1.5,       // séparation entre les deux combattants
};

export const DODGE = {
  duration: 16,
  dashTicks: 8,       // frames à pleine vitesse avant de ralentir
  speed: 12,
  airDownSpeed: 12,
  invulnStart: 1,     // frames d'invincibilité [start, end]
  invulnEnd: 12,
  cooldown: 60,       // ~1 seconde
};

export const RULES = {
  maxHp: 100,
  koToWin: 3,
  regenDelay: 180,          // 3 s sans prendre de coup
  regenTime: 1020,          // 0 -> 100 % en 17 s
  countdownBeat: 45,        // 3, 2, 1, Bastonnade ! (frames par temps)
  koPause: 150,
  finalKoPause: 220,
  trainingRegenDelay: 70,   // le mannequin se soigne vite
  trainingRegenTime: 90,
  // Dégressivité des combos : à chaque coup consécutif (victime encore en
  // hitstun), le hitstun baisse et le knockback augmente : pas de combo infini.
  comboHitstunDecay: 18,    // % de hitstun perdu par coup enchaîné
  comboMinHitstun: 40,      // plancher, en % du hitstun normal
  comboKbGrowth: 15,        // % de knockback gagné par coup enchaîné
  comboMaxKb: 175,          // plafond, en %
};

export const PROPS = {
  partitionHp: 60,
  // un corps projeté à cette vitesse traverse/abîme une cloison
  crashSpeed: 10,
  crashDamage: 25,
  barrel: {
    minSpeed: 6, maxSpeed: 15, speedFromKb: 0.7, hop: 4,
    rollFriction: 0.035, burstSpeed: 4, harmSpeed: 3,
    damage: 12, kb: [8, -6], hitstun: 26, hitstop: 7, wallDamage: 40,
  },
  mug: {
    speed: 13, lift: 6.5, gravity: 0.5,
    damage: 7, kb: [5, -4], hitstun: 18, hitstop: 5,
  },
};

// ---------------------------------------------------------------------
//  ARMES
//  hitbox : { x, y, w, h } relative aux pieds du combattant tourné vers
//  la droite (y négatif = vers le haut).
//  kb : knockback [x, y] en px/frame.   prop : dégâts infligés aux décors.
//  charge : { max (frames), dmg (multiplicateur à pleine charge), kb }.
//  lunge : élan vers l'avant au début de la phase active.
//  cancel : sur un coup réussi, la récupération peut être annulée.
//  armor : super armure pendant l'armement et la frappe (les coups reçus
//          font des dégâts mais n'interrompent pas l'attaque).
//  plunge / diveX : plongeon (vitesse verticale / horizontale) jusqu'à l'atterrissage.
// ---------------------------------------------------------------------

export const WEAPONS = {
  rapier: {
    name: 'Rapière',
    desc: 'Rapide et précise. Enchaîne les coups sans laisser respirer.',
    gauges: { speed: 5, range: 2, power: 2 },
    material: 'blade',
    attacks: {
      nlight: { name: 'Estocade', startup: 5, active: 3, recovery: 10, damage: 6,
        kb: [3.5, -2.5], hitstun: 21, hitstop: 4, prop: 12, lunge: 2, cancel: true,
        hitbox: { x: 16, y: -74, w: 62, h: 24 } },
      slight: { name: 'Fente', startup: 7, active: 4, recovery: 14, damage: 9,
        kb: [6.5, -3.5], hitstun: 23, hitstop: 5, prop: 14, lunge: 10, cancel: true,
        hitbox: { x: 14, y: -70, w: 72, h: 26 } },
      alight: { name: 'Taillade aérienne', startup: 5, active: 4, recovery: 12, damage: 7,
        kb: [4, -4.5], hitstun: 21, hitstop: 4, prop: 12, cancel: true, landLag: 5,
        hitbox: { x: -4, y: -100, w: 86, h: 64 } },
      nheavy: { name: 'Coup de grâce', startup: 12, active: 4, recovery: 22, damage: 13,
        kb: [9, -7], hitstun: 28, hitstop: 8, prop: 35, lunge: 6,
        charge: { max: 40, dmg: 1.7, kb: 1.5 },
        hitbox: { x: 12, y: -96, w: 88, h: 60 } },
      aheavy: { name: 'Tourbillon', startup: 10, active: 8, recovery: 18, damage: 12,
        kb: [7, -8], hitstun: 26, hitstop: 7, prop: 30, landLag: 10, spin: true,
        hitbox: { x: -58, y: -112, w: 116, h: 96 } },
    },
  },

  axe: {
    name: 'Hache',
    desc: 'Lente mais dévastatrice. Ses coups lourds pulvérisent le décor.',
    gauges: { speed: 1, range: 3, power: 5 },
    material: 'heavy',
    attacks: {
      nlight: { name: 'Taille', startup: 9, active: 4, recovery: 16, damage: 10,
        kb: [6, -4.5], hitstun: 23, hitstop: 6, prop: 25, lunge: 2,
        hitbox: { x: 12, y: -104, w: 78, h: 84 } },
      slight: { name: 'Revers', startup: 11, active: 5, recovery: 18, damage: 13,
        kb: [9, -4], hitstun: 25, hitstop: 7, prop: 30, lunge: 7,
        hitbox: { x: 8, y: -82, w: 82, h: 46 } },
      alight: { name: 'Fendoir aérien', startup: 9, active: 5, recovery: 16, damage: 11,
        kb: [5, -6], hitstun: 23, hitstop: 6, prop: 25, landLag: 8,
        hitbox: { x: -6, y: -110, w: 90, h: 80 } },
      nheavy: { name: 'Fracas', startup: 20, active: 5, recovery: 28, damage: 20,
        kb: [12, -9], hitstun: 32, hitstop: 12, prop: 999, lunge: 3,
        armor: true,
        charge: { max: 50, dmg: 1.6, kb: 1.5 },
        hitbox: { x: 8, y: -120, w: 92, h: 120 } },
      aheavy: { name: 'Météore', startup: 14, active: 40, recovery: 22, damage: 18,
        kb: [5, -11], hitstun: 30, hitstop: 10, prop: 999, landLag: 16,
        plunge: 17, untilLand: true,
        hitbox: { x: -8, y: -50, w: 76, h: 72 } },
    },
  },

  spear: {
    name: 'Lance',
    desc: 'Garde l\'adversaire à distance. Redoutable de loin, faible au contact.',
    gauges: { speed: 3, range: 5, power: 3 },
    material: 'pierce',
    attacks: {
      nlight: { name: 'Pique', startup: 7, active: 3, recovery: 13, damage: 7,
        kb: [5, -2], hitstun: 21, hitstop: 5, prop: 14, lunge: 1,
        hitbox: { x: 58, y: -76, w: 82, h: 20 } },
      slight: { name: 'Charge', startup: 9, active: 6, recovery: 16, damage: 10,
        kb: [7.5, -3], hitstun: 23, hitstop: 6, prop: 18, lunge: 10,
        hitbox: { x: 44, y: -74, w: 100, h: 24 } },
      alight: { name: 'Fauchage aérien', startup: 7, active: 5, recovery: 14, damage: 8,
        kb: [5, -5], hitstun: 21, hitstop: 5, prop: 14, landLag: 6,
        hitbox: { x: 34, y: -112, w: 98, h: 76 } },
      nheavy: { name: 'Transpercer', startup: 15, active: 5, recovery: 24, damage: 15,
        kb: [10, -5], hitstun: 28, hitstop: 9, prop: 40, lunge: 4,
        charge: { max: 45, dmg: 1.6, kb: 1.5 },
        hitbox: { x: 60, y: -80, w: 118, h: 26 } },
      aheavy: { name: 'Piqué', startup: 11, active: 10, recovery: 20, damage: 13,
        kb: [6, -7], hitstun: 26, hitstop: 8, prop: 35, landLag: 10,
        hitbox: { x: 22, y: -36, w: 78, h: 70 } },
    },
  },

  daggers: {
    name: 'Dagues',
    desc: 'Deux lames, aucune pitié. Très rapides, très courtes, très mobiles.',
    gauges: { speed: 5, range: 1, power: 1 },
    material: 'blade',
    attacks: {
      nlight: { name: 'Estoc rapide', startup: 4, active: 2, recovery: 10, damage: 3.5,
        kb: [2.5, -2], hitstun: 16, hitstop: 3, prop: 8, lunge: 2, cancel: true,
        hitbox: { x: 10, y: -74, w: 54, h: 28 } },
      slight: { name: 'Ruée', startup: 6, active: 5, recovery: 15, damage: 6,
        kb: [5, -3.5], hitstun: 22, hitstop: 4, prop: 10, lunge: 12, cancel: true,
        hitbox: { x: 6, y: -76, w: 62, h: 32 } },
      alight: { name: 'Vrille', startup: 4, active: 6, recovery: 10, damage: 6,
        kb: [3.5, -4.5], hitstun: 20, hitstop: 4, prop: 8, cancel: true, landLag: 4, spin: true,
        hitbox: { x: -34, y: -104, w: 98, h: 80 } },
      nheavy: { name: 'Éventrer', startup: 9, active: 3, recovery: 18, damage: 11,
        kb: [7, -6], hitstun: 26, hitstop: 7, prop: 25, lunge: 8,
        charge: { max: 30, dmg: 1.8, kb: 1.5 },
        hitbox: { x: 8, y: -86, w: 66, h: 44 } },
      aheavy: { name: 'Plongeon', startup: 8, active: 30, recovery: 14, damage: 10,
        kb: [6, -6], hitstun: 24, hitstop: 6, prop: 20, landLag: 10,
        plunge: 14, diveX: 7, untilLand: true,
        hitbox: { x: -2, y: -56, w: 60, h: 62 } },
    },
  },

  hammer: {
    name: 'Marteau',
    desc: 'Un marteau de guerre qui envoie valser vers le ciel. Gros dégâts, gros risques.',
    gauges: { speed: 1, range: 3, power: 5 },
    material: 'heavy',
    attacks: {
      nlight: { name: 'Coup de manche', startup: 8, active: 4, recovery: 16, damage: 9,
        kb: [4.5, -8], hitstun: 25, hitstop: 6, prop: 25,
        hitbox: { x: 8, y: -112, w: 80, h: 92 } },
      slight: { name: 'Bélier', startup: 12, active: 5, recovery: 20, damage: 13,
        kb: [10, -5], hitstun: 26, hitstop: 8, prop: 35, lunge: 9,
        hitbox: { x: 10, y: -82, w: 80, h: 46 } },
      alight: { name: 'Marteau tournoyant', startup: 10, active: 6, recovery: 16, damage: 11,
        kb: [5, -6], hitstun: 24, hitstop: 7, prop: 25, landLag: 9,
        hitbox: { x: -8, y: -110, w: 94, h: 92 } },
      nheavy: { name: 'Séisme', startup: 22, active: 6, recovery: 30, damage: 19,
        kb: [6, -13], hitstun: 34, hitstop: 13, prop: 999, lunge: 2,
        armor: true,
        charge: { max: 55, dmg: 1.6, kb: 1.4 },
        hitbox: { x: -40, y: -62, w: 170, h: 62 } },
      aheavy: { name: 'Uppercut céleste', startup: 12, active: 6, recovery: 22, damage: 15,
        kb: [2, -14], hitstun: 30, hitstop: 10, prop: 60, landLag: 12,
        hitbox: { x: -26, y: -176, w: 100, h: 104 } },
    },
  },

  flail: {
    name: 'Fléau',
    desc: 'Une boule hérissée au bout d\'une chaîne. Grands arcs qui frappent aussi derrière.',
    gauges: { speed: 2, range: 4, power: 4 },
    material: 'heavy',
    attacks: {
      nlight: { name: 'Balancier', startup: 8, active: 5, recovery: 14, damage: 8,
        kb: [5.5, -4], hitstun: 22, hitstop: 5, prop: 18,
        hitbox: { x: 22, y: -96, w: 84, h: 66 } },
      slight: { name: 'Moulinet', startup: 9, active: 8, recovery: 16, damage: 10,
        kb: [7, -5], hitstun: 24, hitstop: 6, prop: 22, lunge: 6,
        hitbox: { x: -56, y: -118, w: 166, h: 76 } },
      alight: { name: 'Fronde', startup: 7, active: 6, recovery: 13, damage: 8,
        kb: [5, -6], hitstun: 21, hitstop: 5, prop: 18, landLag: 6,
        hitbox: { x: -18, y: -44, w: 112, h: 74 } },
      nheavy: { name: 'Fracasse-crâne', startup: 16, active: 5, recovery: 24, damage: 16,
        kb: [9, -8], hitstun: 29, hitstop: 10, prop: 50, lunge: 3,
        armor: true,
        charge: { max: 50, dmg: 1.65, kb: 1.45 },
        hitbox: { x: 30, y: -112, w: 102, h: 112 } },
      aheavy: { name: 'Comète', startup: 12, active: 8, recovery: 20, damage: 14,
        kb: [8, -7], hitstun: 27, hitstop: 9, prop: 40, landLag: 11, spin: true,
        hitbox: { x: -84, y: -116, w: 168, h: 108 } },
    },
  },
};

export const WEAPON_IDS = ['rapier', 'axe', 'spear', 'daggers', 'hammer', 'flail'];

// Ordre et libellés des attaques (écran Contrôles)
export const ATTACK_LIST = [
  ['nlight', 'L', 'Légère au sol'],
  ['slight', 'Q/D + L', 'Légère en course'],
  ['alight', 'L en l\'air', 'Légère aérienne'],
  ['nheavy', 'M (maintenir)', 'Lourde chargeable'],
  ['aheavy', 'M en l\'air', 'Lourde aérienne'],
];
