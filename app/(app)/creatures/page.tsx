import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMe, isCreatureEditor, getCatalogue } from "@/lib/data";
import { CreatureIndex } from "@/components/creature-index";

/** The creature editor (for the people in creature_editors): every creature, to find and open. */
export default async function CreaturesPage() {
  // The editor's changes to the catalogue, before any creature is read: the layout fetches them too, but in parallel with this page.
  await getCatalogue();
  await requireMe();
  if (!(await isCreatureEditor())) notFound();
  return (
    <div className="pad" style={{ gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/me" className="btn btn-sm">← ME</Link>
        <h1 className="px" style={{ fontSize: 13, color: "var(--pur-soft)", fontWeight: 400 }}>CREATURE EDITOR</h1>
      </div>
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: "var(--text-3)" }}>
        Change a creature&rsquo;s name, rarity, types and moves, whether it can still be found, and see who holds it. A change shows everywhere as soon as you save.
      </p>
      <CreatureIndex />
    </div>
  );
}
