// What a wiki text looks like to the person reading it. Witches read everything. With mana
// to spare, so does everyone. Low on mana, the numbers go first: any run of three or more
// digits (a code, a date, a street number) loses one or two of them, so a number copied
// from the wiki is broken and has to be found in the world. Lower still, and the letters
// start to go too (corrupt, the same eating of letters the rest of the City suffers).
// Which digits go is fixed by where the number sits in the text, so a reload shows the
// same gaps.

import { corrupt } from "@/lib/crystr";

const GAP = "▒";

export function hideNumbers(text: string): string {
  return text.replace(/\d{3,}/g, (run, at: number) => {
    const chars = [...run];
    const lose = run.length >= 4 ? 2 : 1;
    const hit = new Set<number>();
    let h = at * 7 + run.length * 13 + Number(run[0]) * 3;
    while (hit.size < lose) {
      h = (h * 31 + 17) % 9973;
      hit.add(h % chars.length);
    }
    return chars.map((c, i) => (hit.has(i) ? GAP : c)).join("");
  });
}

/** Numbers first, then letters: `decay` is decayLevel(mana), 0 meaning plenty. */
export function wikiText(text: string, decay: number, witch: boolean): string {
  if (witch || decay <= 0) return text;
  const masked = hideNumbers(text);
  return decay >= 2 ? corrupt(masked, decay) : masked;
}
