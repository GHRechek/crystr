import { createClient } from "@/lib/supabase/server";

export { SLUG, slugify } from "@/lib/wiki-slug";
import { escapeLike } from "@/lib/wiki-search";

// The wiki's reads. Writes are all in lib/wiki-actions.ts, through the
// cr_wiki_* functions; the tables accept nothing else.

export type WikiPage = {
  id: number;
  slug: string;
  title: string;
  /** The page this one sits under, if any. */
  parent_id: number | null;
  /** Its place among the pages under the same parent; witches set it. */
  sort: number;
  slots: number;
  locked: boolean;
  archived: boolean;
  updated_at: string;
  updated_by: { handle: string } | null;
};

export type WikiFact = {
  id: number;
  slot: number;
  body: string;
  status: "pending" | "kept" | "returned";
  note: string;
  created_at: string;
  author: { id: string; handle: string } | null;
};

const PAGE_COLS =
  "id, slug, title, parent_id, sort, slots, locked, archived, updated_at, updated_by:profiles!wiki_pages_updated_by_fkey(handle)";
const FACT_COLS =
  "id, slot, body, status, note, created_at, author:profiles!wiki_facts_author_fkey(id, handle)";

export type WikiListing = WikiPage & {
  /** Facts a witch has kept. */
  facts: number;
  /** Facts waiting for a witch. Only ever counted for witches. */
  waiting: number;
};

/** The list's order: the pages this person opened most recently first, then
 *  every page they haven't opened, alphabetically. Pure, so it can be tested. */
export function listOrder<T extends { id: number; title: string }>(pages: T[], viewed: Map<number, number>): T[] {
  return [...pages].sort((a, b) => {
    const va = viewed.get(a.id);
    const vb = viewed.get(b.id);
    if (va !== undefined && vb !== undefined && va !== vb) return vb - va;
    if (va !== undefined && vb === undefined) return -1;
    if (va === undefined && vb !== undefined) return 1;
    return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  });
}

/** When this person last opened each page (their own record; the database only
 *  ever shows them their own). */
async function getViewed(): Promise<Map<number, number>> {
  const supabase = createClient();
  const { data } = await supabase.from("wiki_views").select("page_id, viewed_at").limit(1000);
  return new Map(
    ((data ?? []) as { page_id: number; viewed_at: string }[]).map((v) => [v.page_id, new Date(v.viewed_at).getTime()]),
  );
}

/** Note that this person has opened a page. Best effort: a failure here must
 *  never stop the page from showing. */
export async function touchWikiPage(pageId: number): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.rpc("cr_wiki_touch", { p_page: pageId });
  } catch {
    // ignore
  }
}

export async function getWikiPages(witch: boolean): Promise<WikiListing[]> {
  const supabase = createClient();
  const [{ data }, viewed] = await Promise.all([
    supabase.from("wiki_pages").select(PAGE_COLS).order("title", { ascending: true }).limit(500),
    getViewed(),
  ]);
  const pages = listOrder((data ?? []) as unknown as WikiPage[], viewed);
  if (pages.length === 0) return [];

  const { data: facts } = await supabase
    .from("wiki_facts")
    .select("page_id, status")
    .in("page_id", pages.map((p) => p.id))
    .in("status", witch ? ["kept", "pending"] : ["kept"]);
  const kept = new Map<number, number>();
  const waiting = new Map<number, number>();
  for (const f of (facts ?? []) as { page_id: number; status: string }[]) {
    const m = f.status === "kept" ? kept : waiting;
    m.set(f.page_id, (m.get(f.page_id) ?? 0) + 1);
  }
  return pages.map((p) => ({ ...p, facts: kept.get(p.id) ?? 0, waiting: waiting.get(p.id) ?? 0 }));
}

export async function getWikiPage(slug: string): Promise<WikiPage | null> {
  const supabase = createClient();
  const { data } = await supabase.from("wiki_pages").select(PAGE_COLS).eq("slug", slug).maybeSingle();
  return (data as unknown as WikiPage | null) ?? null;
}

export async function getWikiPageById(id: number): Promise<WikiPage | null> {
  const supabase = createClient();
  const { data } = await supabase.from("wiki_pages").select(PAGE_COLS).eq("id", id).maybeSingle();
  return (data as unknown as WikiPage | null) ?? null;
}

/** The pages that sit under this one, in the order a witch put them (then by title). */
export async function getWikiChildren(id: number): Promise<WikiPage[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("wiki_pages")
    .select(PAGE_COLS)
    .eq("parent_id", id)
    .order("sort")
    .order("title")
    .limit(200);
  return (data ?? []) as unknown as WikiPage[];
}

export type PageTree<T> = { page: T; under: PageTree<T>[] };

/** The listing as a tree: each page that has none of the listed pages above it, with the
 *  listed pages under it, and theirs under them, in the order a witch put them. Pure, so
 *  it can be tested. */
export function nestPages<T extends { id: number; parent_id: number | null; sort: number; title: string }>(
  pages: T[],
): PageTree<T>[] {
  const ids = new Set(pages.map((p) => p.id));
  const under = new Map<number, T[]>();
  for (const p of pages) {
    if (p.parent_id !== null && ids.has(p.parent_id)) under.set(p.parent_id, [...(under.get(p.parent_id) ?? []), p]);
  }
  const byPlace = (a: T, b: T) => a.sort - b.sort || a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  const seen = new Set<number>();
  const branch = (p: T): PageTree<T> => {
    seen.add(p.id);
    const kids = [...(under.get(p.id) ?? [])].filter((c) => !seen.has(c.id)).sort(byPlace);
    return { page: p, under: kids.map(branch) };
  };
  return pages.filter((p) => p.parent_id === null || !ids.has(p.parent_id)).map(branch);
}

/** The facts on a page this person may see: every kept one, plus their own
 *  waiting or returned ones (a witch sees all). The database decides which —
 *  see wiki_facts_read. */
export async function getWikiFacts(pageId: number): Promise<WikiFact[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("wiki_facts")
    .select(FACT_COLS)
    .eq("page_id", pageId)
    .order("created_at", { ascending: true })
    .limit(1000);
  return (data ?? []) as unknown as WikiFact[];
}

export type WaitingFact = WikiFact & { page: { id: number; slug: string; title: string } };

/** Every fact waiting for a witch to read, oldest first. Witches only: anyone
 *  else would get back only their own, which is why callers check is_witch. */
export async function getWaitingFacts(): Promise<WaitingFact[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("wiki_facts")
    .select(`${FACT_COLS}, page:wiki_pages!wiki_facts_page_id_fkey(id, slug, title)`)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(200);
  return (data ?? []) as unknown as WaitingFact[];
}

export type WikiHit = WikiPage & { in: "title" | "address" | "fact"; fact?: string };

/** Pages whose title, address or kept facts contain what was typed — title
 *  matches first. Plain queries merged, not one filter string, so nothing typed
 *  is ever read as query syntax. Archived pages come back only to witches (the
 *  database decides that, not this function). */
export async function searchWikiPages(q: string): Promise<WikiHit[]> {
  const needle = escapeLike(q);
  if (!needle) return [];
  const pattern = `%${needle}%`;
  const supabase = createClient();

  const byPage = (column: "title" | "slug") =>
    supabase.from("wiki_pages").select(PAGE_COLS).ilike(column, pattern).order("title").limit(50);
  const [byTitle, bySlug, byFact] = await Promise.all([
    byPage("title"),
    byPage("slug"),
    supabase.from("wiki_facts").select("page_id, body").eq("status", "kept").ilike("body", pattern).limit(50),
  ]);

  const seen = new Set<number>();
  const hits: WikiHit[] = [];
  const add = (rows: unknown, where: "title" | "address") => {
    for (const r of (rows ?? []) as unknown as WikiPage[]) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      hits.push({ ...r, in: where });
    }
  };
  add(byTitle.data, "title");
  add(bySlug.data, "address");

  const factRows = ((byFact.data ?? []) as { page_id: number; body: string }[]).filter((f) => !seen.has(f.page_id));
  if (factRows.length) {
    const { data: pages } = await supabase
      .from("wiki_pages")
      .select(PAGE_COLS)
      .in("id", [...new Set(factRows.map((f) => f.page_id))]);
    const byId = new Map(((pages ?? []) as unknown as WikiPage[]).map((p) => [p.id, p]));
    for (const f of factRows) {
      const p = byId.get(f.page_id);
      if (!p || seen.has(p.id)) continue;
      seen.add(p.id);
      hits.push({ ...p, in: "fact", fact: f.body });
    }
  }
  return hits.slice(0, 50);
}
