// Badges: the eight achievements (recognition the database awards; three of them come in
// tiers, stepping up at five, ten, twenty-five and fifty), the tradable ones (earned five
// helps at a time, passed from hand to hand) and tokens (a badge of your own design, given
// away). Each kind is worth max mana — see BADGE_MANA in lib/crystr.ts; a tier is a mark of
// honour, not more mana. The rules live in the database
// (supabase/migrations/20261027000000_badges_max_mana_birthday.sql and
// 20261028070000_badge_tiers.sql); this is what the screens need.

export type BadgeRow = {
  slug: string;
  title: string;
  how: string;
  blurb: string;
  art: string | null;
  /** How many tiers this badge has: 1 for most, 4 for the three counting badges. */
  tiers: number;
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
  kindRow: { title: string; blurb: string; art: string } | null;
  maker: { handle: string } | null;
};

/** The holder's own token design and when they last gave it. */
export type TokenRow = {
  design: unknown;
  last_given_at: string | null;
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
