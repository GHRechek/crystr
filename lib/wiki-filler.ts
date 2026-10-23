// The illegible text between a page's facts. It is only ever shown blurred, so
// it has to look like prose, not mean anything. Seeded by page and slot so a
// page looks the same every visit and every viewer sees the same shapes.

const WORDS = (
  "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et " +
  "dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea " +
  "commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur " +
  "excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum " +
  "curabitur pretium tincidunt lacus nunc malesuada vitae pharetra augue mauris viverra vulputate"
).split(" ");

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

/** A run of nonsense, a line or two, to sit just before a fact. It ends in a
 *  full stop so the fact after it starts a sentence. */
export function fillerChunk(pageId: number, slot: number): string {
  const r = rng(pageId * 7919 + slot * 104729);
  const n = 9 + Math.floor(r() * 14);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    let w = WORDS[Math.floor(r() * WORDS.length)];
    if (i === 0) w = w[0].toUpperCase() + w.slice(1);
    if (i > 3 && i < n - 1 && r() < 0.1) w += ",";
    out.push(w);
  }
  out[out.length - 1] = out[out.length - 1].replace(/[.,]$/, "") + ".";
  return out.join(" ");
}

/** `count` words of nonsense in sentences of about six to twelve words, for a stretch of the
 *  page between facts. Seeded, so a page looks the same every visit and to every viewer. */
export function fillerRun(seed: number, count: number): string {
  const r = rng(seed);
  const out: string[] = [];
  let sentence = 0;
  let length = 6 + Math.floor(r() * 7);
  for (let i = 0; i < count; i++) {
    let w = WORDS[Math.floor(r() * WORDS.length)];
    if (sentence === 0) w = w[0].toUpperCase() + w.slice(1);
    sentence++;
    if (sentence >= length || i === count - 1) {
      w += ".";
      sentence = 0;
      length = 6 + Math.floor(r() * 7);
    } else if (sentence > 3 && r() < 0.1) {
      w += ",";
    }
    out.push(w);
  }
  return out.join(" ");
}
