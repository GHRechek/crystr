import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMe, getBadges } from "@/lib/data";
import { achievementGrid } from "@/lib/badges";
import { BadgeAdmin } from "./admin";

/** Where witches edit the badges: every badge in one list, the system's marked with a star. */
export default async function BadgesAdminPage() {
  const { userId, profile } = await requireMe();
  if (!profile.is_witch) redirect("/me");
  const badges = await getBadges(userId);
  return (
    <div className="pad" style={{ gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/me" className="btn btn-sm">
          ← ME
        </Link>
        <h1 className="px" style={{ fontSize: 13, color: "var(--pur-soft)", fontWeight: 400 }}>
          EDIT BADGES
        </h1>
      </div>
      <BadgeAdmin items={achievementGrid(badges)} />
    </div>
  );
}
