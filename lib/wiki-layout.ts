import { fillerRun } from "@/lib/wiki-filler";

/** One run of the page: unreadable text, or a fact somebody added. */
export type Piece<F> =
  | { kind: "blur"; text: string }
  | { kind: "fact"; fact: F };

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

/** Lays a page out as paragraphs: two facts to a paragraph, each with a stretch of unreadable
 *  text before it, between the pair and after them, the lengths varying from paragraph to
 *  paragraph. It is seeded by the page and the paragraph's place, so a paragraph keeps its shape
 *  when facts are added after it. A last paragraph of nothing but blur always closes the page,
 *  which is where "add something" sits. */
export function layoutPage<F>(pageId: number, facts: F[]): Piece<F>[][] {
  const paragraphs: Piece<F>[][] = [];
  const blur = (seed: number, words: number): Piece<F> => ({ kind: "blur", text: fillerRun(seed, words) });

  for (let i = 0, p = 0; i < facts.length; i += 2, p++) {
    const r = rng(pageId * 31 + p * 977 + 5);
    const seed = pageId * 1009 + p * 4231;
    const para: Piece<F>[] = [blur(seed + 1, 12 + Math.floor(r() * 30)), { kind: "fact", fact: facts[i] }];
    if (i + 1 < facts.length) {
      para.push(blur(seed + 2, 8 + Math.floor(r() * 26)), { kind: "fact", fact: facts[i + 1] });
    }
    para.push(blur(seed + 3, 6 + Math.floor(r() * 16)));
    paragraphs.push(para);
  }

  // The closing blur: two paragraphs on an empty page, one otherwise.
  const closing = facts.length === 0 ? 2 : 1;
  for (let c = 0; c < closing; c++) {
    const p = Math.ceil(facts.length / 2) + c;
    const r = rng(pageId * 31 + p * 977 + 9);
    paragraphs.push([blur(pageId * 1009 + p * 4231 + 7, 34 + Math.floor(r() * 30))]);
  }
  return paragraphs;
}
