import type { BadgeRow } from "@/lib/badges";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  handle: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  portrait_url: string | null;
  avatar_config: unknown;
  mood: string | null;
  likes: string | null;
  dislikes: string | null;
  food: string | null;
  obsession: string | null;
  mana: number;
  spent_total: number;
  is_witch: boolean;
  banner_pattern: string | null;
  banner_a: string | null;
  banner_b: string | null;
  created_at: string;
};

export type Author = Pick<
  Profile,
  "id" | "handle" | "display_name" | "avatar_url" | "portrait_url" | "avatar_config"
>;

const AUTHOR_COLS = "id, handle, display_name, avatar_url, portrait_url, avatar_config";

/** Every screen behind the tab bar needs these two. */
export const requireMe = cache(async function requireMe(): Promise<{ userId: string; profile: Profile }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // The profile trigger fires on first sign-in; if it somehow hasn't, there
  // is nothing to show and no safe default to invent.
  if (!profile) redirect("/login");

  return { userId: user.id, profile: profile as Profile };
});

// ------------------------------------------------------------------- feed

export type FeedPost = {
  kind: "post";
  id: number;
  author: Author;
  body: string;
  has_image: boolean;
  cost: number;
  created_at: string;
  likes: number;
  liked: boolean;
  /** How many replies sit under it. Always 0 for a reply itself. */
  replies: number;
};

export type FeedDispatch = {
  kind: "ball";
  id: number;
  byline_name: string | null;
  kicker: string;
  headline: string;
  standfirst: string;
  banner: boolean;
  banner_label: string;
  author: Author;
  published_at: string | null;
  created_at: string;
};

export type FeedItem = FeedPost | FeedDispatch;

export async function getFeed(userId: string): Promise<FeedItem[]> {
  const supabase = createClient();

  const [{ data: posts }, { data: dispatches }] = await Promise.all([
    supabase
      .from("posts")
      .select(`id, body, has_image, cost, created_at, author:profiles!posts_author_id_fkey(${AUTHOR_COLS}), likes:post_likes(count))`)
      .is("parent_id", null)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("articles")
      .select(`id, kicker, headline, standfirst, banner, banner_label, created_at, published_at, byline_name, author:profiles!articles_author_id_fkey(${AUTHOR_COLS})`)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(3),
  ]);

  const rows = (posts ?? []) as unknown as Array<{
    id: number;
    body: string;
    has_image: boolean;
    cost: number;
    created_at: string;
    author: Author;
    likes: { count: number }[];
  }>;

  let mine = new Set<number>();
  if (rows.length) {
    const { data: likes } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", userId)
      .in("post_id", rows.map((p) => p.id));
    mine = new Set((likes ?? []).map((l) => l.post_id as number));
  }

  // Reply counts: one plain query, tallied here. (An embedded count over the
  // posts table's own foreign key is ambiguous to PostgREST in a self-join.)
  const replyCount = new Map<number, number>();
  if (rows.length) {
    const { data: kids } = await supabase
      .from("posts")
      .select("parent_id")
      .in("parent_id", rows.map((p) => p.id));
    for (const k of kids ?? []) {
      const id = k.parent_id as number;
      replyCount.set(id, (replyCount.get(id) ?? 0) + 1);
    }
  }

  const social: FeedItem[] = rows.map((p) => ({
    kind: "post",
    id: p.id,
    author: p.author,
    body: p.body,
    has_image: p.has_image,
    cost: p.cost,
    created_at: p.created_at,
    likes: p.likes?.[0]?.count ?? 0,
    liked: mine.has(p.id),
    replies: replyCount.get(p.id) ?? 0,
  }));

  const ball = ((dispatches ?? []) as unknown as FeedDispatch[]).map((a) => ({
    ...a,
    kind: "ball" as const,
  }));

  // The Ball interleaves at 2, 5 and 8, exactly as the prototype does.
  const out = social.slice();
  [1, 4, 7].forEach((at, i) => {
    if (ball[i]) out.splice(Math.min(at, out.length), 0, ball[i]);
  });
  return out;
}

// ------------------------------------------------------------------- well

export type Quest = {
  slug: string;
  glyph: string;
  chip: string;
  title: string;
  sub: string;
  kicker: string;
  blurb: string;
  reward: number;
  time_label: string;
  proof_label: string;
  proof_hint: string;
  cooldown_hours: number;
  /** Set for quests that are about time: the length, in seconds, of the on-screen timer. */
  timer_seconds: number | null;
  /** A picture is required (words alone are not accepted). */
  proof_required: boolean;
  /** Offer the in-app drawing pad. */
  drawing_pad: boolean;
  /** Writing is the main way to hand it in; a photo is the secondary option. */
  text_first: boolean;
  ready_at: string | null;
};

export async function getQuests(userId: string): Promise<Quest[]> {
  const supabase = createClient();
  const [{ data: quests }, { data: subs }] = await Promise.all([
    supabase.from("quests").select("*").eq("active", true).order("sort"),
    supabase
      .from("quest_submissions")
      .select("quest_slug, created_at")
      .eq("user_id", userId)
      .neq("status", "void")
      .order("created_at", { ascending: false }),
  ]);

  const last = new Map<string, string>();
  for (const s of subs ?? []) {
    if (!last.has(s.quest_slug as string)) last.set(s.quest_slug as string, s.created_at as string);
  }

  return (quests ?? []).map((q) => {
    const at = last.get(q.slug as string);
    const ready = at
      ? new Date(new Date(at).getTime() + (q.cooldown_hours as number) * 3600_000)
      : null;
    return {
      ...(q as Omit<Quest, "ready_at">),
      ready_at: ready && ready > new Date() ? ready.toISOString() : null,
    };
  });
}

// --------------------------------------------------------------- whispers

export type ThreadRow = {
  id: number;
  other: Author;
  last_message_at: string;
  preview: string;
  unread: boolean;
};

export async function getThreads(userId: string): Promise<ThreadRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("dm_threads")
    .select(
      `id, last_message_at,
       a:profiles!dm_threads_user_a_fkey(${AUTHOR_COLS}),
       b:profiles!dm_threads_user_b_fkey(${AUTHOR_COLS}),
       messages:dm_messages(body, created_at, sender_id, image_path, deleted_at)`,
    )
    .order("last_message_at", { ascending: false });

  const rows = (data ?? []) as unknown as Array<{
    id: number;
    last_message_at: string;
    a: Author;
    b: Author;
    messages: { body: string; created_at: string; sender_id: string; image_path: string | null; deleted_at: string | null }[];
  }>;

  return rows.map((t) => {
    const msgs = [...(t.messages ?? [])].sort((x, y) => x.created_at.localeCompare(y.created_at));
    const last = msgs[msgs.length - 1];
    return {
      id: t.id,
      other: t.a.id === userId ? t.b : t.a,
      last_message_at: t.last_message_at,
      preview: !last
        ? "No one has said anything yet."
        : last.deleted_at
          ? "Message unsent."
          : last.body || (last.image_path ? "Sent a picture." : ""),
      unread: !!last && last.sender_id !== userId,
    };
  });
}

export type Reaction = { emoji: string; count: number; mine: boolean };

export type Message = {
  id: number;
  sender_id: string;
  body: string;
  created_at: string;
  /** A signed link to the picture, good for an hour; null when there is none. */
  image_url: string | null;
  reply_to: number | null;
  /** True once its sender has unsent it: the words and picture are gone. */
  unsent: boolean;
  reactions: Reaction[];
};

export async function getThread(
  id: number,
  userId: string,
): Promise<{ other: Author; messages: Message[] } | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("dm_threads")
    .select(
      `id,
       a:profiles!dm_threads_user_a_fkey(${AUTHOR_COLS}),
       b:profiles!dm_threads_user_b_fkey(${AUTHOR_COLS})`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;
  const t = data as unknown as { a: Author; b: Author };

  const { data: rows } = await supabase
    .from("dm_messages")
    .select("id, sender_id, body, created_at, image_path, reply_to, deleted_at")
    .eq("thread_id", id)
    .order("created_at");
  const msgs = (rows ?? []) as {
    id: number;
    sender_id: string;
    body: string;
    created_at: string;
    image_path: string | null;
    reply_to: number | null;
    deleted_at: string | null;
  }[];

  const ids = msgs.map((m) => m.id);
  const paths = msgs.map((m) => m.image_path).filter((p): p is string => !!p);
  const [{ data: reacts }, signed] = await Promise.all([
    ids.length
      ? supabase.from("dm_reactions").select("message_id, user_id, emoji").in("message_id", ids).not("emoji", "is", null)
      : Promise.resolve({ data: [] as { message_id: number; user_id: string; emoji: string }[] }),
    paths.length ? supabase.storage.from("whispers").createSignedUrls(paths, 3600) : Promise.resolve({ data: [] }),
  ]);

  const urlOf = new Map<string, string>();
  for (const u of (signed.data ?? []) as { path: string | null; signedUrl: string }[]) {
    if (u.path) urlOf.set(u.path, u.signedUrl);
  }
  const byMessage = new Map<number, { emoji: string; user_id: string }[]>();
  for (const r of (reacts ?? []) as { message_id: number; user_id: string; emoji: string }[]) {
    byMessage.set(r.message_id, [...(byMessage.get(r.message_id) ?? []), r]);
  }

  return {
    other: t.a.id === userId ? t.b : t.a,
    messages: msgs.map((m) => {
      const counts = new Map<string, Reaction>();
      for (const r of byMessage.get(m.id) ?? []) {
        const c = counts.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false };
        c.count += 1;
        if (r.user_id === userId) c.mine = true;
        counts.set(r.emoji, c);
      }
      return {
        id: m.id,
        sender_id: m.sender_id,
        body: m.body,
        created_at: m.created_at,
        image_url: m.image_path ? (urlOf.get(m.image_path) ?? null) : null,
        reply_to: m.reply_to,
        unsent: !!m.deleted_at,
        reactions: [...counts.values()],
      };
    }),
  };
}

/** Everyone else in the City — for starting a whisper or filling a Top 6. */
export async function getPeople(userId: string): Promise<Author[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select(AUTHOR_COLS)
    .neq("id", userId)
    .order("created_at");
  return (data ?? []) as Author[];
}

// ------------------------------------------------------------------ votes

export type Motion = {
  id: number;
  kicker: string;
  title: string;
  blurb: string;
  closes_at: string;
  briefing_id: number | null;
  votes_for: number;
  votes_against: number;
  my_side: "for" | "against" | null;
};

export async function getMotions(): Promise<{ open: Motion[]; past: Motion[] }> {
  const supabase = createClient();
  const [{ data: motions }, { data: tallies }, { data: mine }] = await Promise.all([
    supabase
      .from("motions")
      .select("id, kicker, title, blurb, closes_at, briefing_id")
      .order("closes_at", { ascending: false }),
    supabase.rpc("motion_tallies"),
    supabase.from("motion_votes").select("motion_id, side"),
  ]);

  const tally = new Map<number, { f: number; a: number }>();
  for (const t of tallies ?? []) {
    tally.set(t.motion_id as number, {
      f: Number(t.votes_for ?? 0),
      a: Number(t.votes_against ?? 0),
    });
  }
  const my = new Map<number, "for" | "against">();
  for (const v of mine ?? []) my.set(v.motion_id as number, v.side as "for" | "against");

  const now = Date.now();
  const all: Motion[] = (motions ?? []).map((m) => ({
    id: m.id as number,
    kicker: m.kicker as string,
    title: m.title as string,
    blurb: m.blurb as string,
    closes_at: m.closes_at as string,
    briefing_id: (m.briefing_id as number | null) ?? null,
    votes_for: tally.get(m.id as number)?.f ?? 0,
    votes_against: tally.get(m.id as number)?.a ?? 0,
    my_side: my.get(m.id as number) ?? null,
  }));

  return {
    open: all.filter((m) => new Date(m.closes_at).getTime() > now),
    past: all.filter((m) => new Date(m.closes_at).getTime() <= now),
  };
}

/** One post and the replies under it, oldest first. Null if there is no such
 *  post — or it's a reply, which has no page of its own: its thread does. */
export async function getPostThread(
  id: number,
  userId: string,
): Promise<{ post: FeedPost; replies: FeedPost[] } | null> {
  const supabase = createClient();

  const [{ data: top }, { data: kids }] = await Promise.all([
    supabase
      .from("posts")
      .select(`id, body, has_image, cost, created_at, parent_id, author:profiles!posts_author_id_fkey(${AUTHOR_COLS}), likes:post_likes(count)`)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("posts")
      .select(`id, body, has_image, cost, created_at, parent_id, author:profiles!posts_author_id_fkey(${AUTHOR_COLS}), likes:post_likes(count)`)
      .eq("parent_id", id)
      .order("created_at", { ascending: true })
      .limit(200),
  ]);

  if (!top || (top as { parent_id: number | null }).parent_id !== null) return null;

  type Row = {
    id: number;
    body: string;
    has_image: boolean;
    cost: number;
    created_at: string;
    author: Author;
    likes: { count: number }[];
  };
  const rows = [top as unknown as Row, ...((kids ?? []) as unknown as Row[])];

  const { data: likes } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", rows.map((r) => r.id));
  const mine = new Set((likes ?? []).map((l) => l.post_id as number));

  const toPost = (r: Row, replies: number): FeedPost => ({
    kind: "post",
    id: r.id,
    author: r.author,
    body: r.body,
    has_image: r.has_image,
    cost: r.cost,
    created_at: r.created_at,
    likes: r.likes?.[0]?.count ?? 0,
    liked: mine.has(r.id),
    replies,
  });

  return {
    post: toPost(rows[0], rows.length - 1),
    replies: rows.slice(1).map((r) => toPost(r, 0)),
  };
}

// ------------------------------------------------------------------- ball

export type Article = {
  id: number;
  byline_name: string | null;
  kind: "dispatch" | "briefing" | "oped";
  status: "draft" | "pending" | "published" | "returned";
  kicker: string;
  headline: string;
  standfirst: string;
  body: string;
  banner: boolean;
  banner_label: string;
  author: Author;
  author_id: string;
  created_at: string;
  published_at: string | null;
};

const ARTICLE_COLS = `id, kind, status, kicker, headline, standfirst, body, banner, banner_label, byline_name,
  author_id, created_at, published_at, author:profiles!articles_author_id_fkey(${AUTHOR_COLS})`;

/** RLS already hides drafts and other people's queued op-eds. */
export async function getArticles(): Promise<Article[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("articles")
    .select(ARTICLE_COLS)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as Article[];
}

export async function getArticle(id: number): Promise<Article | null> {
  const supabase = createClient();
  const { data } = await supabase.from("articles").select(ARTICLE_COLS).eq("id", id).maybeSingle();
  return (data as unknown as Article) ?? null;
}

// ---------------------------------------------------------------- profile

export type LedgerRow = { id: number; amount: number; reason: string; created_at: string };

export async function getLedger(userId: string): Promise<LedgerRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("mana_ledger")
    .select("id, amount, reason, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as LedgerRow[];
}

export type Vouch = {
  id: number;
  kind: "meetup" | "helped";
  claimant: string;
  other: string;
  status: "pending" | "confirmed" | "declined";
  who: { handle: string } | null;
};

/** Things people have said about you that wait for a yes: "we met up", "I helped them". */
export async function getPendingVouches(userId: string): Promise<Vouch[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("vouches")
    .select("id, kind, claimant, other, status, who:profiles!vouches_claimant_fkey(handle)")
    .eq("other", userId)
    .eq("status", "pending")
    .order("created_at")
    .limit(5);
  return (data ?? []) as unknown as Vouch[];
}

/** Handles of the people who have put you in their Top 6 and whom you have not yet been told about. */
export async function getTopSixNotices(userId: string): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("top_six_notices")
    .select("who:profiles!top_six_notices_from_user_fkey(handle)")
    .eq("user_id", userId)
    .is("seen_at", null)
    .order("created_at")
    .limit(20);
  return ((data ?? []) as unknown as { who: { handle: string } | null }[])
    .map((r) => r.who?.handle)
    .filter((h): h is string => !!h);
}

/** Everything said between you and one other person, for their whisper thread. */
export async function getVouchesBetween(userId: string, otherId: string): Promise<Vouch[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("vouches")
    .select("id, kind, claimant, other, status, who:profiles!vouches_claimant_fkey(handle)")
    .or(`and(claimant.eq.${userId},other.eq.${otherId}),and(claimant.eq.${otherId},other.eq.${userId})`)
    .neq("status", "declined")
    .limit(10);
  return (data ?? []) as unknown as Vouch[];
}

/** When this person registered as a plaintiff, or null if they have not. */
export async function getPlaintiffSince(userId: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.from("plaintiffs").select("registered_at").eq("user_id", userId).maybeSingle();
  return data ? String((data as { registered_at: string }).registered_at) : null;
}

export type PlaintiffRow = {
  user_id: string;
  submitted_at: string;
  answers: { name?: string; alias?: string; realm?: string; district?: string; species?: string };
  who: { handle: string } | null;
};

/** Everyone who has filled in Form 12-A, newest first. Witches only: for anyone
 *  else the database returns just their own. */
export async function getPlaintiffForms(): Promise<PlaintiffRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("plaintiff_forms")
    .select("user_id, submitted_at, answers, who:profiles!plaintiff_forms_user_id_fkey(handle)")
    .order("submitted_at", { ascending: false })
    .limit(500);
  return (data ?? []) as unknown as PlaintiffRow[];
}

/** Every badge there is, and when this person earned each one (null if not yet). */
export async function getBadges(userId: string): Promise<BadgeRow[]> {
  const supabase = createClient();
  const [all, mine] = await Promise.all([
    supabase.from("badges").select("slug, title, how, blurb, art, sort").order("sort"),
    supabase.from("user_badges").select("badge_slug, earned_at").eq("user_id", userId),
  ]);
  const earned = new Map((mine.data ?? []).map((r) => [String(r.badge_slug), String(r.earned_at)]));
  return ((all.data ?? []) as Omit<BadgeRow, "earned_at">[]).map((b) => ({
    ...b,
    earned_at: earned.get(b.slug) ?? null,
  }));
}

/** Someone's profile by their (lower-case) handle, or null. */
export async function getProfileByHandle(handle: string): Promise<Profile | null> {
  const supabase = createClient();
  const { data } = await supabase.from("profiles").select("*").eq("handle", handle).maybeSingle();
  return (data as Profile | null) ?? null;
}

export async function getTopFriends(userId: string): Promise<Author[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("top_friends")
    .select(`position, friend:profiles!top_friends_friend_id_fkey(${AUTHOR_COLS})`)
    .eq("user_id", userId)
    .order("position");
  return ((data ?? []) as unknown as { friend: Author }[]).map((r) => r.friend);
}


// ---------------------------------------------------------------- reports

export type Report = {
  id: number;
  kind: "post" | "whisper";
  target_id: number;
  reason: string;
  note: string | null;
  excerpt: string | null;
  status: "open" | "actioned" | "dismissed";
  created_at: string;
  reporter: { handle: string } | null;
  about: { handle: string } | null;
};

/** Whether this person has agreed to the current terms. */
export async function hasAcceptedTerms(userId: string, version: number): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase
    .from("tos_acceptances")
    .select("version")
    .eq("user_id", userId)
    .eq("version", version)
    .maybeSingle();
  return !!data;
}

/** Reports waiting to be read (witches only; everyone else's query comes back empty). */
export async function getOpenReports(): Promise<Report[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("reports")
    .select(
      "id, kind, target_id, reason, note, excerpt, status, created_at, reporter:profiles!reports_reporter_fkey(handle), about:profiles!reports_about_user_fkey(handle)",
    )
    .eq("status", "open")
    .order("created_at")
    .limit(50);
  return (data ?? []) as unknown as Report[];
}

export async function countOpenReports(): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");
  return count ?? 0;
}

// ------------------------------------------------------------------- bugs

export type BugReport = {
  id: number;
  body: string;
  page: string | null;
  device: string | null;
  created_at: string;
  reporter: { handle: string } | null;
};

/** Bugs waiting to be read (witches only; for anyone else the query comes back empty). */
export async function getOpenBugs(): Promise<BugReport[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("bug_reports")
    .select("id, body, page, device, created_at, reporter:profiles!bug_reports_reporter_fkey(handle)")
    .eq("status", "open")
    .order("created_at")
    .limit(50);
  return (data ?? []) as unknown as BugReport[];
}

export async function countOpenBugs(): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase.from("bug_reports").select("id", { count: "exact", head: true }).eq("status", "open");
  return count ?? 0;
}
