import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireMe } from "@/lib/data";
import { getWikiFacts, getWikiPage, SLUG } from "@/lib/wiki";
import { addFact } from "@/lib/wiki-actions";
import { COSTS } from "@/lib/crystr";
import { FACT_MAX_CHARS, FACT_MAX_WORDS } from "@/lib/wiki-fact";

/** Adding a few words to one spot on a page. */
export default async function AddFact(props: { params: Promise<{ slug: string; slot: string }> }) {
  const params = await props.params;
  const { profile, userId } = await requireMe();
  const slot = Number(params.slot);
  if (!SLUG.test(params.slug) || !Number.isInteger(slot) || slot < 1) notFound();

  const page = await getWikiPage(params.slug);
  if (!page || slot > page.slots) notFound();
  if (page.locked && !profile.is_witch) redirect(`/wiki/${page.slug}`);

  const facts = await getWikiFacts(page.id);
  if (facts.some((f) => f.slot === slot && f.status === "kept")) redirect(`/wiki/${page.slug}`);
  const own = facts.find((f) => f.slot === slot && f.author?.id === userId && f.status === "pending");

  const affordable = profile.mana >= COSTS.wikiEdit;

  return (
    <form action={addFact} className="pad" style={{ gap: 11 }}>
      <input type="hidden" name="page" value={page.id} />
      <input type="hidden" name="slug" value={page.slug} />
      <input type="hidden" name="slot" value={slot} />
      <h1 className="sr-only">Add a fact</h1>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href={`/wiki/${page.slug}`} className="btn btn-sm">
          ✕ BACK
        </Link>
        <div className="spacer" />
        <div className="px" style={{ fontSize: 11, color: "var(--pur-pale)" }}>
          CHANGING YOUR WORDS IN “{page.title.toUpperCase()}”
        </div>
      </div>

      <div className="field">
        <label htmlFor="text">A FEW KEY WORDS ABOUT {page.title.toUpperCase()}</label>
        <input
          id="text"
          name="text"
          className="input wiki-px"
          maxLength={FACT_MAX_CHARS}
          defaultValue={own?.body ?? ""}
          placeholder="Founded by Old Maren"
          autoComplete="off"
          autoFocus
          required
        />
        <span className="flabel" style={{ color: "var(--muted)" }}>
          ONE FACT, UP TO {FACT_MAX_WORDS} WORDS. THERE IS NO WRONG ANSWER, ONLY WHAT THE CITY BELIEVES.
        </span>
      </div>

      <button
        type="submit"
        className={`btn btn-lg btn-block${own || affordable ? " btn-purple" : ""}`}
        aria-disabled={!own && !affordable}
      >
        {own
          ? profile.is_witch
            ? "PUT IT ON THE PAGE · FREE"
            : "UPDATE YOUR WORDS · FREE"
          : affordable
            ? `ADD TO THE PAGE · USES ${COSTS.wikiEdit}`
            : "REST FIRST"}
      </button>

      <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)" }}>
        {profile.is_witch
          ? "As a witch, what you add goes straight onto the page. Nobody needs to approve it."
          : "Everyone else sees it only once a witch has read and kept it. Until then it is just for you and the witches. They can keep it, change the wording, or send it back."}
      </div>
    </form>
  );
}
