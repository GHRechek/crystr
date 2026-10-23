// A wiki fact is a few key words: one line, up to 3 words and 80 characters when someone adds
// one. Pure, so the form and the server agree (the database says the same in cr_wiki_add_fact).
// A witch reading what is waiting can keep or reword a fact up to 10 words, so facts sent
// before the limit came down can still be kept (cr_wiki_review_fact).

export const FACT_MAX_CHARS = 80;
export const FACT_MAX_WORDS = 3;
export const FACT_REVIEW_MAX_WORDS = 10;
/** FACT_MAX_WORDS in words, for messages. */
export const FACT_MAX_WORDS_TEXT = "three";

/** Zero-width spaces, bidi marks and overrides, soft hyphen and BOM: they show nothing but
 *  can hide words or reorder what is displayed. The database strips the same set. The two
 *  joiners (U+200C, U+200D) stay: emoji sequences and several scripts need them. */
export const INVISIBLE = /[\u00AD\u200B\u200E\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;

/** One tidy line: invisible characters dropped, breaks and runs of spaces collapsed, ends trimmed. */
export function cleanFact(text: string): string {
  return text.replace(INVISIBLE, "").replace(/\s+/g, " ").trim();
}

export function factProblem(text: string, maxWords: number = FACT_MAX_WORDS): "empty" | "too_long" | null {
  const t = cleanFact(text);
  if (!t) return "empty";
  if (t.length > FACT_MAX_CHARS || t.split(" ").length > maxWords) return "too_long";
  return null;
}
