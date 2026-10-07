"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setFlash, EDGE } from "@/lib/flash";
import { COSTS, untilReady } from "@/lib/crystr";
import { normalizePortrait } from "@/lib/portrait/core";

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
  setFlash("REST FIRST", line.replace("{have}", String(r.have ?? 0))
    .replace("{short}", String(Math.max(0, (r.need ?? 0) - (r.have ?? 0)))), EDGE.mag);
}

function wentWrong() {
  setFlash("SOMETHING WENT WRONG", "That one is on us. Give it another try.", EDGE.mag);
}

// ------------------------------------------------------------------- feed

export async function createPost(fd: FormData) {
  const body = str(fd, "body");
  const hasImage = fd.get("has_image") === "on" || fd.get("has_image") === "true";

  const r = await call("cr_create_post", { p_body: body, p_has_image: hasImage });

  if (!r.ok) {
    if (r.code === "empty") {
      setFlash("DECLINED", "There is nothing here yet. Write a few words first.", EDGE.mag);
    } else if (r.code === "insufficient") {
      broke(r, "You are {short} short of the strength for that. A little time at the Well will help.");
    } else {
      wentWrong();
    }
    return;
  }

  setFlash("POSTED", `That took ${r.cost} out of you. Nicely said.`, EDGE.mag);
  revalidatePath("/");
  redirect("/");
}

export async function likePost(fd: FormData) {
  const r = await call("cr_like_post", { p_post_id: Number(fd.get("post_id")) });

  if (!r.ok) {
    if (r.code === "already") {
      setFlash("ALREADY LIKED", "You have already liked this one.", EDGE.purple);
    } else if (r.code === "insufficient") {
      setFlash("REST FIRST", "You are fully out of mana. The Well is the place to recover.", EDGE.mag);
    } else {
      wentWrong();
    }
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
      setFlash("DECLINED", "There is nothing here yet. Write a few words first.", EDGE.mag);
    } else if (r.code === "insufficient") {
      broke(r, "You are {short} short of the strength for a reply. The Well will help.");
    } else if (r.code === "missing") {
      setFlash("GONE", "That post is no longer there to answer. Somebody unsaid it.", EDGE.mag);
      redirect("/");
    } else {
      wentWrong();
    }
    return;
  }

  setFlash("REPLIED", `That took ${r.cost} out of you. Your reply is on the thread.`, EDGE.mag);
  revalidatePath("/");
  revalidatePath(`/thread/${parent}`);
  redirect(`/thread/${parent}`);
}

export async function voiceLocked() {
  setFlash("LOCKED", "Voice notes are not open yet. They will take a lot out of you, so we are keeping them for later.", EDGE.purple);
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
        "The Well needs something to go on. Add a photo, or write down what you did.",
        EDGE.mag,
      );
    } else if (r.code === "cooldown") {
      setFlash(
        "TOO SOON",
        `You have brought this one in recently. It will be ready again in ${untilReady(r.ready_at!)}.`,
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
    `${r.reward} mana restored. Well done. Look after yourself.`,
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
      setFlash("EMPTY", "Nothing to send yet. Write a few words first.", EDGE.purple);
    } else if (r.code === "insufficient") {
      broke(r, `A whisper takes ${COSTS.whisper}, and you have {have}. Recover at the Well and it will be here when you are back.`);
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
      broke(r, "A vote takes three, and you have {have}. Your vote will keep. Go and recover, then come back.");
    } else if (r.code === "already") {
      setFlash("COUNTED", "You have already voted on this one, and it cannot be changed.", EDGE.purple);
    } else if (r.code === "closed") {
      setFlash("CLOSED", "That motion closed while you were deciding. There will be another.", EDGE.purple);
    } else {
      wentWrong();
    }
  } else {
    setFlash(
      "RECORDED",
      "Your vote is in, under your name. It takes three out of you and cannot be changed.",
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
      setFlash("NO HEADLINE", "Give it a headline so the City knows what it is about.", EDGE.mag);
    } else if (r.code === "thin_briefing") {
      setFlash(
        "TOO THIN",
        "A motion goes to the board with a briefing that explains it. Forty characters is a little short to explain it.",
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
      setFlash("NO HEADLINE", "Give it a headline so the City knows what it is about.", EDGE.mag);
    } else if (r.code === "insufficient") {
      broke(r, `An op-ed takes ${COSTS.oped}, and you have {have}. Recover at the Well and come back to it.`);
    } else {
      wentWrong();
    }
    return;
  }

  setFlash(
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
      setFlash("NO HEADLINE", "Give it a headline so the City knows what it is about.", EDGE.mag);
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
      "It is on the board for the whole City to read.",
      EDGE.blue,
    );
  } else {
    setFlash("SAVED", "Saved as a draft. Only you can see it.", EDGE.purple);
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
    setFlash("APPROVED", "Approved and published under their name.", EDGE.blue);
  } else if (status === "returned") {
    setFlash("RETURNED", "Sent back to the writer.", EDGE.mag);
  } else if (status === "published") {
    setFlash("PUBLISHED", "Published. The City can read it now.", EDGE.blue);
  } else {
    setFlash("PULLED", "Taken down from the board.", EDGE.purple);
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
    setFlash("NO NAME", "The City needs something to call you. Pick a handle.", EDGE.mag);
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
        : "That did not save. Please try again.",
      EDGE.mag,
    );
    return;
  }

  setFlash("NOTED", "The City has been told.", EDGE.purple);
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
    setFlash("UNREADABLE", "That portrait did not survive the journey. Try again.", EDGE.mag);
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_config: normalizePortrait(parsed), updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    console.error("saveAvatar:", error.message);
    wentWrong();
    return;
  }

  setFlash("A FACE", "Your face is saved. The City will know you now.", EDGE.purple);
  revalidatePath("/me");
  revalidatePath("/");
  redirect("/me");
}

export async function setTopFriends(fd: FormData) {
  const ids = fd.getAll("friend").map(String).filter(Boolean);
  const r = await call("cr_set_top_friends", { p_ids: ids });

  if (!r.ok) {
    if (r.code === "insufficient") {
      broke(r, `Rearranging the Top 6 takes ${COSTS.topSix}, and you have {have}. The Well will help.`);
    } else if (r.code === "too_many") {
      setFlash("SIX", "The Top 6 holds six, no more.", EDGE.mag);
    } else {
      wentWrong();
    }
    return;
  }

  if (r.unchanged) {
    setFlash("UNCHANGED", "Nothing changed, so nothing was used.", EDGE.purple);
  } else {
    setFlash("REARRANGED", "Your Top 6 is rearranged.", EDGE.mag);
  }
  revalidatePath("/me");
  redirect("/me");
}
