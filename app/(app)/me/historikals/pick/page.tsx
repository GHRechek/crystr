import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMe, getPicksOpen } from "@/lib/data";
import { pickHistorikal } from "@/lib/actions";
import { Creature, Stats } from "@/components/encounter";
import { HISTORIKALS, HISTORIKAL, type Rarity } from "@/lib/historikals";

const ORDER: Rarity[] = ["legendary", "rare", "uncommon", "common"];

/** Spending a gifted pick: every Historikal there is, and you choose one. */
export default async function PickPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  await requireMe();
  const picks = await getPicksOpen();
  if (picks < 1) redirect("/me/historikals");
  const chosen = HISTORIKAL.get((await searchParams).s ?? "");
  return (
    <div className="pad" style={{ gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/me/historikals" className="btn btn-sm">← BACK</Link>
        <h1 className="px" style={{ fontSize: 13, color: "#f2b544", fontWeight: 400 }}>PICK ANY ONE</h1>
      </div>
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: "var(--text-3)" }}>
        A gift: any Historikal you like, legendaries too. Tap one to look, then take it.
      </p>
      {chosen ? (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <Creature slug={chosen.slug} size={96} />
          <div className="px" style={{ fontSize: 14 }}>{chosen.name.toUpperCase()}</div>
          <Stats h={{ ...chosen, id: 0, hp: chosen.hearts }} />
          <div className="px" style={{ fontSize: 9.5, color: "var(--muted)", textAlign: "center", lineHeight: 1.6 }}>{chosen.moves.map((m) => m.name.toUpperCase()).join(" · ")}</div>
          <form action={pickHistorikal}>
            <input type="hidden" name="slug" value={chosen.slug} />
            <button type="submit" className="btn" style={{ background: "#e0398a", color: "#fff" }}>TAKE {chosen.name.toUpperCase()}</button>
          </form>
        </div>
      ) : null}
      {ORDER.map((r) => (
        <section key={r} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 className="px" style={{ fontSize: 11, fontWeight: 400, color: "var(--muted)" }}>{r.toUpperCase()}</h2>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(104px, 1fr))", gap: 6 }}>
            {HISTORIKALS.filter((h) => h.rarity === r).map((h) => (
              <li key={h.slug}>
                <Link href={`/me/historikals/pick?s=${h.slug}`} scroll aria-current={chosen?.slug === h.slug ? "true" : undefined} style={{ textDecoration: "none", color: "inherit", padding: "10px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, filter: chosen?.slug === h.slug ? "drop-shadow(0 0 6px #f2b544)" : undefined }}>
                    <Creature slug={h.slug} size={56} />
                    <span className="px" style={{ fontSize: 9.5, textAlign: "center", lineHeight: 1.4 }}>{h.name}</span>
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
