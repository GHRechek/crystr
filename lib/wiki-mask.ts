// The wiki hides numbers first. Any run of three or more digits (a code, a date, a
// street number) loses one or two of them, so a number copied from the wiki is broken and
// has to be found in the world. Which digits go is fixed by where the number sits in the
// text, so a reload shows the same gaps. Witches see the real thing.

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
