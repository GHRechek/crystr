import type { BadgeRow } from "@/lib/badges";

/** The badges for a star row: the ones picked (in order), or, until some are picked, the four newest earned. */
export function starBadges(picked: string[] | null | undefined, badges: BadgeRow[]): BadgeRow[] {
  const earned = badges.filter((b) => b.earned_at);
  const chosen = (picked ?? []).map((s) => earned.find((b) => b.slug === s)).filter((b): b is BadgeRow => !!b);
  if (chosen.length) return chosen.slice(0, 4);
  return [...earned].sort((a, b) => String(b.earned_at).localeCompare(String(a.earned_at))).slice(0, 4);
}
