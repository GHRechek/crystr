// Badges are recognition only. The rules live in the database (see
// supabase/migrations/20261008000000_badges.sql); this is what the screens need.

export type BadgeRow = {
  slug: string;
  title: string;
  how: string;
  blurb: string;
  art: string | null;
  earned_at: string | null;
};

/** What stands in until a badge has chosen art. */
export const BADGE_GLYPH = "✦";

/** "FIRST WORDS" or "FIRST WORDS and JOINED IN", for a message. */
export function listBadges(titles: string[]): string {
  if (titles.length <= 1) return titles[0] ?? "";
  return `${titles.slice(0, -1).join(", ")} and ${titles[titles.length - 1]}`;
}
