// Wiki search, the basic kind: a substring match on title, address and the
// facts people have added. Pure helpers here; the queries are in lib/wiki.ts.

/** Search for what was typed, not for a pattern. In SQL's LIKE, % and _ are
 *  wildcards and \ is the escape; a person searching "100%" means a percent
 *  sign. Also caps the length and trims. */
export function escapeLike(q: string): string {
  return q.trim().slice(0, 80).replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** What the person typed, tidied for display and for matching. */
export function cleanQuery(q: string | undefined): string {
  return (q ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
}
