import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  handle: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  avatar_config: unknown;
  mood: string | null;
  mana: number;
  spent_total: number;
  is_witch: boolean;
  created_at: string;
};

export type Author = Pick<
  Profile,
  "id" | "handle" | "display_name" | "avatar_url" | "avatar_config"
>;

const AUTHOR_COLS = "id, handle, display_name, avatar_url, avatar_config";

/** Every screen behind the tab bar needs these two. */
export async function requireMe(): Promise<{ userId: string; profile: Profile }> {
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
}

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
};

export type FeedDispatch = {
  kind: "ball";
  id: number;
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
      .select(`id, body, has_image, cost, created_at, author:profiles!posts_author_id_fkey(${AUTHOR_COLS}), likes:post_likes(count)`)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("articles")
      .select(`id, kicker, headline, standfirst, banner, banner_label, created_at, published_at, author:profiles!articles_author_id_fkey(${AUTHOR_COLS})`)
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
       messages:dm_messages(body, created_at, sender_id)`,
    )
    .order("last_message_at", { ascending: false });

  const rows = (data ?? []) as unknown as Array<{
    id: number;
    last_message_at: string;
    a: Author;
    b: Author;
    messages: { body: string; created_at: string; sender_id: string }[];
  }>;

  return rows.map((t) => {
    const msgs = [...(t.messages ?? [])].sort((x, y) => x.created_at.localeCompare(y.created_at));
    const last = msgs[msgs.length - 1];
    return {
      id: t.id,
      other: t.a.id === userId ? t.b : t.a,
      last_message_at: t.last_message_at,
      preview: last?.body ?? "No one has said anything yet.",
      unread: !!last && last.sender_id !== userId,
    };
  });
}

export type Message = { id: number; sender_id: string; body: string; created_at: string };

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

  const { data: messages } = await supabase
    .from("dm_messages")
    .select("id, sender_id, body, created_at")
    .eq("thread_id", id)
    .order("created_at");

  return {
    other: t.a.id === userId ? t.b : t.a,
    messages: (messages ?? []) as Message[],
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

// ------------------------------------------------------------------- ball

export type Article = {
  id: number;
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

const ARTICLE_COLS = `id, kind, status, kicker, headline, standfirst, body, banner, banner_label,
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

export async function getTopFriends(userId: string): Promise<Author[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("top_friends")
    .select(`position, friend:profiles!top_friends_friend_id_fkey(${AUTHOR_COLS})`)
    .eq("user_id", userId)
    .order("position");
  return ((data ?? []) as unknown as { friend: Author }[]).map((r) => r.friend);
}
