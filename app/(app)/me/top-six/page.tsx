import Link from "next/link";
import { requireMe, getPeople, getTopFriends } from "@/lib/data";
import { TopSixPicker } from "./picker";

/** Choosing who is in your Top 6: a page of its own, so a vacant slot asks for a person
 *  and nothing else. */
export default async function TopSixPage() {
  const { userId } = await requireMe();
  const [people, top] = await Promise.all([getPeople(userId), getTopFriends(userId)]);

  return (
    <div className="pad">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/me" className="btn btn-sm">
          ← ME
        </Link>
        <div className="spacer" />
        <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
          ORDER IS THE ORDER YOU PICK
        </div>
      </div>

      <div>
        <h1 className="screen-title">YOUR TOP 6</h1>
        <div className="screen-intro">
          Who do you want beside you? Tap a person to add them; tap again to take them out. The first
          you pick is first on your page.
        </div>
      </div>

      <TopSixPicker people={people} current={top.map((f) => f.id)} />
    </div>
  );
}
