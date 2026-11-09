import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMe, getPicksOpen, getLegendariesTaken } from "@/lib/data";
import { capOf, corrupt, decayLevel } from "@/lib/crystr";
import { pickHistorikal } from "@/lib/actions";
import { Creature, Stats } from "@/components/encounter";
import { HISTORIKALS, HISTORIKAL, type Rarity, RARITY_NAME } from "@/lib/historikals";

const ORDER: Rarity[] = ["legendary", "epic", "rare", "uncommon", "common"];

/** Spending a gifted pick: every Historikal there is, and you choose one. */
export default async function PickPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { profile } = await requireMe();
  // Low on mana, the names go the way of every other word in the City.
  const decay = decayLevel(profile.mana, capOf(profile));
  const eat = (t: string) => corrupt(t, decay);
  const [picks, taken] = await Promise.all([getPicksOpen(), getLegendariesTaken()]);
  if (picks < 1) redirect("/me/historikals");
  // A mythic someone already has can't be picked: there's only one of each.
  const gone = new Set(taken);
  const want = HISTORIKAL.get((await searchParams).s ?? "");
  const chosen = want && !gone.has(want.slug) ? want : undefined;
  return (
    <div className="pad" style={{ gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/me/historikals" className="btn btn-sm">← BACK</Link>
        <h1 className="px" style={{ fontSize: 13, color: "#e8323c", fontWeight: 400 }}>PICK ANY ONE</h1>
      </div>
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: "var(--text-3)" }}>
        A gift: any Historikal you like, mythics too, unless someone already has it: there is only one of each mythic. Tap one to look, then take it.
      </p>
      {chosen ? (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <Creature slug={chosen.slug} size={96} />
          <div className="px" style={{ fontSize: 14 }}>{eat(chosen.name.toUpperCase())}</div>
          <Stats h={{ ...chosen, id: 0, hp: chosen.hearts }} />
          <div className="px" style={{ fontSize: 9.5, color: "var(--muted)", textAlign: "center", lineHeight: 1.6 }}>{eat(chosen.moves.map((m) => m.name.toUpperCase()).join(" · "))}</div>
          <form action={pickHistorikal}>
            <input type="hidden" name="slug" value={chosen.slug} />
            <button type="submit" className="btn" style={{ background: "#e0398a", color: "#fff" }}>TAKE {chosen.name.toUpperCase()}</button>
          </form>
        </div>
      ) : null}
      {ORDER.map((r) => (
        <section key={r} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 className="px" style={{ fontSize: 11, fontWeight: 400, color: "var(--muted)" }}>{RARITY_NAME[r].toUpperCase()}</h2>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(104px, 1fr))", gap: 6 }}>
            {HISTORIKALS.filter((h) => h.rarity === r && !h.retired).map((h) => gone.has(h.slug) ? (
              <li key={h.slug} aria-label={`${h.name}: taken`} style={{ padding: "10px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: 0.45 }}>
                <Creature slug={h.slug} size={56} ko />
                <span className="px" style={{ fontSize: 9.5, textAlign: "center", lineHeight: 1.4 }}>{eat(h.name)}</span>
                <span className="px" style={{ fontSize: 9, color: "var(--muted)" }}>TAKEN</span>
              </li>
            ) : (
              <li key={h.slug}>
                <Link href={`/me/historikals/pick?s=${h.slug}`} scroll aria-current={chosen?.slug === h.slug ? "true" : undefined} style={{ textDecoration: "none", color: "inherit", padding: "10px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, filter: chosen?.slug === h.slug ? "drop-shadow(0 0 6px #f2b544)" : undefined }}>
                    <Creature slug={h.slug} size={56} />
                    <span className="px" style={{ fontSize: 9.5, textAlign: "center", lineHeight: 1.4 }}>{eat(h.name)}</span>
                    <Stats h={{ ...h, id: 0, hp: h.hearts }} k={2} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
