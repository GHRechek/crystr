import Link from "next/link";
import { requireMe, getBadges } from "@/lib/data";
import { StarChooser } from "@/components/star-chooser";

/** Picking the four badges on your star row (after your Proof, where OBSESSED WITH used to be). */
export default async function StarPage() {
  const { userId, profile } = await requireMe();
  const earned = (await getBadges(userId)).filter((b) => b.earned_at);
  return (
    <div className="pad" style={{ gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/me" className="btn btn-sm">← ME</Link>
        <h1 className="px" style={{ fontSize: 13, color: "var(--pur-soft)", fontWeight: 400 }}>STAR BADGES</h1>
      </div>
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: "var(--text-3)" }}>Four badges to sit beside your Proof on your profile. Tap them in the order you want them.</p>
      {earned.length ? <StarChooser earned={earned} picked={(profile.star_badges ?? []) as string[]} /> : <div className="empty">NO BADGES YET</div>}
    </div>
  );
}
