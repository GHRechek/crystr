import Link from "next/link";
import { EmojiImg } from "@/components/emoji-img";
import { BadgeArt, TokenImage } from "@/components/badges";
import { ROMAN, type BadgeRow } from "@/lib/badges";

/** The badges for a star row: the ones picked (in order), or, until some are picked, the four newest earned. */
export function starBadges(picked: string[] | null | undefined, badges: BadgeRow[]): BadgeRow[] {
  const earned = badges.filter((b) => b.earned_at);
  const chosen = (picked ?? []).map((s) => earned.find((b) => b.slug === s)).filter((b): b is BadgeRow => !!b);
  if (chosen.length) return chosen.slice(0, 4);
  return [...earned].sort((a, b) => String(b.earned_at).localeCompare(String(a.earned_at))).slice(0, 4);
}

/** A profile's star row, where OBSESSED WITH was: a purple star, the person's Proof, then four small badges.
 *  On your own profile it opens the page where you pick the four. */
export function StarRow({ token, badges, href }: { token: unknown; badges: BadgeRow[]; href?: string }) {
  const inner = (
    <>
      <span className="star-spin" style={{ flex: "none", width: 23, height: 21 }}>
        <EmojiImg e="star" from="/emoji/star.png" crystr size={18} />
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        {token ? <TokenImage design={token} size={21} alt="Proof" /> : null}
        {badges.map((b) => (
          <span key={b.slug} title={`${b.title}${b.tiers > 1 && b.tier ? ` ${ROMAN[b.tier]}` : ""}`}>
            <BadgeArt b={b} got tier={b.tier} size={21} />
          </span>
        ))}
        {!token && !badges.length ? <span style={{ fontSize: 12.5, color: "var(--muted)" }}>No badges yet</span> : null}
      </span>
    </>
  );
  const style: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, color: "inherit", textDecoration: "none" };
  return href ? (
    <Link href={href} aria-label="Your star badges: pick which four show" style={style}>{inner}</Link>
  ) : (
    <div aria-label="Star badges" style={style}>{inner}</div>
  );
}
