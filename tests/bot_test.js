// Bot contre bot : vérifie que les matchs se terminent, que la difficulté
// compte, et donne un aperçu de l'équilibrage entre armes.
// Lancer : node tests/bot_test.js
import { createState } from '../js/sim/state.js';
import { step } from '../js/sim/sim.js';
import { Bot } from '../js/game/bot.js';
import { WEAPON_IDS } from '../js/config.js';

function match(w0, w1, l0, l1, seed) {
  const s = createState({ seed, weapons: [w0, w1] });
  const b = [new Bot(0, l0), new Bot(1, l1)];
  let t = 0;
  while (s.phase !== 'end' && t < 60 * 60 * 6) { step(s, [b[0].input(s), b[1].input(s)], []); t++; }
  return { winner: s.winner, secs: Math.round(t / 60), hits: s.f.map((f) => f.hits) };
}

// 1) la difficulté compte
let wins = 0, n = 0, unfinished = 0;
for (const w of WEAPON_IDS) for (let k = 0; k < 3; k++) {
  const r = match(w, w, 'difficile', 'facile', 100 + k);
  if (r.winner === 0) wins++;
  if (r.winner < 0) unfinished++;
  n++;
}
console.log(`Difficile contre Facile (même arme) : ${wins}/${n} victoires, ${unfinished} non terminés`);

// 2) équilibrage : chaque arme contre chaque autre, bots Normal, côtés alternés
const score = Object.fromEntries(WEAPON_IDS.map((w) => [w, 0]));
const games = Object.fromEntries(WEAPON_IDS.map((w) => [w, 0]));
let durations = [];
for (const a of WEAPON_IDS) for (const b of WEAPON_IDS) {
  if (a === b) continue;
  for (let k = 0; k < 2; k++) {
    const r = match(a, b, 'normal', 'normal', 7 + k * 31);
    games[a]++; games[b]++;
    if (r.winner === 0) score[a]++; else if (r.winner === 1) score[b]++;
    durations.push(r.secs);
  }
}
for (const w of WEAPON_IDS) console.log(`${w.padEnd(8)} ${Math.round((100 * score[w]) / games[w])} % de victoires`);
durations.sort((x, y) => x - y);
console.log(`durée médiane d'un match : ${durations[durations.length >> 1]} s`);
