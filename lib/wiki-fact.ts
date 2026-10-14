// A wiki fact is a handful of words: one line, up to 10 words and 80
// characters. Pure, so the form and the server agree (the database says the
// same in cr_wiki_add_fact).

export const FACT_MAX_CHARS = 80;
export const FACT_MAX_WORDS = 10;

/** One tidy line: breaks and runs of spaces collapsed, ends trimmed. */
export function cleanFact(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function factProblem(text: string): "empty" | "too_long" | null {
  const t = cleanFact(text);
  if (!t) return "empty";
  if (t.length > FACT_MAX_CHARS || t.split(" ").length > FACT_MAX_WORDS) return "too_long";
  return null;
}
