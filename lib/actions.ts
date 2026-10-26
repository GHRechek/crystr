"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { setFlash, EDGE } from "@/lib/flash";
import { TERMS_VERSION } from "@/lib/terms";
import { INVISIBLE } from "@/lib/wiki-fact";
import { isPattern, isSwatch } from "@/lib/banner";
import { COSTS, hasStarterHandle, untilReady } from "@/lib/crystr";
import { normalizePortrait } from "@/lib/portrait/core";
import { listBadges } from "@/lib/badges";
import { PLAINTIFF_ERRORS, type PlaintiffError } from "@/lib/plaintiff";

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

/** Badges earned since the person last heard, as a sentence to add to a message
 *  ("" when there are none). Asking marks them as told, so each is announced once. */
async function newBadges(): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("cr_claim_new_badges");
  if (error || !Array.isArray(data) || data.length === 0) return "";
  const titles = (data as { title: string }[]).map((b) => b.title);
  return ` You earned a badge: ${listBadges(titles)}.`;
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
  const hasImage = fd.get("has_image") === "on" || fd.get("has_image") === "true";

  const r = await call("cr_create_post", { p_body: body, p_has_image: hasImage });

  if (!r.ok) {
    if (r.code === "empty") {
      await setFlash("DECLINED", "There is nothing here yet. Write a few words first.", EDGE.mag);
    } else if (r.code === "insufficient") {
      await broke(r, "You are {short} short of the strength for that. A little time at the Well will help.");
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
  const r = data as { ok?: boolean; image?: string | null } | null;
  if (error || !r?.ok) {
    await wentWrong();
  } else {
    // Clear the stored picture too, if there was one (best effort: the message itself is already gone).
    if (r.image) await supabase.storage.from("whispers").remove([r.image]).catch(() => {});
    await setFlash("UNSENT", "It is gone for both of you.", EDGE.purple);
  }
  revalidatePath(`/whispers/${threadId}`);
}

// ------------------------------------------------------------- plaintiffs

/** The welcome page: their name, then the registry (district and species codes). Nothing
 *  is changed unless the name is acceptable; the codes are checked in the database. On
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

  if (str(fd, "species") === "other") {
    return { field: "species", message: "Contact your local Crystr administrator." };
  }

  const handle = str(fd, "handle").toLowerCase().replace(/[^a-z0-9_.-]/g, "");
  if (!handle || hasStarterHandle(handle)) return { field: "handle", message: "Pick a handle: what the City will call you." };
  if (handle.length > 15) return { field: "handle", message: "Handles are fifteen characters at most." };
  const display = field(fd, "display_name");

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
        : "They will see a note asking whether you helped. If they say yes, you earn a badge.",
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
    p_note: str(fd, "note"),
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

/** Dismiss the "someone put you in their Top 6" banner. */
export async function seeTopSix() {
  const supabase = createClient();
  const { error } = await supabase.rpc("cr_seen_top_six");
  if (error) console.error("cr_seen_top_six:", error.message);
  revalidatePath("/", "layout");
}

// ------------------------------------------------------------------ votes

export async function castVote(fd: FormData) {
  const r = await call("cr_cast_vote", {
    p_motion: Number(fd.get("motion_id")),
    p_side: str(fd, "side"),
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
  revalidatePath("/vote");
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
    b_banner: fd.get("b_banner") === "on" || fd.get("b_banner") === "true",
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

  await setFlash(
    "CREATED",
    "Your motion is on the board with its briefing attached.",
    EDGE.blue,
  );
  revalidatePath("/vote");
  revalidatePath("/ball");
  revalidatePath("/");
  redirect("/vote");
}

// ------------------------------------------------------------------- ball

export async function submitOpEd(fd: FormData) {
  const r = await call("cr_submit_oped", {
    p_kicker: str(fd, "kicker") || "OP-ED",
    p_headline: str(fd, "headline"),
    p_standfirst: str(fd, "standfirst"),
    p_body: str(fd, "body"),
    p_banner: fd.get("banner") === "on" || fd.get("banner") === "true",
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
    p_banner: fd.get("banner") === "on" || fd.get("banner") === "true",
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

  const { error } = await supabase
    .from("profiles")
    .update({
      handle,
      display_name: field(fd, "display_name"),
      bio: field(fd, "bio", BIO_MAX),
      likes: field(fd, "likes"),
      dislikes: field(fd, "dislikes"),
      food: field(fd, "food"),
      obsession: field(fd, "obsession"),
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
export async function setBanner(fd: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const reset = str(fd, "reset") === "1";
  const pattern = str(fd, "pattern");
  const a = str(fd, "a");
  const b = str(fd, "b");
  if (!reset && !(isPattern(pattern) && isSwatch(a) && isSwatch(b))) {
    await setFlash("NOT QUITE", "Pick a pattern and two colours from the lists.", EDGE.mag);
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .update(
      reset
        ? { banner_pattern: null, banner_a: null, banner_b: null, updated_at: new Date().toISOString() }
        : { banner_pattern: pattern, banner_a: a, banner_b: b, updated_at: new Date().toISOString() },
    )
    .eq("id", user.id);

  if (error) {
    console.error("setBanner:", error.message);
    await wentWrong();
    return;
  }
  await setFlash("BANNER SAVED", reset ? "Back to the original." : "Your banner is up.", EDGE.purple);
  revalidatePath("/me");
  redirect("/me");
}

export async function setMood(fd: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const mood = str(fd, "mood").slice(0, PROFILE_FIELD_MAX);

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
    mood ? "NOTED" : "UNSAID",
    mood
      ? "The City can see what is on your mind. Thoughts are free; posting takes five."
      : "Bubble cleared.",
    EDGE.purple,
  );
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
      await broke(r, `Rearranging the Top 6 takes ${COSTS.topSix}, and you have {have}. The Well will help.`);
    } else if (r.code === "too_many") {
      await setFlash("SIX", "The Top 6 holds six, no more.", EDGE.mag);
    } else {
      await wentWrong();
    }
    return;
  }

  if (r.unchanged) {
    await setFlash("UNCHANGED", "Nothing changed, so nothing was used.", EDGE.purple);
  } else {
    await setFlash("REARRANGED", "Your Top 6 is rearranged.", EDGE.mag);
  }
  revalidatePath("/me");
  redirect("/me");
}
