// What each wave sends into the Hollow. Early waves teach one enemy at a time;
// later waves mix them, and waves 5 and 10 bring the Gloomwarden, the boss whose
// fall ends the game on wave 10. Counts grow with the wave, never without bound.
import { FINAL_WAVE } from './config.js';
import { pickWeighted } from './random.js';

const MIX = [
  { value: 'mote', weight: 10 },
  { value: 'darter', weight: 5 },
  { value: 'spitter', weight: 4 },
  { value: 'brute', weight: 2 },
];

/** The spawn queue for a wave: kinds in the order they arrive. */
export function buildWave(wave, random) {
  const queue = [];
  const isBossWave = wave === 5 || wave === FINAL_WAVE;
  const count = 6 + wave * 3;
  for (let i = 0; i < count; i += 1) {
    if (wave === 1) queue.push('mote');
    else if (wave === 2) queue.push(i % 3 === 2 ? 'darter' : 'mote');
    else if (wave === 3) queue.push(pickWeighted(random, MIX.slice(0, 3)));
    else queue.push(pickWeighted(random, MIX));
  }
  if (wave >= 4 && wave % 2 === 0) queue.push('brute');
  if (wave >= 3) queue.push('brute');
  if (isBossWave) queue.push('boss');
  return queue;
}

/** Seconds between spawns: the Hollow hurries as the waves deepen. */
export function spawnInterval(wave) {
  return Math.max(0.55, 1.5 - wave * 0.09);
}

/** The banner line the wave opens with. */
export function waveBanner(wave) {
  if (wave === FINAL_WAVE) return 'FINAL WAVE — THE GLOOMWARDEN';
  if (wave === 5) return 'WAVE 5 — THE GLOOMWARDEN STIRS';
  return `WAVE ${wave}`;
}
