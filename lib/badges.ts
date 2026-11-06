// Badges: the eight achievements (recognition the database awards; three of them come in
// tiers, stepping up at five, ten, twenty-five and fifty), the tradable ones (earned five
// helps at a time, or one a year on your birthday, passed from hand to hand) and tokens (a
// badge of your own design, given away). Each kind is worth max mana — see BADGE_MANA in lib/crystr.ts; a tier is a mark of
// honour, not more mana. The rules live in the database
// (supabase/migrations/20261027000000_badges_max_mana_birthday.sql and
// 20261028070000_badge_tiers.sql); this is what the screens need.

import { normalizeToken, tokenSrc, tokenTitle } from "@/lib/token";

export type BadgeRow = {
  slug: string;
  title: string;
  how: string;
  blurb: string;
  art: string | null;
  /** How many tiers this badge has: 1 for most, 4 for the three counting badges. */
  tiers: number;
  /** Earned by posting it and having a witch like the post. */
  witch_approved?: boolean;
  /** Earned when someone you ask says yes (a whisper with YES and NO). */
  peer_approved?: boolean;
  /** For a quest someone confirms: the kind of person it has to be (a species, 'witch' or 'spellcaster'). */
  peer_target?: string | null;
  /** A long-term goal (only counts while on Working On) or a quest (everything else). */
  kind?: "goal" | "quest";
  /** The counts that earn each step, and the single count of a one-step badge. */
  steps?: number[] | null;
  threshold?: number | null;
  /** One of the quests everyone does first, before they can pick Main Quests. */
  first_step?: boolean;
  /** A witch scanning completes it at once, no whisper. */
  scan_instant?: boolean;
  earned_at: string | null;
  /** The tier held, 1 to 4 (1 on a badge with one tier). 0 until earned. */
  tier: number;
};

/** A tier as it is written on the badge: I, II, III, IV. The ladder itself (five, ten,
 *  twenty-five, fifty) lives in badge_tier_for in the database and is not advertised: the
 *  badge says five, and steps up on its own. */
export const ROMAN = ["", "I", "II", "III", "IV"] as const;

/** A tradable badge or a token somebody holds. */
export type BadgeItem = {
  id: number;
  kind: "tradable" | "token";
  kind_slug: string | null;
  earned_by: string | null;
  /** A token's name as given: "Marrow's Token". Null on tradable badges. */
  title: string | null;
  design: unknown;
  owner_id: string;
  minted_at: string;
  acquired_at: string;
  /** Why a tradable badge was minted: for helping, or for a birthday. Null on tokens. */
  occasion: "helped" | "birthday" | null;
  kindRow: { title: string; blurb: string; art: string } | null;
  maker: { handle: string } | null;
};

/** The holder's own token design and when they last gave it. */
export type TokenRow = {
  design: unknown;
  last_given_at: string | null;
  how?: string | null;
};

export type Trade = {
  id: number;
  from_user: string;
  to_user: string;
  give_item: number | null;
  give_token: boolean;
  want_item: number | null;
  status: "pending" | "accepted" | "declined" | "cancelled";
  created_at: string;
  offerer: { handle: string; display_name: string | null } | null;
  receiver: { handle: string; display_name: string | null } | null;
  give: TradeItem | null;
  want: TradeItem | null;
};

export type TradeItem = Pick<BadgeItem, "id" | "kind" | "kind_slug" | "title" | "design"> & {
  kindRow: { title: string; blurb: string; art: string } | null;
};

/** What stands in until a badge has chosen art. */
export const BADGE_GLYPH = "✦";

/** "FIRST WORDS" or "FIRST WORDS and JOINED IN", for a message. */
export function listBadges(titles: string[]): string {
  if (titles.length <= 1) return titles[0] ?? "";
  return `${titles.slice(0, -1).join(", ")} and ${titles[titles.length - 1]}`;
}

/** What a tradable badge or token is called. */
export function itemTitle(item: Pick<BadgeItem, "kind" | "title" | "kindRow">): string {
  return item.kind === "token" ? item.title ?? "A token" : item.kindRow?.title ?? "A badge";
}

/** When this token can be given again, or null if it can be given now. */
export function tokenReadyAt(lastGiven: string | null | undefined): Date | null {
  if (!lastGiven) return null;
  const d = new Date(lastGiven);
  d.setMonth(d.getMonth() + 6);
  return d.getTime() > Date.now() ? d : null;
}

/** One badge a person shows on their profile, ready to draw. */
export type ShownBadge = {
  key: string;
  /** An achievement badge: drawn with its tier mark. */
  badge?: { slug: string; art: string | null; tiers: number; tier: number };
  /** A tradable badge: just its picture. */
  src?: string;
  title: string;
  /** How it is earned, for the tooltip. */
  line: string;
  /** Not earned yet: drawn dimmed, and the line says what to do to earn it. */
  locked?: boolean;
  /** A badge to ask a witch for: make a post, and a witch's like earns it. */
  request?: boolean;
  /** Earned by asking someone, who answers in a whisper. */
  peer?: boolean;
  /** Completes the moment the right person's code is scanned. */
  instant?: boolean;
  /** A Main Quest that is finished: it stays in its slot, greyed out and struck through, until it is replaced. */
  done?: boolean;
  /** How a quest is done: on your own (the system sees it), by showing a post to a witch, or with someone. */
  mode?: "do" | "show" | "with";
  /** For a "with someone" quest: who it has to be. */
  target?: string;
  /** How far along a goal is: the count so far, and the count that finishes the next step. */
  progress?: { n: number; of: number };
  /** Handed out by the system itself, not by a witch's like: marked with a star. */
  auto?: boolean;
  /** A witch-approved badge's own fields, for a witch to edit. */
  edit?: { slug: string; title: string; how: string; blurb: string; art: number; custom?: string; /** A long-term goal: only its name and picture may change. */ fixed?: boolean; peer?: boolean; target?: string };
};

/** How each achievement reads once it is on show: what its owner did, in the past tense (the
 *  badge's own text, "Post a picture.", says what to do to earn it). */
const DID: Record<string, string> = {
  "first-words": "Made a post.",
  "show-and-tell": "Posted a picture.",
  "joined-in": "Replied on five different posts.",
  "whisper-web": "Whispered to five different people.",
  "a-voice-in-council": "Voted on five motions.",
  "meet-in-person": "Met up with someone from the City.",
  "a-helping-hand": "Helped someone with a problem.",
  "registered-plaintiff": "Became a Registered Plaintiff.",
};

/** How many badges a person can have on show. */
export const SHOW_MAX = 4;

/** What a person's saved list of shown badges means, from their earned badges and the
 *  tradable badges they hold. Anything no longer theirs is skipped. */
export function resolveShown(
  list: string[] | null | undefined,
  badges: BadgeRow[],
  items: BadgeItem[],
  owner: string,
  limit = SHOW_MAX,
): ShownBadge[] {
  const out: ShownBadge[] = [];
  for (const key of list ?? []) {
    if (key.startsWith("a:")) {
      const b = badges.find((x) => x.slug === key.slice(2) && x.earned_at);
      if (!b) continue;
      out.push({
        key,
        badge: { slug: b.slug, art: b.art, tiers: b.tiers, tier: b.tier },
        title: `${b.title}${b.tiers > 1 ? ` ${ROMAN[b.tier]}` : ""}`,
        line: b.blurb || DID[b.slug] || b.how,
      });
    } else if (key.startsWith("i:")) {
      const it = items.find((x) => x.kind === "tradable" && String(x.id) === key.slice(2));
      if (!it?.kindRow) continue;
      const line =
        it.occasion === "birthday"
          ? "Given on their birthday."
          : it.earned_by && it.earned_by !== it.owner_id
            ? `Came in a trade from ${it.maker?.handle ?? "someone"}.`
            : it.maker?.handle === owner
              ? "Earned by helping others."
              : it.kindRow.blurb || "A tradable badge.";
      out.push({ key, src: `/badges/tradable/${it.kindRow.art}`, title: it.kindRow.title.toUpperCase(), line });
    }
  }
  return out.slice(0, limit);
}

/** Every achievement badge there is, earned ones first (in the order the badges are kept in),
 *  as a grid will draw them: earned ones say what their owner did, the others what to do. */
export function achievementGrid(badges: BadgeRow[]): ShownBadge[] {
  const cell = (b: BadgeRow): ShownBadge => ({
    key: `a:${b.slug}`,
    badge: { slug: b.slug, art: b.art, tiers: b.tiers, tier: b.tier },
    title: b.earned_at ? `${b.title}${b.tiers > 1 ? ` ${ROMAN[b.tier]}` : ""}` : b.title,
    line: b.earned_at ? (b.blurb || DID[b.slug] || b.how) : b.how,
    locked: !b.earned_at,
    auto: !b.witch_approved && !b.peer_approved,
    edit: { slug: b.slug, title: b.title, how: b.how, blurb: b.blurb, art: Number(/(\d+)\.png$/.exec(b.art ?? "")?.[1] ?? 1), custom: b.art?.startsWith("token:") ? b.art.slice(6) : undefined, fixed: b.kind === "goal", peer: b.witch_approved || b.peer_approved ? !!b.peer_approved : undefined, target: b.peer_target ?? undefined },
  });
  return [...badges.filter((b) => b.earned_at), ...badges.filter((b) => !b.earned_at)].map(cell);
}

/** How many long-term goals a person can work on at once. */
export const WORKING_MAX = 3;

/** The badges a person says they are working on, in order, ready to list: each with what to do to
 *  earn it. They need not be earned yet. */
export type TokenRef = { user_id: string; design: unknown; how?: string | null; handle: string; display_name: string | null };

/** A token as a badge to go after: you earn it by being given it. */
export function tokenAsWorking(t: TokenRef): ShownBadge {
  return {
    key: `t:${t.user_id}`,
    src: tokenSrc(normalizeToken(t.design)),
    title: tokenTitle(t.display_name, t.handle).toUpperCase(),
    line: t.how?.trim() || `Ask ${t.handle} how to earn it.`,
    locked: true,
  };
}

/** A badge that goes on counting once you have it (helping people again and again, or the ones
 *  with steps), so it can stay on the list. Everything else comes off once earned. */
const repeatable = (b: BadgeRow) => b.slug === "a-helping-hand" || (b.tiers > 1 && b.tier < b.tiers);

/** Whether a badge is still something to work on. */
export const stillWorking = (b: BadgeRow) => !b.earned_at || repeatable(b);

/** Titles of the badges on a person's list that they have now earned, and which come off it. */
export function finishedWorking(list: string[] | null | undefined, badges: BadgeRow[]): string[] {
  return (list ?? [])
    .filter((k) => k.startsWith("a:"))
    .flatMap((k) => {
      const b = badges.find((x) => x.slug === k.slice(2));
      return b && !stillWorking(b) ? [b.title] : [];
    });
}

/** The count that finishes a goal's next step: its next step up, or its last when it is done. */
export function goalTarget(b: BadgeRow, n: number): number {
  const steps = b.steps?.length ? b.steps : b.tiers > 1 ? [5, 10, 25, 50].slice(0, b.tiers) : [b.threshold ?? 1];
  return steps.find((s) => s > n) ?? steps[steps.length - 1];
}

export function resolveWorking(list: string[] | null | undefined, badges: BadgeRow[], tokens: TokenRef[] = [], progress?: Record<string, number>): ShownBadge[] {
  const out: ShownBadge[] = [];
  for (const key of list ?? []) {
    if (key.startsWith("t:")) {
      const t = tokens.find((x) => x.user_id === key.slice(2));
      if (t) out.push(tokenAsWorking(t));
      continue;
    }
    const b = key.startsWith("a:") ? badges.find((x) => x.slug === key.slice(2)) : undefined;
    if (!b) continue;
    const finished = !stillWorking(b);
    out.push({
      key,
      badge: { slug: b.slug, art: b.art, tiers: b.tiers, tier: b.tier },
      title: b.earned_at && b.tiers > 1 ? `${b.title} ${ROMAN[b.tier]}` : b.title,
      line: b.how,
      locked: !b.earned_at,
      done: finished,
      request: !!b.witch_approved && !b.earned_at,
      peer: !!b.peer_approved && !b.earned_at,
      instant: !!b.scan_instant,
      target: b.peer_target ?? undefined,
      progress: progress ? { n: progress[b.slug] ?? 0, of: goalTarget(b, progress[b.slug] ?? 0) } : undefined,
    });
  }
  return out.slice(0, WORKING_MAX);
}

/** The long-term goals still to go for, to choose from for Working On. */
export const goalGrid = (badges: BadgeRow[], progress?: Record<string, number>): ShownBadge[] =>
  achievementGrid(badges.filter((b) => b.kind === "goal" && stillWorking(b))).map((c) => {
    const b = badges.find((x) => `a:${x.slug}` === c.key)!;
    return progress && b.slug in progress ? { ...c, progress: { n: progress[b.slug] ?? 0, of: goalTarget(b, progress[b.slug] ?? 0) } } : c;
  });

/** Every other badge, as the quests list shows them: what is still to do first. */
export const questGrid = (badges: BadgeRow[]): ShownBadge[] => {
  const q = badges.filter((b) => b.kind !== "goal");
  return [...q.filter((b) => !b.earned_at), ...q.filter((b) => b.earned_at)].map((b) => ({
    key: `a:${b.slug}`,
    badge: { slug: b.slug, art: b.art, tiers: b.tiers, tier: b.tier },
    title: b.earned_at ? `${b.title}${b.tiers > 1 ? ` ${ROMAN[b.tier]}` : ""}` : b.title,
    line: b.earned_at ? b.blurb || b.how : b.how,
    locked: !b.earned_at,
    auto: !b.witch_approved && !b.peer_approved,
    request: !!b.witch_approved && !b.earned_at,
    peer: !!b.peer_approved && !b.earned_at,
    instant: !!b.scan_instant,
    mode: b.peer_approved ? "with" : b.witch_approved ? "show" : "do",
    target: b.peer_target ?? undefined,
  }));
};

/** How many pictures from the uploaded badge set the app has: public/badges/set/1.png to this number. */
export const SET_COUNT = 1015;

/** The pictures of the badge set that are in the app: 1 to SET_COUNT, less the large framed ones that were taken out. */
export const SET_REMOVED: readonly number[] = [417,418,419,420,421,422,423,424,425,426,427,428,429,430,431,432,433,434,435,436,437,438,439,440,441,442,443,817,818,819,820,821,822,823,824,825,826,827,828,829,830,831,832,833,834,835,836,837,838,839,840,841,842,843,844,845,846,847,848];
export const SET_NUMBERS: number[] = Array.from({ length: SET_COUNT }, (_, i) => i + 1).filter((n) => !SET_REMOVED.includes(n));

/** The quests everyone does first: five, and until they are all earned there are no Main Quests to pick. */
export const firstStepBadges = (badges: BadgeRow[]) => badges.filter((b) => b.first_step);
export const firstStepsDone = (badges: BadgeRow[]) => firstStepBadges(badges).every((b) => !!b.earned_at);
export const firstStepGrid = (badges: BadgeRow[]): ShownBadge[] =>
  firstStepBadges(badges).map((b) => ({
    key: `a:${b.slug}`,
    badge: { slug: b.slug, art: b.art, tiers: b.tiers, tier: b.tier },
    title: b.title,
    line: b.earned_at ? b.blurb || b.how : b.how,
    locked: !b.earned_at,
    auto: !b.witch_approved && !b.peer_approved,
    peer: !!b.peer_approved && !b.earned_at,
    instant: !!b.scan_instant,
    mode: b.peer_approved ? "with" : "do",
    target: b.peer_target ?? undefined,
  }));

/** Help Someone Else: always a Main Quest, pinned at the top. Every ten confirmed helps brings a tradable badge, and the count starts again. */
export function helpingRow(badges: BadgeRow[], helps: number): ShownBadge | null {
  const b = badges.find((x) => x.slug === "a-helping-hand");
  if (!b) return null;
  return {
    key: "a:a-helping-hand",
    badge: { slug: b.slug, art: b.art, tiers: b.tiers, tier: Math.max(1, b.tier) },
    title: "Help Someone Else",
    line: "Help someone with their problem. Scan their QR to confirm!",
    locked: false,
    progress: { n: helps % 10, of: 10 },
  };
}
