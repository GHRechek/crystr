import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMe, isCreatureEditor, getCatalogue } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { saveCreature, swapCopy } from "@/lib/actions";
import { Creature, Stats } from "@/components/encounter";
import { ELEMENT_COLOR, HISTORIKAL, HISTORIKALS, RARITIES, RARITY_COLOR, RARITY_NAME, TYPES, type Element } from "@/lib/historikals";

type Holder = { item: number; handle: string; name: string | null; hp: number; hearts: number; types: Element[] | null; since: string };

const label: React.CSSProperties = { fontSize: 9.5, color: "var(--muted)" };
const row: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center" };

/** One creature in the creature editor: its words, numbers and flags to change, and who holds it (with a way to
 *  turn any held copy into another creature). */
export default async function CreatureEditPage({ params }: { params: Promise<{ slug: string }> }) {
  // The editor's changes to the catalogue, before any creature is read: the layout fetches them too, but in parallel with this page.
  await getCatalogue();
  await requireMe();
  if (!(await isCreatureEditor())) notFound();
  const { slug } = await params;
  const h = HISTORIKAL.get(slug);
  if (!h) notFound();
  const supabase = createClient();
  const { data } = await supabase.rpc("cr_creature_holders", { p_slug: slug });
  const holders = (Array.isArray(data) ? data : []) as Holder[];
  const others = HISTORIKALS.filter((x) => !x.retired && x.slug !== slug).sort((a, b) => a.name.localeCompare(b.name));
  const moves = [0, 1, 2, 3].map((i) => h.moves[i]);

  return (
    <div className="pad" style={{ gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/creatures" className="btn btn-sm">← ALL</Link>
        <h1 className="px" style={{ fontSize: 13, color: RARITY_COLOR[h.rarity], fontWeight: 400 }}>{h.name.toUpperCase()}</h1>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Creature slug={h.slug} size={96} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="px" style={{ fontSize: 9.5 }}>
            <span style={{ color: RARITY_COLOR[h.rarity] }}>{RARITY_NAME[h.rarity].toUpperCase()}</span>
            {" · "}
            {h.types.map((t, i) => <span key={t} style={{ color: ELEMENT_COLOR[t] }}>{i ? " / " : ""}{t.toUpperCase()}</span>)}
          </span>
          <Stats h={{ id: 0, slug: h.slug, name: h.name, rarity: h.rarity, types: h.types, hearts: h.hearts }} k={1.5} only="hearts" />
          <span className="px" style={label}>{slug}{h.retired ? " · NOT FOUND ANY MORE" : ""}</span>
        </div>
      </div>

      <form action={saveCreature} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input type="hidden" name="slug" value={slug} />
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span className="px" style={label}>NAME</span>
          <input name="name" className="input" defaultValue={h.name} maxLength={40} required />
        </label>
        <div style={row}>
          <label style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
            <span className="px" style={label}>RARITY</span>
            <select name="rarity" className="input" defaultValue={h.rarity}>
              {RARITIES.map((r) => <option key={r} value={r}>{RARITY_NAME[r].toUpperCase()}</option>)}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5, width: 110 }}>
            <span className="px" style={label}>HEARTS</span>
            <select name="hearts" className="input" defaultValue={String(h.hearts)} aria-label="Hearts">
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span className="px" style={label}>TYPES · THE FIRST LEADS</span>
          <div style={row}>
            <select name="type1" className="input" defaultValue={h.types[0]} aria-label="First type" style={{ flex: 1 }}>
              {TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
            </select>
            <select name="type2" className="input" defaultValue={h.types[1] ?? ""} aria-label="Second type" style={{ flex: 1 }}>
              <option value="">— NONE —</option>
              {TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span className="px" style={label}>MOVES · COMMONS AND UNCOMMONS USE THREE, RARES AND UP FOUR · EACH HAS ITS ELEMENT (AN EPIC'S OR MYTHIC'S FOURTH HAS TWO; A MYTHIC'S FOURTH CHARGES)</span>
          {moves.map((m, i) => (
            <div key={i} style={row}>
              <input name={`move${i}`} className="input" defaultValue={m?.name ?? ""} maxLength={24} aria-label={`Move ${i + 1} name`} placeholder={i === 3 ? "Fourth move (epic and mythic)" : i === 2 ? "Third move (uncommon and up)" : "Move name"} style={{ flex: 2, minWidth: 0 }} />
              <select name={`kind${i}`} className="input" defaultValue={m?.kind ?? (["sword", "spell", "armor", "sword"][i])} aria-label={`Move ${i + 1} kind`} style={{ flex: 1 }}>
                <option value="sword">PIERCE</option>
                <option value="spell">SOFT</option>
                <option value="armor">HARD</option>
              </select>
              <select name={`el${i}`} className="input" defaultValue={m?.el?.[0] ?? (i === 2 ? h.types[1] ?? h.types[0] : i === 3 ? TYPES.find((t) => !h.types.includes(t)) : h.types[0])} aria-label={`Move ${i + 1} element`} style={{ flex: 1 }}>
                {TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
              {i === 3 ? (
                <select name="el3b" className="input" defaultValue={m?.el?.[1] ?? ""} aria-label="Second element (epic or mythic)" style={{ flex: 1 }}>
                  <option value="">— ONE ELEMENT —</option>
                  {TYPES.map((t) => <option key={t} value={t}>+ {t.toUpperCase()}</option>)}
                </select>
              ) : null}
            </div>
          ))}
        </div>
        <fieldset style={{ border: 0, padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          <legend className="px" style={{ ...label, marginBottom: 6 }}>ON OR OFF</legend>
          {([
            ["droppable", !h.retired, "CAN BE FOUND OR PICKED (holders keep theirs either way)"],
            ["hover", !!h.hover, "HOVERS (flies or floats)"],
            ["rnd", !!h.rnd, "ROLLS ITS FIRST TYPE WHEN FOUND"],
            ["shift", !!h.shift, "CHANGES ITS FIRST TYPE AFTER EVERY BATTLE"],
          ] as const).map(([n, on, text]) => (
            <label key={n} className="px" style={{ ...row, fontSize: 10, lineHeight: 1.5 }}>
              <input type="checkbox" name={n} defaultChecked={on} /> {text}
            </label>
          ))}
          <label className="px" style={{ ...row, fontSize: 10, lineHeight: 1.5, color: "var(--mag-soft)" }}>
            <input type="checkbox" name="retint" /> REDO ITS PICTURE IN ITS FIRST TYPE&apos;S COLOUR (from the original art; a rough cut to touch up in the sprite editor)
          </label>
        </fieldset>
        <button type="submit" className="btn" style={{ background: "#e0398a", color: "#fff" }}>SAVE</button>
      </form>

      <section style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--rule-soft)", paddingTop: 12 }}>
        <h2 className="px" style={{ fontSize: 11, fontWeight: 400, color: "var(--pur-soft)" }}>HELD BY · {holders.length}</h2>
        {holders.length === 0 ? <div className="px" style={label}>NOBODY HOLDS ONE</div> : null}
        {holders.map((x) => (
          <div key={x.item} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ ...row, flexWrap: "wrap" }}>
              <Link href={`/u/${x.handle}`} className="px" style={{ fontSize: 10, color: "var(--text-2)" }}>@{x.handle}</Link>
              {x.name ? <span style={{ fontSize: 12, color: "var(--muted)" }}>{x.name}</span> : null}
              <span className="px" style={{ fontSize: 8.5 }}>{(x.types ?? []).map((t, i) => <span key={t} style={{ color: ELEMENT_COLOR[t] }}>{i ? " / " : ""}{t.toUpperCase()}</span>)}</span>
              <span className="px" style={{ ...label, fontSize: 8.5 }}>{x.hp}/{x.hearts} HEARTS · COPY {x.item}</span>
            </div>
            <form action={swapCopy} style={row}>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="item" value={x.item} />
              <select name="to" className="input" defaultValue="" aria-label={`Turn @${x.handle}'s copy into`} style={{ flex: 1, minWidth: 0 }}>
                <option value="" disabled>TURN THIS COPY INTO…</option>
                {others.map((o) => <option key={o.slug} value={o.slug}>{o.name} · {o.rarity}</option>)}
              </select>
              <button type="submit" className="btn btn-sm">SWAP</button>
            </form>
          </div>
        ))}
      </section>
    </div>
  );
}
