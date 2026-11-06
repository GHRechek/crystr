import Link from "next/link";
import { requireMe, getPeople, getPeopleKinds } from "@/lib/data";
import { PeopleSearch } from "./search";

/** Look people up: by name, and by what they are. */
export default async function PeoplePage() {
  const { userId } = await requireMe();
  const [people, kinds] = await Promise.all([getPeople(userId), getPeopleKinds(userId)]);
  const by = new Map(kinds.map((k) => [k.id, k]));
  const rows = people.map((p) => {
    const k = by.get(p.id);
    return { person: p, species: k?.species ?? null, spellcaster: !!k?.spellcaster, witch: !!k?.is_witch };
  });
  return (
    <div className="pad" style={{ gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/" className="btn btn-sm">← BACK</Link>
        <h1 className="px" style={{ fontSize: 13, color: "var(--pur-soft)", fontWeight: 400 }}>FIND PEOPLE</h1>
      </div>
      <PeopleSearch rows={rows} />
    </div>
  );
}
