"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EDGE, setFlash } from "@/lib/flash";
import { COSTS } from "@/lib/crystr";
import { SLUG, slugify } from "@/lib/wiki-slug";
import { INVISIBLE, FACT_MAX_WORDS_TEXT, FACT_REVIEW_MAX_WORDS, cleanFact, factProblem } from "@/lib/wiki-fact";

type Rpc = {
  ok: boolean;
  code?: string;
  slug?: string;
  cost?: number;
  need?: number;
  have?: number;
  reworded?: boolean;
  kept?: boolean;
};

async function call(fn: string, args: Record<string, unknown>): Promise<Rpc> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    console.error(`${fn}:`, error.message);
    return { ok: false, code: "error" };
  }
  return (data ?? { ok: false, code: "error" }) as Rpc;
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").replace(INVISIBLE, "").trim();

async function wentWrong() {
  await setFlash("SOMETHING WENT WRONG", "That one is on us. Give it another try.", EDGE.mag);
}

/** A witch starts a page. */
export async function createWikiPage(fd: FormData) {
  const title = str(fd, "title");
  const slug = str(fd, "slug") || slugify(title);
  const slots = Math.max(2, Math.min(60, Number(fd.get("slots")) || 6));
  const parent = Number(fd.get("parent")) || null;

  if (!SLUG.test(slug)) {
    await setFlash("BAD ADDRESS", "A page address is lowercase letters, numbers and single dashes.", EDGE.mag);
    return;
  }

  const r = await call("cr_wiki_create_page", { p_slug: slug, p_title: title, p_slots: slots, p_parent: parent });
  if (!r.ok) {
    if (r.code === "taken") await setFlash("TAKEN", "A page already lives at that address.", EDGE.mag);
    else if (r.code === "bad_parent") await setFlash("NO SUCH PAGE", "The page it would sit under is not there.", EDGE.mag);
    else if (r.code === "no_title") await setFlash("NO TITLE", "Give the page a name first.", EDGE.mag);
    else if (r.code === "bad_slug") await setFlash("BAD ADDRESS", "A page address is lowercase letters, numbers and single dashes.", EDGE.mag);
    else if (r.code === "forbidden") await setFlash("NOT YOURS", "Only witches start pages.", EDGE.mag);
    else await wentWrong();
    return;
  }

  await setFlash("PAGE STARTED", "It is on the shelf, with room for the City to fill in.", EDGE.blue);
  revalidatePath("/wiki");
  redirect(`/wiki/${r.slug ?? slug}`);
}

/** Anyone signed in adds a handful of words to an open slot. */
export async function addFact(fd: FormData) {
  const page = Number(fd.get("page"));
  // A slot means changing words already sent from that place; none means "add something new".
  const rawSlot = String(fd.get("slot") ?? "").trim();
  const slot = rawSlot ? Number(rawSlot) : null;
  const slug = str(fd, "slug");
  const text = cleanFact(String(fd.get("text") ?? ""));
  const form = slot ? `/wiki/${slug}/add/${slot}` : `/wiki/${slug}/add`;

  const problem = factProblem(text);
  if (problem === "empty") {
    await setFlash("NOTHING YET", "Write a few words first.", EDGE.mag);
    redirect(form);
  }
  if (problem === "too_long") {
    await setFlash("A HANDFUL, PLEASE", `Keep it to a few key words: up to ${FACT_MAX_WORDS_TEXT}, on one line.`, EDGE.mag);
    redirect(form);
  }

  const r = await call("cr_wiki_add_fact", { p_page: page, p_slot: slot, p_body: text });
  if (!r.ok) {
    if (r.code === "insufficient") {
      await setFlash("REST FIRST", `Adding a fact takes ${r.need ?? COSTS.wikiEdit}, and you have ${r.have ?? 0}. Recover at the Well and it will be here when you are back.`, EDGE.mag);
      redirect(form);
    } else if (r.code === "settled") {
      await setFlash("ALREADY FILLED", "A witch has already kept a fact for that spot. Try adding something new instead.", EDGE.purple);
    } else if (r.code === "locked") {
      await setFlash("PAUSED", "A witch has paused this page for now.", EDGE.purple);
    } else if (r.code === "too_long") {
      await setFlash("A HANDFUL, PLEASE", `Keep it to a few key words: up to ${FACT_MAX_WORDS_TEXT}, on one line.`, EDGE.mag);
      redirect(form);
    } else if (r.code === "missing") {
      await setFlash("GONE", "That spot is no longer there.", EDGE.mag);
    } else await wentWrong();
    redirect(`/wiki/${slug}`);
  }

  await setFlash(
    "ADDED",
    r.kept
      ? "It is on the page now. A witch's words need no approval."
      : r.reworded
      ? "Your words are updated. A witch will read them."
      : `That took ${r.cost ?? COSTS.wikiEdit} out of you. A witch will read it; until then only you and the witches can see it.`,
    EDGE.blue,
  );
  revalidatePath(`/wiki/${slug}`);
  revalidatePath("/wiki");
  redirect(`/wiki/${slug}`);
}

/** Anyone: start a page under the one they were adding to, for 40 mana, their words its
 *  first fact. It opens at once. */
export async function addSubpage(fd: FormData) {
  const page = Number(fd.get("page"));
  const parentSlug = str(fd, "slug");
  const title = str(fd, "title").slice(0, 120);
  const slug = slugify(title);
  const text = cleanFact(String(fd.get("text") ?? ""));
  const form = `/wiki/${parentSlug}/add`;

  if (!title) {
    await setFlash("NO TITLE", "Give the new page a name first.", EDGE.mag);
    redirect(form);
  }
  if (!SLUG.test(slug)) {
    await setFlash("BAD ADDRESS", "A page name needs some letters or numbers in it.", EDGE.mag);
    redirect(form);
  }
  const problem = factProblem(text);
  if (problem === "empty") {
    await setFlash("NOTHING YET", "Write a few words first: they are the page's first fact.", EDGE.mag);
    redirect(form);
  }
  if (problem === "too_long") {
    await setFlash("A HANDFUL, PLEASE", `Keep it to a few key words: up to ${FACT_MAX_WORDS_TEXT}, on one line.`, EDGE.mag);
    redirect(form);
  }

  const r = await call("cr_wiki_add_subpage", { p_parent: page, p_title: title, p_slug: slug, p_body: text });
  if (!r.ok) {
    if (r.code === "insufficient") {
      await setFlash("REST FIRST", `Starting a page takes ${r.need ?? COSTS.wikiSubpage}, and you have ${r.have ?? 0}. Recover at the Well and it will be here when you are back.`, EDGE.mag);
    } else if (r.code === "taken") {
      await setFlash("TAKEN", "A page already lives at that name. Pick another.", EDGE.mag);
    } else if (r.code === "locked") {
      await setFlash("PAUSED", "A witch has paused this page for now.", EDGE.purple);
    } else if (r.code === "too_long") {
      await setFlash("A HANDFUL, PLEASE", `Keep it to a few key words: up to ${FACT_MAX_WORDS_TEXT}, on one line.`, EDGE.mag);
    } else if (r.code === "missing") {
      await setFlash("GONE", "That page is no longer there.", EDGE.mag);
      redirect("/wiki");
    } else await wentWrong();
    redirect(form);
  }

  await setFlash("A PAGE OF YOUR OWN", `That took ${r.cost ?? COSTS.wikiSubpage} out of you. It is on the shelf under ${parentSlug.replace(/-/g, " ")}, with your words on it.`, EDGE.blue);
  revalidatePath(`/wiki/${parentSlug}`);
  revalidatePath("/wiki");
  redirect(`/wiki/${r.slug ?? slug}`);
}

/** Witches: keep a waiting fact (optionally in their own words), or send it back. */
export async function reviewFact(fd: FormData) {
  const id = Number(fd.get("id"));
  const keep = str(fd, "act") === "keep";
  const text = cleanFact(String(fd.get("text") ?? ""));

  if (keep && factProblem(text, FACT_REVIEW_MAX_WORDS)) {
    await setFlash("A HANDFUL, PLEASE", "Keep it to a few key words: up to ten, on one line.", EDGE.mag);
    return;
  }
  const r = await call("cr_wiki_review_fact", {
    p_fact: id,
    p_keep: keep,
    p_body: keep ? text : null,
    p_note: str(fd, "note"),
  });
  if (!r.ok) {
    if (r.code === "forbidden") await setFlash("NOT YOURS", "Only witches read what is added.", EDGE.mag);
    else if (r.code === "settled") await setFlash("ALREADY KEPT", "Another fact was kept for that spot first.", EDGE.purple);
    else if (r.code === "missing") await setFlash("GONE", "That one has already been read.", EDGE.purple);
    else if (r.code === "too_long") await setFlash("A HANDFUL, PLEASE", "Keep it to a few key words: up to ten, on one line.", EDGE.mag);
    else await wentWrong();
  } else if (!r.kept) {
    await setFlash("SENT BACK", "Returned to its writer.", EDGE.purple);
  } else {
    await setFlash("KEPT", "It is part of the page now.", EDGE.blue);
  }
  revalidatePath("/wiki/to-read");
  revalidatePath("/wiki");
  if (r.slug) revalidatePath(`/wiki/${r.slug}`);
}

/** Witches: take a kept fact down. Its spot opens again. */
export async function removeFact(fd: FormData) {
  const r = await call("cr_wiki_remove_fact", { p_fact: Number(fd.get("id")) });
  if (!r.ok) await setFlash("NOT YOURS", "Only witches take facts down.", EDGE.mag);
  else await setFlash("TAKEN DOWN", "The spot is open again.", EDGE.purple);
  const slug = str(fd, "slug");
  revalidatePath(`/wiki/${slug}`);
  revalidatePath("/wiki");
}

/** Witches: a kept fact one place up or down the page. */
export async function moveFact(fd: FormData) {
  const r = await call("cr_wiki_move_fact", { p_fact: Number(fd.get("id")), p_dir: str(fd, "dir") === "up" ? -1 : 1 });
  if (!r.ok) await setFlash("NOT YOURS", "Only witches arrange the page.", EDGE.mag);
  revalidatePath(`/wiki/${str(fd, "slug")}`);
}

/** Witches: a sub page one place up or down among its neighbours. */
export async function movePage(fd: FormData) {
  const r = await call("cr_wiki_move_page", { p_page: Number(fd.get("id")), p_dir: str(fd, "dir") === "up" ? -1 : 1 });
  if (!r.ok) await setFlash("NOT YOURS", "Only witches arrange the shelf.", EDGE.mag);
  revalidatePath(`/wiki/${str(fd, "slug")}`);
  revalidatePath("/wiki");
}

/** Witches: put a page under another, or out on its own. */
export async function setParent(fd: FormData) {
  const slug = str(fd, "slug");
  const parent = Number(fd.get("parent")) || null;
  const r = await call("cr_wiki_set_parent", { p_page: Number(fd.get("id")), p_parent: parent });
  if (!r.ok) {
    if (r.code === "circular") await setFlash("IN A LOOP", "A page cannot sit under itself, or under a page that sits under it.", EDGE.mag);
    else if (r.code === "forbidden") await setFlash("NOT YOURS", "Only witches arrange the shelf.", EDGE.mag);
    else await wentWrong();
  } else {
    await setFlash("MOVED", parent ? "It sits under that page now." : "It stands on its own now.", EDGE.purple);
  }
  revalidatePath(`/wiki/${slug}`);
  revalidatePath("/wiki");
}

/** Witches: lock or unlock, archive or restore. */
export async function moderateWikiPage(fd: FormData) {
  const id = Number(fd.get("id"));
  const slug = str(fd, "slug");
  const act = str(fd, "act");

  const args =
    act === "lock" ? { p_locked: true, p_archived: null }
    : act === "unlock" ? { p_locked: false, p_archived: null }
    : act === "archive" ? { p_locked: null, p_archived: true }
    : act === "restore" ? { p_locked: null, p_archived: false }
    : null;
  if (!args) return;

  const r = await call("cr_wiki_moderate", { p_id: id, ...args });
  if (!r.ok) {
    await setFlash("NOT YOURS", "Only witches moderate the wiki.", EDGE.mag);
  } else {
    const done = { lock: "LOCKED", unlock: "UNLOCKED", archive: "ARCHIVED", restore: "RESTORED" }[act]!;
    await setFlash(done, act === "archive" ? "Hidden from everyone but witches." : "Done.", EDGE.purple);
  }
  revalidatePath(`/wiki/${slug}`);
  revalidatePath("/wiki");
  if (act === "archive") redirect("/wiki");
}
