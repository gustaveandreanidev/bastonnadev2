// Palette médiévale commune : bois, pierre, fer, braises, tissus.
export const PAL = {
  ink: '#1c120d',
  inkSoft: '#2e1f17',

  woodDark: '#4a2c1a',
  wood: '#7a4a2a',
  woodMid: '#94603a',
  woodLight: '#b57d4d',
  woodPale: '#d4a06a',
  plank: '#6b3f22',

  stoneDark: '#2b2a31',
  stone: '#45434d',
  stoneMid: '#5a5763',
  stoneLight: '#757181',

  iron: '#5f6670',
  ironLight: '#9aa3ad',
  steel: '#c9d2da',
  steelBright: '#eef4f8',
  gold: '#d8a53a',
  goldLight: '#f3d27a',
  brass: '#b88a35',

  ember: '#ff7a1c',
  emberHot: '#ffb347',
  flame: '#ffd36b',
  flameCore: '#fff3c4',
  ash: '#8b8178',

  leather: '#5e3a24',
  leatherLight: '#87573a',
  cloth: '#a23a2e',
  clothBlue: '#2f5d9a',
  parchment: '#ecd9b0',
  parchmentDark: '#c9ae7c',

  ale: '#e0a332',
  foam: '#fff6df',
  ceramic: '#cfc4b0',
  wine: '#7a1e2a',

  players: [
    { main: '#d8453a', dark: '#8f2620', light: '#ff8a6e', name: 'rouge' },
    { main: '#3f7fdc', dark: '#24508f', light: '#8fc0ff', name: 'bleu' },
  ],
  dummy: { main: '#c9a560', dark: '#7d6232', light: '#ead08e', name: 'paille' },
};

export const playerColor = (i, dummy) => (dummy ? PAL.dummy : PAL.players[i]);
