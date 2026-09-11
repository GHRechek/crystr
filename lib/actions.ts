"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setFlash, EDGE } from "@/lib/flash";
import { COSTS, untilReady } from "@/lib/crystr";
import { normalizeFace } from "@/lib/faces/core";

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

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

/** The house message for "you cannot afford this", with the shortfall. */
function broke(r: Rpc, line: string) {
  setFlash("DECLINED", line.replace("{have}", String(r.have ?? 0))
    .replace("{short}", String(Math.max(0, (r.need ?? 0) - (r.have ?? 0)))), EDGE.mag);
}

function wentWrong() {
  setFlash("THE WELL COUGHED", "Something failed on the way to the counting house. Try that again.", EDGE.mag);
}

// ------------------------------------------------------------------- feed

export async function createPost(fd: FormData) {
  const body = str(fd, "body");
  const hasImage = fd.get("has_image") === "on" || fd.get("has_image") === "true";

  const r = await call("cr_create_post", { p_body: body, p_has_image: hasImage });

  if (!r.ok) {
    if (r.code === "empty") {
      setFlash("DECLINED", "An empty post still costs five. Write something.", EDGE.mag);
    } else if (r.code === "insufficient") {
      broke(r, "Short by {short}. The WELL tab is not a punishment, it is a suggestion.");
    } else {
      wentWrong();
    }
    return;
  }

  setFlash("POSTED", `${r.cost} mana gone. It had better have been worth it.`, EDGE.mag);
  revalidatePath("/");
  redirect("/");
}

export async function likePost(fd: FormData) {
  const r = await call("cr_like_post", { p_post_id: Number(fd.get("post_id")) });

  if (!r.ok) {
    if (r.code === "already") {
      setFlash("ALREADY PAID", "You liked this once. Enthusiasm is not refundable.", EDGE.purple);
    } else if (r.code === "insufficient") {
      setFlash("DECLINED", "One mana. You do not have one mana. Go write a poem.", EDGE.mag);
    } else {
      wentWrong();
    }
  }
  revalidatePath("/");
}

export async function replyNotice() {
  setFlash("COSTS 5", "Replies are posts wearing a hat. Same price. Use the POST tab.", EDGE.purple);
  revalidatePath("/");
}

export async function voiceLocked() {
  setFlash("LOCKED", "Voice notes cost eleven mana and nobody has ever earned that in one sitting.", EDGE.purple);
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
      setFlash(
        "NO PROOF",
        "The well pays for artifacts, not for intentions. Upload the thing, or write down what you did.",
        EDGE.mag,
      );
    } else if (r.code === "cooldown") {
      setFlash(
        "TOO SOON",
        `The well pays for effort, not for repetition. That one is available again in ${untilReady(r.ready_at!)}.`,
        EDGE.mag,
      );
    } else {
      wentWrong();
    }
    revalidatePath(`/well/${slug}`);
    return;
  }

  setFlash(
    "ACCEPTED",
    `${r.reward} mana credited. The well notes that you were capable of this the whole time.`,
    EDGE.blue,
  );
  revalidatePath("/well");
  revalidatePath("/");
  redirect("/");
}

// --------------------------------------------------------------- whispers

export async function openThread(fd: FormData) {
  const r = await call("cr_open_thread", { p_other: str(fd, "other_id") });
  if (!r.ok) {
    wentWrong();
    return;
  }
  revalidatePath("/whispers");
  redirect(`/whispers/${r.thread_id}`);
}

export async function sendWhisper(fd: FormData) {
  const threadId = Number(fd.get("thread_id"));
  const r = await call("cr_send_whisper", {
    p_thread_id: threadId,
    p_body: str(fd, "body"),
  });

  if (!r.ok) {
    if (r.code === "empty") {
      setFlash("EMPTY", "Two mana for nothing. Even here, that's a bad trade.", EDGE.purple);
    } else if (r.code === "insufficient") {
      broke(r, `Whispers cost ${COSTS.whisper}. You have {have}. This one waits until you do something real.`);
    } else {
      wentWrong();
    }
  }
  revalidatePath(`/whispers/${threadId}`);
}

// ------------------------------------------------------------------ votes

export async function castVote(fd: FormData) {
  const r = await call("cr_cast_vote", {
    p_motion: Number(fd.get("motion_id")),
    p_side: str(fd, "side"),
  });

  if (!r.ok) {
    if (r.code === "insufficient") {
      broke(r, "A vote costs three. You have {have}. Democracy waits; the well does not.");
    } else if (r.code === "already") {
      setFlash("COUNTED", "You have already been counted on this one. It cannot be withdrawn.", EDGE.purple);
    } else if (r.code === "closed") {
      setFlash("CLOSED", "That motion closed while you were deciding. The City moved on without you.", EDGE.purple);
    } else {
      wentWrong();
    }
  } else {
    setFlash(
      "RECORDED",
      "Three mana, one opinion, filed under your name. It cannot be withdrawn.",
      str(fd, "side") === "for" ? EDGE.mag : EDGE.blue,
    );
  }
  revalidatePath("/vote");
}

export async function tableMotion(fd: FormData) {
  const r = await call("cr_table_motion", {
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
      setFlash("EMPTY", "A motion needs wording before it needs a briefing.", EDGE.mag);
    } else if (r.code === "no_headline") {
      setFlash("NO HEADLINE", "The City will not read an untitled notice, and neither will I.", EDGE.mag);
    } else if (r.code === "thin_briefing") {
      setFlash(
        "TOO THIN",
        "A motion goes to the board with a briefing that explains it. Forty characters is not an explanation.",
        EDGE.mag,
      );
    } else if (r.code === "forbidden") {
      setFlash("NOT YOURS", "Only witches table motions.", EDGE.mag);
    } else {
      wentWrong();
    }
    return;
  }

  setFlash(
    "TABLED",
    "Motion is on the board with its briefing attached. The City can now be annoyed at you accurately.",
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
      setFlash("NO HEADLINE", "The City will not read an untitled notice, and neither will I.", EDGE.mag);
    } else if (r.code === "insufficient") {
      broke(r, `Op-eds cost ${COSTS.oped} to file. You have {have}. The well is that way.`);
    } else {
      wentWrong();
    }
    return;
  }

  setFlash(
    "FILED",
    "Six mana, one opinion, queued for a witch. They read these on their own time, so be patient.",
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
      setFlash("NO HEADLINE", "The City will not read an untitled notice, and neither will I.", EDGE.mag);
    } else if (r.code === "forbidden") {
      setFlash("NOT YOURS", "Dispatches are a witch's business.", EDGE.mag);
    } else {
      wentWrong();
    }
    return;
  }

  if (status === "published") {
    setFlash(
      "PUBLISHED",
      "It is on the board. Everyone in the City can read it, and roughly nine of them will.",
      EDGE.blue,
    );
  } else {
    setFlash("SAVED", "Held as a draft. Nobody can see it, which may be for the best.", EDGE.purple);
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
      setFlash("NOT YOURS", "Only witches decide what the City is told.", EDGE.mag);
    } else {
      wentWrong();
    }
    revalidatePath(`/ball/${id}`);
    return;
  }

  if (r.kind === "oped" && status === "published") {
    setFlash("APPROVED", "Published under their name. If it is wrong, it is wrong in public now.", EDGE.blue);
  } else if (status === "returned") {
    setFlash("RETURNED", "Sent back with no notes, which is the cruellest kind.", EDGE.mag);
  } else if (status === "published") {
    setFlash("PUBLISHED", "Live to the City. No take-backs that anyone will believe.", EDGE.blue);
  } else {
    setFlash("PULLED", "Pulled from the board. People screenshot things, you know.", EDGE.purple);
  }

  revalidatePath("/ball");
  revalidatePath(`/ball/${id}`);
  revalidatePath("/");
  redirect("/ball");
}

// ---------------------------------------------------------------- profile

export async function updateProfile(fd: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const handle = str(fd, "handle").toLowerCase().replace(/[^a-z0-9_.-]/g, "");
  if (!handle) {
    setFlash("NO NAME", "The City needs something to shout. Pick a handle.", EDGE.mag);
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      handle,
      display_name: str(fd, "display_name") || null,
      bio: str(fd, "bio") || null,
      likes: str(fd, "likes") || null,
      dislikes: str(fd, "dislikes") || null,
      food: str(fd, "food") || null,
      obsession: str(fd, "obsession") || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    setFlash(
      "TAKEN",
      error.code === "23505"
        ? "Someone in the City already answers to that. Pick another."
        : "That did not save. The counting house blames you.",
      EDGE.mag,
    );
    return;
  }

  setFlash("NOTED", "The City has been informed, at no charge, which is rare.", EDGE.purple);
  revalidatePath("/me");
  redirect("/me");
}

export async function setMood(fd: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const mood = str(fd, "mood").slice(0, 80);

  const { error } = await supabase
    .from("profiles")
    .update({ mood: mood || null, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    console.error("setMood:", error.message);
    wentWrong();
    return;
  }

  setFlash(
    mood ? "NOTED" : "UNSAID",
    mood
      ? "The City can see what you are thinking. Thoughts are free; saying them out loud is five."
      : "Bubble emptied. Let them guess.",
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
    setFlash("UNREADABLE", "That portrait did not survive the journey. Try again.", EDGE.mag);
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_config: normalizeFace(parsed), updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    console.error("saveAvatar:", error.message);
    wentWrong();
    return;
  }

  setFlash("A FACE", "The City will recognise you now, for whatever that is worth.", EDGE.purple);
  revalidatePath("/me");
  revalidatePath("/");
  redirect("/me");
}

export async function setTopFriends(fd: FormData) {
  const ids = fd.getAll("friend").map(String).filter(Boolean);
  const r = await call("cr_set_top_friends", { p_ids: ids });

  if (!r.ok) {
    if (r.code === "insufficient") {
      broke(r, `Rearranging the Top 6 costs ${COSTS.topSix}. You have {have}.`);
    } else if (r.code === "too_many") {
      setFlash("SIX", "It is called the Top 6 for a reason.", EDGE.mag);
    } else {
      wentWrong();
    }
    return;
  }

  if (r.unchanged) {
    setFlash("UNCHANGED", "Same eight, same order. No charge, no hard feelings.", EDGE.purple);
  } else {
    setFlash("REARRANGED", "Four mana and, probably, a friendship.", EDGE.mag);
  }
  revalidatePath("/me");
  redirect("/me");
}
