import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMe } from "@/lib/data";
import { HISTORIKALS, TYPES } from "@/lib/historikals";
import { HAIR_CHOICES, SKIN_CHOICES } from "@/lib/portrait/core";
import { OPTIONS } from "@/lib/portrait/manifest";
import { getSpriteOverrides } from "@/lib/sprites.server";
import { SpriteEditor } from "@/components/sprite-editor";

/** The sprite editor, for witches: draw on a portrait cell or a Historikal's picture, in the app, and save
 *  it over the file the app shipped with. See lib/sprites. */
export default async function SpritesPage() {
  const { profile } = await requireMe();
  if (!profile.is_witch) redirect("/me");

  // Every portrait cell the manifest draws, grouped by sheet.
  const cells = new Map<string, Set<string>>();
  for (const options of Object.values(OPTIONS)) for (const o of options) for (const c of o.cells) {
    if (c.includes("{")) continue;
    const [sheet, id] = c.split("/");
    if (!cells.has(sheet)) cells.set(sheet, new Set());
    cells.get(sheet)!.add(id);
  }
  const sheets = [...cells.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([sheet, ids]) => ({ sheet, ids: [...ids].sort() }));

  // Every Historikal, with the files it has: its two frames, its shadow, and each rolled type's two frames.
  const creatures = HISTORIKALS.map((h) => {
    const files = [`${h.slug}.png`, `${h.slug}-2.png`, `${h.slug}-s.png`];
    if (h.rnd) for (const t of TYPES) if (!h.types.includes(t)) files.push(`${h.slug}--${t}.png`, `${h.slug}--${t}-2.png`);
    return { slug: h.slug, name: h.name, files };
  }).sort((a, b) => a.name.localeCompare(b.name));

  const overrides = (await getSpriteOverrides()).map((o) => o.path);

  return (
    <div className="pad" style={{ gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/bugs" className="btn btn-sm">← WITCH</Link>
        <h1 className="px" style={{ fontSize: 13, color: "var(--pur-soft)", fontWeight: 400 }}>SPRITES</h1>
      </div>
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: "var(--text-3)" }}>
        Draw on a portrait part or a Historikal&apos;s picture. Saving puts your version in front of the one the app shipped with, for everyone, at once. Reset brings the shipped one back.
      </p>
      <SpriteEditor sheets={sheets} creatures={creatures} overrides={overrides} skins={SKIN_CHOICES} hairs={HAIR_CHOICES} />
    </div>
  );
}
