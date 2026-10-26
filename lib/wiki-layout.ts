import { runeWords } from "@/lib/wiki-runes";

/** One run of the page: a stretch of runes, a fact somebody added, or a link to a page that
 *  sits under this one, dropped into the runes as if it were a fact. */
export type Piece<F, L = never> =
  | { kind: "runes"; words: number[][] }
  | { kind: "fact"; fact: F }
  | { kind: "link"; page: L };

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
 *  when facts are added after it. A last paragraph of nothing but runes always closes the page,
 *  which is where "add something" sits. */
export function layoutPage<F, L = never>(pageId: number, facts: F[], links: L[] = []): Piece<F, L>[][] {
  const paragraphs: Piece<F, L>[][] = [];
  const blur = (seed: number, words: number): Piece<F, L> => ({ kind: "runes", words: runeWords(seed, words) });

  for (let i = 0, p = 0; i < facts.length; i += 2, p++) {
    const r = rng(pageId * 31 + p * 977 + 5);
    const seed = pageId * 1009 + p * 4231;
    const para: Piece<F, L>[] = [blur(seed + 1, 8 + Math.floor(r() * 18)), { kind: "fact", fact: facts[i] }];
    if (i + 1 < facts.length) {
      para.push(blur(seed + 2, 6 + Math.floor(r() * 14)), { kind: "fact", fact: facts[i + 1] });
    }
    para.push(blur(seed + 3, 4 + Math.floor(r() * 9)));
    paragraphs.push(para);
  }

  // The closing runes: two paragraphs on an empty page, one otherwise.
  const closing = facts.length === 0 ? 2 : 1;
  for (let c = 0; c < closing; c++) {
    const p = Math.ceil(facts.length / 2) + c;
    const r = rng(pageId * 31 + p * 977 + 9);
    paragraphs.push([blur(pageId * 1009 + p * 4231 + 7, 22 + Math.floor(r() * 18))]);
  }

  // The pages under this one turn up inside the runes, each at a spot of its own that
  // stays put from visit to visit: a paragraph, then a stretch of runes in it, then a
  // word in that stretch to break it at.
  links.forEach((page, li) => {
    const r = rng(pageId * 7919 + li * 104729 + 13);
    const para = paragraphs[Math.floor(r() * paragraphs.length)];
    const runs = para.map((piece, at) => ({ piece, at })).filter((x) => x.piece.kind === "runes");
    const pick = runs[Math.floor(r() * runs.length)];
    if (!pick || pick.piece.kind !== "runes") return;
    const words = pick.piece.words;
    const cut = 1 + Math.floor(r() * Math.max(1, words.length - 1));
    para.splice(pick.at, 1, { kind: "runes", words: words.slice(0, cut) }, { kind: "link", page }, { kind: "runes", words: words.slice(cut) });
  });
  return paragraphs;
}
