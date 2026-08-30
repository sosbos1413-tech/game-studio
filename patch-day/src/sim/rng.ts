// Minimal seeded PRNG (mulberry32) so a given world seed always produces the
// same fictional content and (later) the same simulation rolls. Reloading a
// save must not grant a "free reroll" — see master prompt §28/§46 (Part 2/3).

export function createSeededRng(seed: string) {
  let a = hashStringToInt(seed);
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStringToInt(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

export function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[randomInt(rng, 0, items.length - 1)];
}

export function generateWorldSeed(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
