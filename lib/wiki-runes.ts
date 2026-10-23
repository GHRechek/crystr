// The unreadable text between a page's facts is written in runes. There are 38 of them,
// drawn as 16x16 pixel art; public/runes/runes-bold-white.png holds them white and bold in a
// sheet of 8 across, and the glyph itself fills pixels 3..14 of its cell.

export const RUNE_COUNT = 38;
const COLS = 8;
const CELL = 16;
const INSET = 3;
export const RUNE_SIZE = 12;

/** Where a rune sits in the sheet, as a CSS background-position. */
export function runePosition(i: number): string {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  return `-${col * CELL + INSET}px -${row * CELL + INSET}px`;
}

function rng(seed: number) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

/** `count` rune-words (each two to six runes), the same for the same seed, so a page looks
 *  the same every visit and to every viewer. A rune never follows itself, which keeps it
 *  from looking like a stutter. */
export function runeWords(seed: number, count: number): number[][] {
  const r = rng(seed);
  const words: number[][] = [];
  for (let w = 0; w < count; w++) {
    const n = 2 + Math.floor(r() * 5);
    const word: number[] = [];
    for (let k = 0; k < n; k++) {
      let g = Math.floor(r() * RUNE_COUNT);
      if (k > 0 && g === word[k - 1]) g = (g + 1 + Math.floor(r() * (RUNE_COUNT - 1))) % RUNE_COUNT;
      word.push(g);
    }
    words.push(word);
  }
  return words;
}
