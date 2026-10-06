// La Taverne : géométrie statique (en pixels).
export const WORLD = { w: 1280, h: 720, floor: 640, left: 40, right: 1240, ceil: 24 };

// Plateformes traversables par le dessous (tables, galerie)
export const PLATFORMS = [
  { x1: 128, x2: 392, y: 545, kind: 'table' },
  { x1: 888, x2: 1152, y: 545, kind: 'table' },
  { x1: 520, x2: 760, y: 410, kind: 'gallery' },
];

// Cloisons en bois cassables (x = centre)
export const PARTITIONS = [
  { x: 482, top: 512, w: 22 },
  { x: 798, top: 512, w: 22 },
];

// Tonneaux (posés au sol)
export const BARRELS = [{ x: 84 }, { x: 1196 }, { x: 640 }];

// Chopes (y = surface où elles sont posées)
export const MUGS = [
  { x: 206, y: 545 }, { x: 318, y: 545 },
  { x: 962, y: 545 }, { x: 1074, y: 545 },
  { x: 604, y: 410 },
];

export const SPAWNS = [
  { x: 262, facing: 1 },
  { x: 1018, facing: -1 },
];

// Éléments purement décoratifs (rendu)
export const CANDLES = [
  { x: 168, y: 545, h: 22 }, { x: 362, y: 545, h: 16 },
  { x: 918, y: 545, h: 18 }, { x: 1120, y: 545, h: 24 },
  { x: 700, y: 410, h: 14 },
];
export const SCONCES = [{ x: 150, y: 330 }, { x: 1130, y: 330 }];
export const CHANDELIER = { x: 640, y: 170 };
export const FIREPLACE = { x: 640, y: 640, w: 170, h: 132 };
