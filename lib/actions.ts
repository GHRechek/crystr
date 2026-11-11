"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { retintCreature } from "@/lib/sprites.server";
import type { Element as HkElement } from "@/lib/historikals";
import { createClient } from "@/lib/supabase/server";
import { setFlash, EDGE } from "@/lib/flash";
import { TERMS_VERSION } from "@/lib/terms";
import { INVISIBLE } from "@/lib/wiki-fact";
import { DEFAULT_BANNER, isPattern, isSwatch } from "@/lib/banner";
import { COSTS, hasStarterHandle, untilReady } from "@/lib/crystr";
import { faceSrc, normalizePortrait, portraitFromId, packPortrait } from "@/lib/portrait/core";
import { normalizeToken, unpackToken } from "@/lib/token";
import { SPECIES } from "@/lib/species";
import { pictureFor } from "@/lib/article-icons";
import { composeBirthday } from "@/lib/birthday";
import { listBadges, ROMAN } from "@/lib/badges";
import { PLAINTIFF_ERRORS, type PlaintiffError } from "@/lib/plaintiff";
import { BREACH_COOKIE, KEY_PATTERN } from "@/lib/breach";

type Rpc = {
  ok: boolean;
  code?: string;
  need?: number;
  have?: number;
  id?: number;
  cost?: number;
  mana?: number;
  reward?: number;
  thread_id?: number;
  motion_id?: number;
  briefing_id?: number;
  status?: string;
  kind?: string;
  ready_at?: string;
  unchanged?: boolean;
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

/** Badges earned, or stepped up a tier, since the person last heard, as a sentence or two
 *  to add to a message ("" when there is nothing). Asking marks them as told, so each is
 *  announced once. */
async function newBadges(): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("cr_claim_new_badges");
  if (error || !Array.isArray(data) || data.length === 0) return "";
  const rows = data as { title: string; tier?: number | null }[];
  const fresh = rows.filter((b) => !b.tier || b.tier <= 1).map((b) => b.title);
  const up = rows.filter((b) => (b.tier ?? 1) > 1).map((b) => `${b.title} ${ROMAN[b.tier ?? 1] ?? ""}`.trim());
  let out = "";
  if (fresh.length) out += ` You earned a badge: ${listBadges(fresh)}.`;
  if (up.length) out += ` A badge stepped up: ${listBadges(up)}.`;
  return out;
}

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").replace(INVISIBLE, "").trim();
}

/** The house message for "you cannot afford this", with the shortfall. */
async function broke(r: Rpc, line: string) {
  await setFlash("REST FIRST", line.replace("{have}", String(r.have ?? 0))
    .replace("{short}", String(Math.max(0, (r.need ?? 0) - (r.have ?? 0)))), EDGE.mag);
}

async function wentWrong() {
  await setFlash("SOMETHING WENT WRONG", "That one is on us. Give it another try.", EDGE.mag);
}

// ------------------------------------------------------------------- feed

export async function createPost(fd: FormData) {
  const body = str(fd, "body");
  // The picture, if any, is already in the person's own folder of the proofs bucket; the database checks that.
  const image = str(fd, "image_path") || null;
  const hasImage = !!image || fd.get("has_image") === "on" || fd.get("has_image") === "true";

  const r = await call("cr_create_post", { p_body: body, p_has_image: hasImage, p_badge: str(fd, "badge") || null, p_image: image });

  if (!r.ok) {
    if (r.code === "empty") {
      await setFlash("DECLINED", "There is nothing here yet. Write a few words first.", EDGE.mag);
    } else if (r.code === "insufficient") {
      await broke(r, "You are {short} short of the strength for that. A little time at the Well will help.");
    } else if (r.code === "have_it") {
      await setFlash("ALREADY YOURS", "You have that badge already.", EDGE.purple);
    } else if (r.code === "bad_image") {
      await setFlash("NO PICTURE", "The picture did not arrive. Attach it again, then publish.", EDGE.mag);
    } else {
      await wentWrong();
    }
    return;
  }

  await setFlash("POSTED", `That took ${r.cost} out of you. Nicely said.${await newBadges()}`, EDGE.mag);
  revalidatePath("/");
  redirect("/");
}

export async function likePost(fd: FormData) {
  const r = await call("cr_like_post", { p_post_id: Number(fd.get("post_id")) });

  if (!r.ok) {
    if (r.code === "already") {
      await setFlash("ALREADY LIKED", "You have already liked this one.", EDGE.purple);
    } else if (r.code === "insufficient") {
      await setFlash("REST FIRST", "You are fully out of mana. The Well is the place to recover.", EDGE.mag);
    } else {
      await wentWrong();
    }
  }
  revalidatePath("/");
  const back = fd.get("thread");
  if (back) revalidatePath(`/thread/${Number(back)}`);
}

/** Take your like back. The mana is not refunded; liking again costs again. */
export async function unlikePost(fd: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const id = Number(fd.get("post_id"));
  if (!user || !Number.isInteger(id)) {
    await wentWrong();
    return;
  }
  const { error } = await supabase.from("post_likes").delete().eq("post_id", id).eq("user_id", user.id);
  if (error) {
    console.error("unlikePost:", error.message);
    await wentWrong();
  }
  revalidatePath("/");
  const back = fd.get("thread");
  if (back) revalidatePath(`/thread/${Number(back)}`);
}

export async function createReply(fd: FormData) {
  const parent = Number(fd.get("parent_id"));
  const r = await call("cr_create_reply", { p_parent: parent, p_body: str(fd, "body") });

  if (!r.ok) {
    if (r.code === "empty") {
      await setFlash("DECLINED", "There is nothing here yet. Write a few words first.", EDGE.mag);
    } else if (r.code === "insufficient") {
      await broke(r, "You are {short} short of the strength for a reply. The Well will help.");
    } else if (r.code === "missing") {
      await setFlash("GONE", "That post is no longer there to answer. Somebody unsaid it.", EDGE.mag);
      redirect("/");
    } else {
      await wentWrong();
    }
    return;
  }

  await setFlash("REPLIED", `That took ${r.cost} out of you. Your reply is on the thread.${await newBadges()}`, EDGE.mag);
  revalidatePath("/");
  revalidatePath(`/thread/${parent}`);
  redirect(`/thread/${parent}`);
}

export async function voiceLocked() {
  await setFlash("LOCKED", "Voice notes are not open yet. They will take a lot out of you, so we are keeping them for later.", EDGE.purple);
  revalidatePath("/post");
}

// ------------------------------------------------------------------- well

export async function submitQuest(fd: FormData) {
  const slug = str(fd, "slug");
  const r = await call("cr_submit_quest", {
    p_slug: slug,
    p_note: str(fd, "note") || null,
    p_proof_url: str(fd, "proof_url") || null,
  });

  if (!r.ok) {
    if (r.code === "no_proof") {
      await setFlash(
        "NO PROOF",
        "The Well needs something to go on. Add a drawing or a photo where it asks for one, or write down what you did.",
        EDGE.mag,
      );
    } else if (r.code === "too_soon" || r.code === "no_timer") {
      await setFlash(
        "NOT YET",
        "The timer has to run all the way through first. Go to the quest and begin it again.",
        EDGE.mag,
      );
    } else if (r.code === "repeat") {
      await setFlash(
        "SAY IT NEW",
        "You have already told the Well exactly that. Put this time in your own words.",
        EDGE.mag,
      );
    } else if (r.code === "full") {
      await setFlash(
        "ALREADY FULL",
        "You are as full as you can be right now. Come back when you have spent a little, and this will still be waiting.",
        EDGE.purple,
      );
    } else if (r.code === "cooldown") {
      await setFlash(
        "TOO SOON",
        `You have brought this one in recently. It will be ready again in ${untilReady(r.ready_at!)}.`,
        EDGE.mag,
      );
    } else {
      await wentWrong();
    }
    revalidatePath(`/well/${slug}`);
    return;
  }

  await setFlash(
    "ACCEPTED",
    `${r.reward} mana restored. Well done. Look after yourself.`,
    EDGE.blue,
  );
  revalidatePath("/well");
  revalidatePath("/");
  // Someone not yet registered came for mana to read the registry by: straight back to it, with the
  // mana, rather than through the feed (which they cannot enter yet).
  const sb = createClient();
  const { data: { user: u } } = await sb.auth.getUser();
  const { data: who } = u ? await sb.from("profiles").select("onboarded").eq("id", u.id).single() : { data: null };
  if (who && who.onboarded === false) redirect("/welcome");
  // Handed in. Offer to show it to the City before heading back.
  redirect(`/well/${slug}/share`);
}

/** Turn a hand-in into a post, with something said about it. Free: the Well already asked
 *  enough of you. Passing (no caption, no post) goes back to the feed. */
export async function shareQuest(fd: FormData) {
  const slug = str(fd, "slug");
  const caption = str(fd, "caption").slice(0, 500);
  if (str(fd, "skip") === "1") redirect("/");

  const r = await call("cr_share_quest", { p_submission: Number(fd.get("submission")), p_caption: caption });
  if (!r.ok) {
    if (r.code === "already") await setFlash("ALREADY SHARED", "That one is already on the feed.", EDGE.purple);
    else await wentWrong();
    redirect("/");
  }
  const note = await newBadges();
  await setFlash("POSTED", `It is on the feed now.${note}`, EDGE.blue);
  revalidatePath("/");
  redirect("/");
}

// --------------------------------------------------------------- whispers

export async function openThread(fd: FormData) {
  const r = await call("cr_open_thread", { p_other: str(fd, "other_id") });
  if (!r.ok) {
    await wentWrong();
    return;
  }
  revalidatePath("/whispers");
  redirect(`/whispers/${r.thread_id}`);
}

export async function sendWhisper(fd: FormData) {
  const threadId = Number(fd.get("thread_id"));
  const image = str(fd, "image_path") || null;
  const reply = Number(fd.get("reply_to")) || null;
  const r = await call("cr_send_message", {
    p_thread_id: threadId,
    p_body: str(fd, "body"),
    p_image: image,
    p_reply: reply,
  });

  if (!r.ok) {
    if (r.code === "empty") {
      await setFlash("EMPTY", "Nothing to send yet. Write a few words, or add a picture.", EDGE.purple);
    } else if (r.code === "insufficient") {
      await broke(r, `A whisper takes ${COSTS.whisper}, and you have {have}. Recover at the Well and it will be here when you are back.`);
    } else if (r.code === "bad_image") {
      await setFlash("PICTURE LOST", "That picture did not make it. Please add it again.", EDGE.mag);
    } else {
      await wentWrong();
    }
    revalidatePath(`/whispers/${threadId}`);
    return;
  }

  const note = await newBadges();
  if (note) await setFlash("NEW BADGE", note.trim(), EDGE.blue);
  revalidatePath(`/whispers/${threadId}`);
  // Back to the plain conversation, which also puts down any "replying to".
  redirect(`/whispers/${threadId}`);
}

/** Save which of their badges a person shows on their profile (up to five, in order). The
 *  database keeps only what they have earned or hold. */
export async function setShownBadges(fd: FormData) {
  let list: unknown = [];
  try {
    list = JSON.parse(str(fd, "list") || "[]");
  } catch {
    list = [];
  }
  const r = await call("cr_set_shown_badges", { p_list: Array.isArray(list) ? list.filter((x) => typeof x === "string").slice(0, 5) : [] });
  if (!r.ok) await wentWrong();
  else await setFlash("SAVED", "Your badges are on show.", EDGE.blue);
  revalidatePath("/me");
  redirect("/me");
}

/** Save the display from the Historikals menu, as you edit your lineup: no flash, no redirect. */
export async function setLineup(list: string[]) {
  const r = await call("cr_set_shown_badges", { p_list: Array.isArray(list) ? list.filter((x) => typeof x === "string").slice(0, 5) : [] });
  revalidatePath("/me");
  return !!r.ok;
}

/** Save the four badges on your star row, in order. The database keeps only ones you have earned. */
export async function setStarBadges(fd: FormData) {
  let list: unknown = [];
  try {
    list = JSON.parse(str(fd, "list") || "[]");
  } catch {
    list = [];
  }
  const r = await call("cr_set_star_badges", { p_list: Array.isArray(list) ? list.filter((x) => typeof x === "string").slice(0, 4) : [] });
  if (!r.ok) await wentWrong();
  else await setFlash("SAVED", "Your star badges are on show.", EDGE.blue);
  revalidatePath("/me");
  redirect("/me");
}

/** Save which badges a person says they are working on (up to five, in order). */
export async function setWorkingOn(fd: FormData) {
  let list: unknown = [];
  try {
    list = JSON.parse(str(fd, "list") || "[]");
  } catch {
    list = [];
  }
  const r = await call("cr_set_working_on", { p_list: Array.isArray(list) ? list.filter((x) => typeof x === "string").slice(0, 5) : [] });
  if (!r.ok && r.code === "first_steps") await setFlash("FINISH YOUR FIRST STEPS", "Do all five first steps, and then you can pick your main quests.", EDGE.purple);
  else if (!r.ok) await wentWrong();
  else await setFlash("SAVED", `Your list of what you are working on is updated.${await newBadges()}`, EDGE.blue);
  revalidatePath("/me");
  redirect("/me");
}

/** Send a post to someone in a whisper, with a note if you like. Costs what a whisper costs. */
export async function sendPost(fd: FormData) {
  const post = Number(fd.get("post_id"));
  const back = `/thread/${post}/send`;
  const r = await call("cr_send_post", {
    p_post: post,
    p_other: str(fd, "other_id"),
    p_note: str(fd, "note"),
  });
  if (!r.ok) {
    if (r.code === "insufficient") {
      await broke(r, `Sending a post takes ${COSTS.whisper}, and you have {have}. Recover at the Well and it will be here when you are back.`);
    } else if (r.code === "no_post") {
      await setFlash("POST GONE", "That post is not there any more.", EDGE.purple);
    } else {
      await wentWrong();
    }
    revalidatePath(back);
    return;
  }
  const note = await newBadges();
  await setFlash("SENT", `The post is in your whisper.${note}`, EDGE.blue);
  revalidatePath("/whispers");
  redirect(`/whispers/${r.thread_id}`);
}

/** React to a message, or take the reaction back by choosing the same one again. */
export async function reactToMessage(fd: FormData) {
  const threadId = Number(fd.get("thread_id"));
  const r = await call("cr_react", { p_message: Number(fd.get("message_id")), p_emoji: str(fd, "emoji") });
  if (!r.ok) await wentWrong();
  revalidatePath(`/whispers/${threadId}`);
}

/** Take back something you said. The words and the picture are gone for both people. */
export async function unsendMessage(fd: FormData) {
  const threadId = Number(fd.get("thread_id"));
  const supabase = createClient();
  const { data, error } = await supabase.rpc("cr_unsend", { p_message: Number(fd.get("message_id")) });
  const r = data as { ok?: boolean; code?: string; image?: string | null } | null;
  if (r?.code === "held") {
    await setFlash("HELD", "This was marked too much or reported, so it stays.", EDGE.mag);
  } else if (error || !r?.ok) {
    await wentWrong();
  } else {
    // Clear the stored picture too, if there was one (best effort: the message itself is already gone).
    if (r.image) await supabase.storage.from("whispers").remove([r.image]).catch(() => {});
    await setFlash("UNSENT", "It is gone for both of you.", EDGE.purple);
  }
  revalidatePath(`/whispers/${threadId}`);
}

// ------------------------------------------------------------- plaintiffs

/** The welcome page: their own name (kept with the registry, for witches), their username and
 *  character name, then the registry (birthday, district and species codes). Nothing is
 *  changed unless the names are acceptable; the codes are checked in the database. On
 *  success the person is in and goes to the timeline. */
export async function completeWelcome(fd: FormData): Promise<PlaintiffError | undefined> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("avatar_config, handle").eq("id", user.id).single();
  if (!me?.avatar_config) {
    return { field: "face", message: "Make your face first. The button is at the top of this page." };
  }

  const name = str(fd, "name").slice(0, 120);
  if (!name) return { field: "name", message: "Your name, please. The real one." };
  const handle = str(fd, "handle").toLowerCase().replace(/[^a-z0-9_.-]/g, "");
  if (!handle || hasStarterHandle(handle)) return { field: "handle", message: "Pick a username: what the City will call you." };
  if (handle.length > 15) return { field: "handle", message: "Usernames are fifteen characters at most." };
  const display = field(fd, "display_name");
  if (!display) return { field: "display_name", message: "Your character needs a name." };
  const birthday = composeBirthday(str(fd, "birth_day"), str(fd, "birth_month"), str(fd, "birth_year"));
  if (birthday === "bad") return PLAINTIFF_ERRORS.bad_birthday;
  if (!birthday) return { field: "birthday", message: "The registry needs your birthday." };

  const { error } = await supabase
    .from("profiles")
    .update({ handle, display_name: display, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) {
    return {
      field: "handle",
      message: error.code === "23505" ? "Someone in the City already answers to that. Pick another." : "That did not save. Please try again.",
    };
  }

  const r = await call("cr_register", {
    p_district: str(fd, "district"),
    p_district_code: str(fd, "district_code"),
    p_species: str(fd, "species"),
    p_species_code: str(fd, "species_code"),
    p_spellcaster: fd.get("spellcaster") === "on",
    p_arcn: str(fd, "arcn"),
    p_birthday: birthday,
    p_name: name,
  });
  if (!r.ok) {
    const known = PLAINTIFF_ERRORS[r.code as keyof typeof PLAINTIFF_ERRORS];
    if (known) return known;
    return { field: "form", message: "That one is on us. Give it another try." };
  }

  await setFlash("WELCOME", `You are on the City's books.${await newBadges()}`, EDGE.blue);
  revalidatePath("/", "layout");
  redirect("/");
}

// ----------------------------------------------------------------- vouches

/** "We met up" / "I helped them", said inside a whisper thread. */
export async function claimVouch(fd: FormData) {
  const thread = Number(fd.get("thread_id"));
  const kind = str(fd, "kind");
  const r = await call("cr_claim_vouch", { p_kind: kind, p_other: str(fd, "other_id") });

  if (!r.ok) {
    if (r.code === "already") {
      await setFlash("ALREADY SAID", "That one is already waiting, or already confirmed.", EDGE.purple);
    } else if (r.code === "no_thread") {
      await setFlash("WHISPER FIRST", "Send them a whisper first, so there is a thread to say it in.", EDGE.purple);
    } else {
      await wentWrong();
    }
  } else {
    await setFlash(
      "ASKED",
      kind === "meetup"
        ? "They will see a note asking whether you met up. If they say yes, you both earn a badge."
        : "They will see a note asking whether you helped. If they say yes, it counts: each help earns them a Historikal.",
      EDGE.blue,
    );
  }
  revalidatePath(`/whispers/${thread}`);
}

/** The other person says yes, or not quite. */
export async function answerVouch(fd: FormData) {
  const yes = str(fd, "answer") === "yes";
  const r = await call("cr_answer_vouch", { p_id: Number(fd.get("id")), p_yes: yes });

  if (!r.ok) {
    await setFlash("ALREADY ANSWERED", "That note is no longer waiting for you.", EDGE.purple);
  } else if (yes) {
    await setFlash("THANK YOU", `Confirmed.${await newBadges()}`, EDGE.blue);
  } else {
    await setFlash("NO WORRIES", "Left as it was.", EDGE.purple);
  }
  revalidatePath("/", "layout");
}

/** Agree to the terms. Everything behind the gate waits on this. */
export async function acceptTerms(fd: FormData) {
  if (fd.get("agree") !== "on") redirect("/terms");
  const r = await call("cr_accept_tos", { p_version: TERMS_VERSION });
  if (!r.ok) {
    await wentWrong();
    redirect("/terms");
  }
  // Someone new goes straight to the registry; anyone else back in.
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = user ? await supabase.from("profiles").select("onboarded").eq("id", user.id).single() : { data: null };
  redirect(me && me.onboarded === false ? "/welcome" : "/");
}

// ---------------------------------------------------------------- the override

/** A witch's key scanned from the registry (CONTACT YOUR LOCAL CRYSTR ADMINISTRATOR): it goes in the
 *  cookie the breach reads, as if they'd opened the witch's code with their own camera, and on to the
 *  breach, which checks it's a witch's. A profile scan is a handle; an old override key is a code. */
export async function scanRegistryKey(key: string, species?: string): Promise<string | null> {
  const jar = await cookies();
  const opts = { path: "/", maxAge: 30 * 60, httpOnly: true, sameSite: "lax" as const };
  // What they said they are: an undead or planar stays that once let in; anything else is Forsaken.
  jar.set("crystr.species", species === "undead" || species === "planar" ? species : "", opts);
  if (KEY_PATTERN.test(key)) {
    jar.set(BREACH_COOKIE, key, opts);
  } else if (/^[a-z0-9_.-]{1,40}$/.test(key)) {
    const { data: w } = await createClient().from("profiles").select("handle").eq("handle", key).eq("is_witch", true).maybeSingle();
    if (!w) return "That code isn't a witch's. Only a witch's code opens the City this way.";
    jar.set("crystr.scan", key, opts);
  } else {
    return "That isn't a CRYSTR code.";
  }
  redirect("/breach");
}

/** The break-in: the key waiting in the cookie (put there by /override/<code>) lets this
 *  person into the City with no form filled. On a witch's key they go straight in; on a
 *  code the City does not know, the page says so. */
export async function breachRegistry(): Promise<{ ok: boolean; message?: string }> {
  const jar = await cookies();
  const code = jar.get(BREACH_COOKIE)?.value ?? "";
  const handle = jar.get("crystr.scan")?.value ?? "";
  if (!KEY_PATTERN.test(code) && !/^[a-z0-9_.-]{1,40}$/.test(handle)) return { ok: false, message: "No key here. Scan it again." };
  const species = jar.get("crystr.species")?.value || null;
  const r = KEY_PATTERN.test(code) ? await call("cr_override_onboard", { p_code: code, p_species: species }) : await call("cr_override_witch", { p_handle: handle, p_species: species });
  if (!r.ok) {
    return {
      ok: false,
      message:
        r.code === "unknown"
          ? "This code opens nothing. Contact your local CRYSTR administrator for their key."
          : "The records would not give. Try again.",
    };
  }
  jar.delete(BREACH_COOKIE);
  jar.delete("crystr.scan");
  await setFlash("ACCESS GRANTED", "The registry never saw you. You are in the City.", EDGE.mag);
  revalidatePath("/", "layout");
  redirect("/");
}

/** Send a report on a post or a whisper conversation to the witches. */
export async function submitReport(fd: FormData) {
  const back = str(fd, "back");
  const to = back.startsWith("/") && !back.startsWith("//") ? back : "/";
  const r = await call("cr_submit_report", {
    p_kind: str(fd, "kind"),
    p_target: Number(fd.get("target")),
    p_reason: str(fd, "reason"),
    p_note: (() => {
      // A report made from a held whisper carries that line as it stood, ahead of the note.
      const line = str(fd, "evidence_text").slice(0, 300);
      const lineId = str(fd, "evidence_id");
      const note = str(fd, "note");
      return (lineId ? `[line ${lineId}] "${line}"${note ? ` — ${note}` : ""}` : note).slice(0, 500);
    })(),
  });

  if (r.ok) {
    await setFlash("SENT", "Thank you. The witches will read it. You do not have to do anything else.", EDGE.blue);
  } else if (r.code === "already") {
    await setFlash("ALREADY SENT", "You have already told us about this one, and it is waiting to be read.", EDGE.purple);
  } else if (r.code === "self") {
    await setFlash("THAT IS YOURS", "You cannot report your own words.", EDGE.purple);
  } else if (r.code === "too_many") {
    await setFlash("A LOT TODAY", "You have sent many today. If something is wrong, please speak to an organizer directly.", EDGE.purple);
  } else {
    await wentWrong();
  }
  redirect(to);
}

/** A witch marks a report dealt with, or not needed. */
export async function resolveReport(fd: FormData) {
  const r = await call("cr_resolve_report", {
    p_id: Number(fd.get("id")),
    p_status: str(fd, "act") === "action" ? "actioned" : "dismissed",
    p_note: str(fd, "note"),
  });
  if (!r.ok) await setFlash("ALREADY HANDLED", "That one is no longer waiting.", EDGE.purple);
  revalidatePath("/reports");
}

/** Tell the organizers something is broken. The page it happened on and the browser come
 *  along, so the person does not have to describe them. */
export async function reportBug(fd: FormData) {
  const from = str(fd, "from");
  const page = from.startsWith("/") && !from.startsWith("//") ? from.slice(0, 200) : "";
  const device = ((await headers()).get("user-agent") ?? "").slice(0, 300);
  const r = await call("cr_report_bug", { p_body: str(fd, "body"), p_page: page, p_device: device });

  if (r.ok) {
    await setFlash("THANK YOU", "That is with the organizers now. You do not need to do anything else.", EDGE.blue);
    redirect(page || "/");
  }
  if (r.code === "empty") {
    await setFlash("TELL US MORE", "Write a few words about what went wrong.", EDGE.purple);
  } else if (r.code === "too_many") {
    await setFlash("A LOT TODAY", "You have sent many today. If it is urgent, please speak to an organizer.", EDGE.purple);
  } else {
    await wentWrong();
  }
  redirect(`/bug${page ? `?from=${encodeURIComponent(page)}` : ""}`);
}

/** A witch marks a bug fixed, or closed without a fix. */
export async function resolveBug(fd: FormData) {
  const r = await call("cr_resolve_bug", {
    p_id: Number(fd.get("id")),
    p_status: str(fd, "act") === "fixed" ? "fixed" : "closed",
    p_note: str(fd, "note"),
  });
  if (!r.ok) await setFlash("ALREADY HANDLED", "That one is no longer waiting.", EDGE.purple);
  revalidatePath("/bugs");
}

/** Dismiss the "someone put you in their Top 5" banner. */
export async function seeTopSix() {
  const supabase = createClient();
  const { error } = await supabase.rpc("cr_seen_top_six");
  if (error) console.error("cr_seen_top_six:", error.message);
  revalidatePath("/", "layout");
}

// ------------------------------------------------------------------ votes

/** What a Forsaken hears when a vote comes without a witch's key, or with a code that isn't one. */
const KEY_FLASH = {
  need_key: "Contact a licensed witch or advocate before filing. A Forsaken's vote goes in with a witch's key: scan the QR code on a witch's profile.",
  bad_key: "That code is not a witch's key. A Forsaken's vote goes in with a licensed witch: scan the QR code on a witch's profile.",
} as const;

export async function castVote(fd: FormData) {
  const r = await call("cr_cast_vote", {
    p_motion: Number(fd.get("motion_id")),
    p_side: str(fd, "side"),
    p_key: str(fd, "key") || null,
  });

  if (!r.ok) {
    if (r.code === "insufficient") {
      await broke(r, "A vote takes three, and you have {have}. Your vote will keep. Go and recover, then come back.");
    } else if (r.code === "not_registered") {
      await setFlash("REGISTER FIRST", "Voting is for Registered Plaintiffs. File Form 12-A and you can vote.", EDGE.purple);
      redirect("/me/plaintiff");
    } else if (r.code === "already") {
      await setFlash("COUNTED", "You have already voted on this one, and it cannot be changed.", EDGE.purple);
    } else if (r.code === "closed") {
      await setFlash("CLOSED", "That motion closed while you were deciding. There will be another.", EDGE.purple);
    } else if (r.code === "need_key" || r.code === "bad_key") {
      await setFlash("STOP", KEY_FLASH[r.code], EDGE.purple);
    } else {
      await wentWrong();
    }
  } else {
    await setFlash(
      "RECORDED",
      `Your vote is in, under your name. It takes three out of you and cannot be changed.${await newBadges()}`,
      str(fd, "side") === "for" ? EDGE.mag : EDGE.blue,
    );
  }
  revalidatePath("/ball");
}

/** A second vote on a motion you've voted on: the same side again, counted twice, for 15. */
export async function voteAgain(fd: FormData) {
  const r = await call("cr_vote_again", { p_motion: Number(fd.get("motion_id")), p_key: str(fd, "key") || null });
  if (!r.ok) {
    if (r.code === "insufficient") await broke(r, "A second vote takes fifteen, and you have {have}. Go and recover, then come back.");
    else if (r.code === "already") await setFlash("COUNTED TWICE", "You have already voted twice on this one.", EDGE.purple);
    else if (r.code === "need_key" || r.code === "bad_key") await setFlash("STOP", KEY_FLASH[r.code], EDGE.purple);
    else if (r.code === "closed") await setFlash("CLOSED", "That motion closed while you were deciding. There will be another.", EDGE.purple);
    else await wentWrong();
  } else {
    await setFlash("COUNTED TWICE", `Your second vote is in, the same way as your first. That took fifteen.`, (r as { side?: string }).side === "for" ? EDGE.mag : EDGE.blue);
  }
  revalidatePath("/ball");
}

export async function createMotion(fd: FormData) {
  const r = await call("cr_create_motion", {
    m_kicker: str(fd, "m_kicker"),
    m_title: str(fd, "m_title"),
    m_blurb: str(fd, "m_blurb"),
    m_hours: Number(fd.get("m_hours") || 24),
    b_kicker: str(fd, "b_kicker") || "MOTION BRIEFING",
    b_headline: str(fd, "b_headline"),
    b_standfirst: str(fd, "b_standfirst"),
    b_body: str(fd, "b_body"),
    b_banner: chosenIcon(fd, "b_banner_icon") !== null,
  });

  if (!r.ok) {
    if (r.code === "no_motion") {
      await setFlash("EMPTY", "A motion needs wording before it needs a briefing.", EDGE.mag);
    } else if (r.code === "no_headline") {
      await setFlash("NO HEADLINE", "Give it a headline so the City knows what it is about.", EDGE.mag);
    } else if (r.code === "thin_briefing") {
      await setFlash(
        "TOO THIN",
        "A motion goes to the board with a briefing that explains it. Forty characters is a little short to explain it.",
        EDGE.mag,
      );
    } else if (r.code === "forbidden") {
      await setFlash("NOT YOURS", "Only witches create motions.", EDGE.mag);
    } else if (r.code === "not_registered") {
      await setFlash("REGISTER FIRST", "Creating a motion is for Registered Plaintiffs. File Form 12-A first.", EDGE.purple);
      redirect("/me/plaintiff");
    } else {
      await wentWrong();
    }
    return;
  }

  await attachIcon(r.briefing_id, chosenIcon(fd, "b_banner_icon"));
  await setFlash(
    "CREATED",
    "Your motion is on the board with its briefing attached.",
    EDGE.blue,
  );
  revalidatePath("/vote");
  revalidatePath("/ball");
  revalidatePath("/");
  redirect("/ball?tab=motions");
}

// ------------------------------------------------------------------- ball

/** The icon chosen as an article's picture, if it is one of the icons we have. */
function chosenIcon(fd: FormData, key: string): string | null {
  const slug = str(fd, key);
  return pictureFor(slug) ? slug : null;
}

/** Attach (or clear) the picture on an article just saved. Failure is not fatal: the
 *  article is saved either way. */
async function attachIcon(id: number | undefined, icon: string | null) {
  if (!id) return;
  await call("cr_set_article_icon", { p_id: id, p_icon: icon });
}

export async function submitOpEd(fd: FormData) {
  const r = await call("cr_submit_oped", {
    p_kicker: str(fd, "kicker") || "OP-ED",
    p_headline: str(fd, "headline"),
    p_standfirst: str(fd, "standfirst"),
    p_body: str(fd, "body"),
    p_banner: chosenIcon(fd, "banner_icon") !== null,
  });

  if (!r.ok) {
    if (r.code === "no_headline") {
      await setFlash("NO HEADLINE", "Give it a headline so the City knows what it is about.", EDGE.mag);
    } else if (r.code === "insufficient") {
      await broke(r, `An op-ed takes ${COSTS.oped}, and you have {have}. Recover at the Well and come back to it.`);
    } else {
      await wentWrong();
    }
    return;
  }

  await attachIcon(r.id, chosenIcon(fd, "banner_icon"));
  await setFlash(
    "FILED",
    "Filed. It took six out of you. A witch will read it when they can, so no rush.",
    EDGE.mag,
  );
  revalidatePath("/ball");
  redirect("/ball");
}

export async function saveDispatch(fd: FormData) {
  const idRaw = str(fd, "id");
  const status = str(fd, "status") === "published" ? "published" : "draft";

  const r = await call("cr_save_dispatch", {
    p_id: idRaw ? Number(idRaw) : null,
    p_kicker: str(fd, "kicker"),
    p_headline: str(fd, "headline"),
    p_standfirst: str(fd, "standfirst"),
    p_body: str(fd, "body"),
    p_banner: chosenIcon(fd, "banner_icon") !== null,
    p_status: status,
    p_byline: str(fd, "byline") || null,
  });

  if (!r.ok) {
    if (r.code === "no_headline") {
      await setFlash("NO HEADLINE", "Give it a headline so the City knows what it is about.", EDGE.mag);
    } else if (r.code === "forbidden") {
      await setFlash("NOT YOURS", "Dispatches are a witch's business.", EDGE.mag);
    } else {
      await wentWrong();
    }
    return;
  }

  await attachIcon(r.id, chosenIcon(fd, "banner_icon"));
  if (status === "published") {
    await setFlash(
      "PUBLISHED",
      "It is on the board for the whole City to read.",
      EDGE.blue,
    );
  } else {
    await setFlash("SAVED", "Saved as a draft. Only you can see it.", EDGE.purple);
  }
  revalidatePath("/ball");
  revalidatePath("/");
  redirect("/ball");
}

export async function setArticleStatus(fd: FormData) {
  const id = Number(fd.get("id"));
  const status = str(fd, "status");
  const r = await call("cr_set_article_status", { p_id: id, p_status: status });

  if (!r.ok) {
    if (r.code === "forbidden") {
      await setFlash("NOT YOURS", "Only witches decide what the City is told.", EDGE.mag);
    } else {
      await wentWrong();
    }
    revalidatePath(`/ball/${id}`);
    return;
  }

  if (r.kind === "oped" && status === "published") {
    await setFlash("APPROVED", "Approved and published under their name.", EDGE.blue);
  } else if (status === "returned") {
    await setFlash("RETURNED", "Sent back to the writer.", EDGE.mag);
  } else if (status === "published") {
    await setFlash("PUBLISHED", "Published. The City can read it now.", EDGE.blue);
  } else {
    await setFlash("PULLED", "Taken down from the board.", EDGE.purple);
  }

  revalidatePath("/ball");
  revalidatePath(`/ball/${id}`);
  revalidatePath("/");
  redirect("/ball");
}

// ---------------------------------------------------------------- profile

/** Profile text is held to this many characters (the database holds the same line; the about-me box allows more). */
const PROFILE_FIELD_MAX = 40;
const BIO_MAX = 500;
const field = (fd: FormData, key: string, max = PROFILE_FIELD_MAX) => str(fd, key).slice(0, max) || null;

export async function updateProfile(fd: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const handle = str(fd, "handle").toLowerCase().replace(/[^a-z0-9_.-]/g, "");
  if (!handle) {
    await setFlash("NO NAME", "The City needs something to call you. Pick a handle.", EDGE.mag);
    return;
  }
  if (handle.length > 15) {
    // A handle from before the 15-character rule can stay as it is; a new one cannot.
    const { data: current } = await supabase.from("profiles").select("handle").eq("id", user.id).single();
    if (current?.handle !== handle) {
      await setFlash("TOO LONG", "Handles are fifteen characters at most. Trim it a little.", EDGE.mag);
      return;
    }
  }

  const birthday = composeBirthday(str(fd, "birth_day"), str(fd, "birth_month"), str(fd, "birth_year"));
  if (birthday === "bad") {
    await setFlash("NOT A DAY", "That birthday is not a day that happened. Check the day, the month and the year.", EDGE.mag);
    return;
  }

  // The banner, when the form carries one: the default is stored as none, anything else as chosen.
  const pattern = str(fd, "pattern"), a = str(fd, "a"), b = str(fd, "b");
  const hasBanner = !!(pattern || a || b);
  if (hasBanner && !(isPattern(pattern) && isSwatch(a) && isSwatch(b))) {
    await setFlash("NOT QUITE", "Pick a banner pattern and two colours from the lists.", EDGE.mag);
    return;
  }
  const isDefault = pattern === DEFAULT_BANNER.pattern && a === DEFAULT_BANNER.a && b === DEFAULT_BANNER.b;
  const banner = !hasBanner ? {} : isDefault ? { banner_pattern: null, banner_a: null, banner_b: null } : { banner_pattern: pattern, banner_a: a, banner_b: b };

  const { error } = await supabase
    .from("profiles")
    .update({
      handle,
      ...banner,
      display_name: field(fd, "display_name"),
      pronouns: field(fd, "pronouns", 30),
      bio: field(fd, "bio", BIO_MAX),
      // Left out when the boxes are empty, so a birthday is never cleared by accident.
      ...(birthday ? { birthday } : {}),
      likes: field(fd, "likes"),
      dislikes: field(fd, "dislikes"),
      food: field(fd, "food"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    await setFlash(
      "TAKEN",
      error.code === "23505"
        ? "Someone in the City already answers to that. Pick another."
        : "That did not save. Please try again.",
      EDGE.mag,
    );
    return;
  }

  await setFlash("NOTED", "The City has been told.", EDGE.purple);
  revalidatePath("/me");
  redirect("/me");
}

/** Choose how your profile banner looks, or put it back to the original. */
export async function setMood(fd: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const mood = str(fd, "mood").slice(0, 120);

  const { data: me } = await supabase.from("profiles").select("handle, mood").eq("id", user.id).maybeSingle();
  const changed = mood !== ((me?.mood as string | null) ?? "");

  // Asking for help puts a post on the wall: "<handle> needs help!" and what is needed. It costs
  // what a post costs. Clearing the line is free and posts nothing.
  let cost = 0;
  if (mood && changed) {
    const r = await call("cr_create_post", { p_body: `${me?.handle ?? "Someone"} needs help! ${mood}`, p_has_image: false, p_badge: null });
    if (!r.ok) {
      if (r.code === "insufficient") await broke(r, "Asking for help costs five, and you are {short} short. A little time at the Well will help.");
      else await wentWrong();
      redirect("/me");
    }
    cost = Number(r.cost ?? 5);
  }

  const { error } = await supabase
    .from("profiles")
    .update({ mood: mood || null, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    console.error("setMood:", error.message);
    await wentWrong();
    return;
  }

  await setFlash(
    mood ? "ASKED" : "CLEARED",
    mood
      ? changed
        ? `It is on the wall for the City to see. That took ${cost} out of you.${await newBadges()}`
        : "Still on the wall."
      : "Bubble cleared.",
    EDGE.purple,
  );
  revalidatePath("/");
  revalidatePath("/me");
  redirect("/me");
}

export async function saveAvatar(fd: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let parsed: unknown = {};
  try {
    parsed = JSON.parse(String(fd.get("config") ?? "{}"));
  } catch {
    await setFlash("UNREADABLE", "That portrait did not survive the journey. Try again.", EDGE.mag);
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_config: normalizePortrait(parsed), updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    console.error("saveAvatar:", error.message);
    await wentWrong();
    return;
  }

  await setFlash("A FACE", "Your face is saved. The City will know you now.", EDGE.purple);
  revalidatePath("/me");
  revalidatePath("/");
  const { data: who } = await supabase.from("profiles").select("onboarded").eq("id", user.id).single();
  redirect(who && who.onboarded === false ? "/welcome" : "/me");
}

export async function setTopFriends(fd: FormData) {
  const ids = fd.getAll("friend").map(String).filter(Boolean);
  const r = await call("cr_set_top_friends", { p_ids: ids });

  if (!r.ok) {
    if (r.code === "insufficient") {
      await broke(r, `Rearranging the Top 5 takes ${COSTS.topSix}, and you have {have}. The Well will help.`);
    } else if (r.code === "too_many") {
      await setFlash("SIX", "The Top 5 holds five, no more.", EDGE.mag);
    } else {
      await wentWrong();
    }
    return;
  }

  if (r.unchanged) {
    await setFlash("UNCHANGED", "Nothing changed, so nothing was used.", EDGE.purple);
  } else {
    await setFlash("REARRANGED", "Your Top 5 is rearranged.", EDGE.mag);
  }
  revalidatePath("/me");
  redirect("/me");
}

// ------------------------------------------------------------------ badges

/** Save the token you designed. Free, and changeable until you give it. */
export async function setToken(fd: FormData) {
  let parsed: unknown = {};
  try {
    parsed = JSON.parse(String(fd.get("design") ?? "{}"));
  } catch {
    await setFlash("UNREADABLE", "That Proof did not survive the journey. Try again.", EDGE.mag);
    return;
  }
  const r = await call("cr_set_token", { p_design: normalizeToken(parsed), p_how: String(fd.get("how") ?? "").slice(0, 140) });
  if (!r.ok) {
    await wentWrong();
    return;
  }
  await setFlash("YOUR PROOF", "Saved. Put it up from EPIC BATTLE in the Historikals menu.", EDGE.purple);
  revalidatePath("/me");
  revalidatePath("/me/token");
  redirect("/me");
}

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/** The other person says yes, or no. Yes moves the badges and recounts both ceilings. */
export async function answerTrade(fd: FormData) {
  const yes = str(fd, "answer") === "yes";
  const r = await call("cr_answer_trade", { p_id: Number(fd.get("id")), p_yes: yes });
  if (!r.ok) {
    if (r.code === "stale") {
      await setFlash("TOO LATE", "That offer no longer holds: a badge in it has moved on.", EDGE.purple);
    } else {
      await setFlash("ALREADY ANSWERED", "That offer is no longer waiting for you.", EDGE.purple);
    }
  } else if (yes) {
    await setFlash("TRADED", `Done. Your max mana has been worked out again.${await newBadges()}`, EDGE.blue);
  } else {
    await setFlash("DECLINED", "Left as it was.", EDGE.purple);
  }
  revalidatePath("/", "layout");
}

/** The offerer takes an offer back. */
export async function cancelTrade(fd: FormData) {
  const r = await call("cr_cancel_trade", { p_id: Number(fd.get("id")) });
  await setFlash(r.ok ? "TAKEN BACK" : "ALREADY SETTLED", r.ok ? "The offer is withdrawn." : "That offer was already answered.", EDGE.purple);
  revalidatePath("/", "layout");
}

/** From someone's profile, on a badge they are working on: "they helped me" or "we met up". */
export async function vouchFromProfile(fd: FormData) {
  const kind = str(fd, "kind");
  const handle = str(fd, "handle");
  const r = await call("cr_vouch_from_profile", { p_kind: kind, p_person: str(fd, "person_id"), p_badge: str(fd, "badge") || null });
  if (!r.ok) {
    if (r.code === "already") await setFlash("ALREADY SAID", "That one is already counted, or already waiting.", EDGE.purple);
    else await wentWrong();
  } else if (kind === "helped") {
    await setFlash("THANK YOU", `Counted. Each help earns them a Historikal.${await newBadges()}`, EDGE.blue);
  } else {
    await setFlash("ASKED", "They will see a note asking whether you met up. If they say yes, you both earn a badge.", EDGE.blue);
  }
  revalidatePath(`/u/${handle}`);
  revalidatePath("/", "layout");
}

/** A witch makes or edits a badge a witch approves. */
export async function saveBadge(fd: FormData) {
  const r = await call("cr_badge_save", {
    p_slug: str(fd, "slug") || null,
    p_title: str(fd, "title"),
    p_how: str(fd, "how"),
    p_blurb: str(fd, "blurb"),
    p_art: Number(fd.get("art")),
    p_peer: fd.get("peer") === "1" ? true : fd.get("peer") === "0" ? false : null,
    p_target: str(fd, "target") || null,
    p_art_custom: (() => {
      const c = str(fd, "art_custom");
      return c && unpackToken(c) ? c : null;
    })(),
  });
  if (!r.ok) {
    if (r.code === "forbidden") await setFlash("WITCHES ONLY", "Only witches make and edit badges.", EDGE.mag);
    else if (r.code === "bad_input") await setFlash("CHECK IT OVER", "A title, what to do, the line once earned, and a picture, please.", EDGE.mag);
    else await wentWrong();
  } else {
    await setFlash("SAVED", "The badge is saved.", EDGE.blue);
  }
  revalidatePath("/", "layout");
}

/** A witch deletes a badge a witch approves. Anyone who earned it loses it too. */
export async function deleteBadge(fd: FormData) {
  const r = await call("cr_badge_delete", { p_slug: str(fd, "slug") });
  if (!r.ok) {
    if (r.code === "forbidden") await setFlash("WITCHES ONLY", "Only witches delete badges.", EDGE.mag);
    else await wentWrong();
  } else {
    await setFlash("DELETED", "The badge is gone.", EDGE.purple);
  }
  revalidatePath("/", "layout");
}


/** The other person says yes or no to a quest question in a whisper. */
export async function answerBadgeClaim(fd: FormData) {
  const yes = str(fd, "answer") === "yes";
  const r = await call("cr_badge_claim_answer", { p_id: Number(fd.get("id")), p_yes: yes });
  if (!r.ok) await setFlash("ALREADY ANSWERED", "That question is no longer waiting for you.", EDGE.purple);
  else await setFlash(yes ? "THANK YOU" : "NO WORRIES", yes ? "Confirmed. The badge is theirs." : "Left as it was.", yes ? EDGE.blue : EDGE.purple);
  revalidatePath(`/whispers/${Number(fd.get("thread"))}`);
  revalidatePath("/", "layout");
}


/** A witch says a quest is done for someone, from their profile. */
export async function witchGrant(fd: FormData) {
  const handle = str(fd, "handle");
  const r = await call("cr_witch_grant", { p_user: str(fd, "user_id"), p_slug: str(fd, "slug") });
  if (!r.ok) {
    if (r.code === "have_it") await setFlash("ALREADY THEIRS", "They have that one already.", EDGE.purple);
    else if (r.code === "forbidden") await setFlash("WITCHES ONLY", "Only a witch can do that.", EDGE.mag);
    else await wentWrong();
  } else {
    await setFlash("DONE", "Marked as done. The badge is theirs.", EDGE.blue);
  }
  revalidatePath(`/u/${handle}`);
  revalidatePath("/", "layout");
}

/** A witch crosses off one of their own quests, from the quest list. */
export async function witchSelfDone(fd: FormData) {
  const r = await call("cr_witch_self_done", { p_slug: str(fd, "slug") });
  if (!r.ok) {
    if (r.code === "have_it") await setFlash("ALREADY YOURS", "You have that one, and it is not due again yet.", EDGE.purple);
    else if (r.code === "forbidden") await setFlash("WITCHES ONLY", "Only a witch can do that.", EDGE.mag);
    else await wentWrong();
  } else {
    await setFlash("CROSSED OFF", "Marked as done.", EDGE.blue);
  }
  revalidatePath("/quests");
  revalidatePath("/", "layout");
}

/** A witch sets what someone is, from their profile: the undead and others the registry has no line
 *  for become Forsaken this way. */
export async function witchSetSpecies(fd: FormData) {
  const handle = str(fd, "handle");
  const r = await call("cr_witch_set_species", { p_user: str(fd, "user_id"), p_species: str(fd, "species") });
  if (!r.ok) {
    if (r.code === "forbidden") await setFlash("WITCHES ONLY", "Only a witch can do that.", EDGE.mag);
    else await wentWrong();
  } else {
    await setFlash("SET", `${handle} is ${String((r as { label?: string }).label ?? "set")} now.`, EDGE.blue);
  }
  revalidatePath(`/u/${handle}`);
  revalidatePath("/", "layout");
}


export type ScanQuest = { slug: string; title: string; how: string; art: string; tiers: number; tier: number; epic: boolean; instant: boolean };
export type Scanned = { id: string; handle: string; name: string | null; species: string | null; spellcaster: boolean; face: string; quests: ScanQuest[] };

/** Someone's code was scanned: who they are, and the quests you can ask them about (the ones they can actually be part of). */
export async function scanPerson(handle: string, withQuests = false): Promise<Scanned | "self" | null> {
  if (!/^[a-z0-9_.-]{1,40}$/.test(handle)) return null;
  const supabase = createClient();
  const { data: p } = await supabase.from("profiles").select("id, handle, display_name, species, spellcaster, avatar_config").eq("handle", handle).maybeSingle();
  if (!p) return null;
  const { data: me } = await supabase.auth.getUser();
  if (me.user?.id === p.id) return "self";
  const { data: slugs } = withQuests ? await supabase.rpc("cr_scan_quests", { p_other: p.id }) : { data: [] };
  const list = (slugs ?? []) as string[];
  const { data: rows } = list.length ? await supabase.from("badges").select("slug, title, how, art, tiers, kind, scan_instant").in("slug", list) : { data: [] };
  const by = new Map((rows ?? []).map((r) => [r.slug as string, r]));
  const quests: ScanQuest[] = list.flatMap((slug) => {
    const r = by.get(slug);
    return r ? [{ slug, title: String(r.title), how: String(r.how), art: String(r.art), tiers: Number(r.tiers ?? 1), tier: 0, epic: r.kind === "goal", instant: !!r.scan_instant }] : [];
  });
  const face = faceSrc(p.avatar_config ? normalizePortrait(p.avatar_config) : portraitFromId(String(p.id)));
  return { id: String(p.id), handle: String(p.handle), name: p.display_name ?? null, species: p.species ?? null, spellcaster: !!p.spellcaster, face, quests };
}


/** Change a post's words: your own, or anyone's if you are a witch. */
export async function editPost(fd: FormData) {
  const back = str(fd, "back");
  const r = await call("cr_edit_post", { p_id: Number(fd.get("post_id")), p_body: str(fd, "body") });
  if (!r.ok) {
    if (r.code === "forbidden") await setFlash("NOT YOURS", "Only its writer or a witch can change that.", EDGE.mag);
    else if (r.code === "bad_body") await setFlash("NOTHING LEFT", "A post needs some words. Delete it instead if you want it gone.", EDGE.purple);
    else await wentWrong();
  } else {
    await setFlash("EDITED", "The post says the new thing now.", EDGE.blue);
  }
  revalidatePath("/");
  if (back.startsWith("/") && !back.startsWith("//")) revalidatePath(back);
}

/** Delete a post, its replies and its likes: your own, or anyone's if you are a witch. */
export async function deletePost(fd: FormData) {
  const back = str(fd, "back");
  const r = await call("cr_delete_post", { p_id: Number(fd.get("post_id")) });
  if (!r.ok) {
    if (r.code === "forbidden") await setFlash("NOT YOURS", "Only its writer or a witch can delete that.", EDGE.mag);
    else await wentWrong();
    return;
  }
  await setFlash("DELETED", "It is gone, replies and all.", EDGE.purple);
  revalidatePath("/");
  // Deleting the top of a thread leaves nothing to come back to.
  const target = Number(fd.get("post_id"));
  if (back === `/thread/${target}`) redirect("/");
  if (back.startsWith("/") && !back.startsWith("//")) revalidatePath(back);
}

/** Heal a hurt Historikal back to full, with your own mana: two for each heart it has lost. */
export async function pickHistorikal(fd: FormData) {
  const r = await call("cr_pick_historikal", { p_slug: String(fd.get("slug") ?? "") });
  if (!r.ok) {
    if (r.code === "none") await setFlash("NO PICK LEFT", "That pick has been used already.", EDGE.purple);
    else if (r.code === "taken") await setFlash("ALREADY TAKEN", "Someone already has that mythic, and there's only one. Pick another.", EDGE.purple);
    else await wentWrong();
    redirect("/me/historikals");
  }
  await setFlash("IT'S YOURS", `${String((r as { name?: string }).name ?? "Your Historikal").toUpperCase()} joins your Historikals.`, EDGE.blue);
  revalidatePath("/me/historikals");
  revalidatePath("/", "layout");
  redirect("/me/historikals");
}

/** A heart on one of your Historikals: it sorts to the top of your list. Quiet; the list shows it. */
export async function favoriteHistorikal(fd: FormData) {
  const r = await call("cr_favorite", { p_item: Number(fd.get("item")), p_on: fd.get("on") === "1" });
  if (!r.ok) await setFlash("NOT YOURS", "That Historikal has moved on.", EDGE.purple);
  revalidatePath("/me/historikals");
  revalidatePath("/", "layout");
}

/** The reveal has shown this badge: it is seen, and will not be shown again. */
export async function badgeSeen(slug: string) {
  await call("cr_badge_seen", { p_slug: String(slug).slice(0, 60) });
}

/** MANA BLEND, one at a time: this Historikal goes into the void. The fourth of a rarity resolves the pot. */
export type BlendFeed = { ok: true; done: false; count: number; rarity: string } | { ok: true; done: true; item: number; slug: string; name: string; rolled: string | null; evolved: boolean } | { ok: false; code: string; count?: number; rarity?: string };
export async function feedBlend(item: number): Promise<BlendFeed> {
  const r = await call("cr_blend_feed", { p_item: Number(item) });
  revalidatePath("/me/historikals");
  revalidatePath("/", "layout");
  if (!r.ok) return { ok: false, code: String(r.code ?? "error"), count: Number((r as { count?: number }).count ?? 0), rarity: String((r as { rarity?: string }).rarity ?? "") };
  const x = r as unknown as { done: boolean; count: number; rarity: string; item?: number; slug?: string; name?: string; rolled?: string | null; evolved?: boolean };
  if (!x.done) return { ok: true, done: false, count: Number(x.count), rarity: String(x.rarity) };
  return { ok: true, done: true, item: Number(x.item), slug: String(x.slug), name: String(x.name), rolled: x.rolled ? String(x.rolled) : null, evolved: !!x.evolved };
}
/** Backing out of a blend part way: the pot is emptied, and what went in is gone. */
export async function abandonBlend(): Promise<number> {
  const r = await call("cr_blend_abandon", {});
  revalidatePath("/", "layout");
  return Number((r as { lost?: number }).lost ?? 0);
}

/** Four Historikals of one rarity become one of the next rarity up. The panel asked "are you sure" already;
 *  this answers with what came out, or why nothing did. */
export async function recycleHistorikals(ids: number[]): Promise<{ ok: true; item: number; slug: string; name: string; rolled: string | null; evolved: boolean } | { ok: false; code: string }> {
  const r = await call("cr_recycle", { p_items: ids.filter((n) => Number.isInteger(n)).slice(0, 4) });
  if (!r.ok) return { ok: false, code: String(r.code ?? "error") };
  revalidatePath("/me/historikals");
  revalidatePath("/", "layout");
  const x = r as unknown as { item: number; slug: string; name: string; rolled: string | null; evolved: boolean };
  return { ok: true, item: Number(x.item), slug: String(x.slug), name: String(x.name), rolled: x.rolled ? String(x.rolled) : null, evolved: !!x.evolved };
}

export async function healHistorikal(fd: FormData) {
  const r = await call("cr_heal", { p_item: Number(fd.get("item")) });
  if (!r.ok) {
    if (r.code === "insufficient") await broke(r, "Healing costs two a heart, and you are {short} short. A little time at the Well will help.");
    else if (r.code === "full") await setFlash("ALREADY WELL", "Every heart is there already.", EDGE.purple);
    else if (r.code === "in_battle") await setFlash("IN A BATTLE", "Not while it is fighting. Heal it after.", EDGE.purple);
    else if (r.code === "not_yours") await setFlash("NOT YOURS", "That Historikal has moved on.", EDGE.purple);
    else await wentWrong();
  } else {
    await setFlash("HEALED", `Back to full, for ${r.cost ?? 0} mana.`, EDGE.blue);
  }
  revalidatePath("/me/historikals");
  revalidatePath("/", "layout");
}

// ------------------------------------------------------------ creature editor

const EDIT_WHY: Record<string, string> = {
  not_editor: "Only the creature editors can change creatures.",
  missing: "That creature isn't there any more.",
  bad_name: "A name needs one to forty letters, and no | ; or :.",
  bad_rarity: "That isn't a rarity.",
  bad_types: "One or two types, and two different ones.",
  bad_moves: "Commons have two moves, uncommons and rares three, epics and mythics four. Each needs a name (up to 24 letters, no | ; or :) and a kind.",
};

/** The creature editor: save one creature's name, rarity, types, moves and flags. */
export async function saveCreature(fd: FormData) {
  const slug = String(fd.get("slug") ?? "");
  const rarity = String(fd.get("rarity") ?? "");
  const n = rarity === "common" || rarity === "uncommon" ? 3 : 4;
  const moves = [0, 1, 2, 3].slice(0, n).map((i) => {
    const el = [String(fd.get(`el${i}`) ?? ""), i === 3 ? String(fd.get("el3b") ?? "") : ""].filter(Boolean);
    return { name: String(fd.get(`move${i}`) ?? "").trim(), kind: String(fd.get(`kind${i}`) ?? ""), el, ...(i === 3 && rarity === "legendary" ? { charge: true } : {}) };
  });
  const types = [String(fd.get("type1") ?? ""), String(fd.get("type2") ?? "")].filter(Boolean);
  // Its first type before the change: a new one re-dresses the picture (below).
  const supabase = createClient();
  const { data: was } = await supabase.from("badge_kinds").select("types, rnd").eq("slug", slug).maybeSingle();
  const r = await call("cr_edit_creature", {
    p_slug: slug,
    p: { name: String(fd.get("name") ?? ""), rarity, hearts: String(fd.get("hearts") ?? ""), types, moves, droppable: fd.get("droppable") === "on", hover: fd.get("hover") === "on", rnd: fd.get("rnd") === "on", shift: fd.get("shift") === "on" },
  });
  if (!r.ok) await setFlash("NOT SAVED", EDIT_WHY[r.code ?? ""] ?? "Something went wrong. Try again.", EDGE.purple);
  else {
    // A new first type: the picture takes its colour (a rough cut, in the sprite editor to touch up or reset).
    const before = (was?.types as string[] | null)?.[0];
    const after = types[0];
    let note = "The creature is changed everywhere.";
    if (before && after && before !== after && !was?.rnd && fd.get("rnd") !== "on") {
      const { data: { user } } = await supabase.auth.getUser();
      const why = user ? await retintCreature(supabase, slug, before as HkElement, after as HkElement, user.id) : "no user";
      note = why ? `The creature is changed everywhere, but its picture kept its colours (${why}).` : "The creature is changed everywhere, and its picture wears the new type. Touch it up in the sprite editor if it needs it.";
    }
    await setFlash("SAVED", note, EDGE.blue);
  }
  revalidatePath("/", "layout");
  redirect(`/creatures/${slug}`);
}

/** The creature editor: turn one held copy into another creature. */
export async function swapCopy(fd: FormData) {
  const slug = String(fd.get("slug") ?? "");
  const r = await call("cr_swap_copy", { p_item: Number(fd.get("item")), p_to: String(fd.get("to") ?? "") });
  if (!r.ok) {
    const why: Record<string, string> = { taken: "That mythic is taken: someone already has it (in every type it comes in).", same: "It's that creature already.", bad_target: "Pick a creature to turn it into.", missing: "That copy isn't there any more.", not_editor: EDIT_WHY.not_editor };
    await setFlash("NOT SWAPPED", why[r.code ?? ""] ?? "Something went wrong. Try again.", EDGE.purple);
  } else await setFlash("SWAPPED", "Their copy is the new creature now, hearts and history kept.", EDGE.blue);
  revalidatePath("/", "layout");
  redirect(`/creatures/${slug}`);
}
