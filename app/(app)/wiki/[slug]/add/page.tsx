import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireMe } from "@/lib/data";
import { getWikiPage, SLUG } from "@/lib/wiki";
import { addFact } from "@/lib/wiki-actions";
import { COSTS } from "@/lib/crystr";
import { Cost } from "@/components/mana";
import { FACT_MAX_CHARS, FACT_MAX_WORDS_TEXT } from "@/lib/wiki-fact";

/** Adding something new to the end of a page. (Changing words you already sent is the
 *  neighbouring /add/<slot> screen.) */
export default async function AddSomething(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const { profile } = await requireMe();
  if (!SLUG.test(params.slug)) notFound();

  const page = await getWikiPage(params.slug);
  if (!page || page.archived) notFound();
  if (page.locked && !profile.is_witch) redirect(`/wiki/${page.slug}`);

  const affordable = profile.mana >= COSTS.wikiEdit;

  return (
    <form action={addFact} className="pad" style={{ gap: 11 }}>
      <input type="hidden" name="page" value={page.id} />
      <input type="hidden" name="slug" value={page.slug} />
      <h1 className="sr-only">Add something to {page.title}</h1>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href={`/wiki/${page.slug}`} className="btn btn-sm">
          ✕ BACK
        </Link>
        <div className="spacer" />
        <div className="px" style={{ fontSize: 11, color: "var(--pur-pale)" }}>
          ADDING TO “{page.title.toUpperCase()}”
        </div>
      </div>

      <div className="field">
        <label htmlFor="text">A FEW KEY WORDS ABOUT {page.title.toUpperCase()}</label>
        <input
          id="text"
          name="text"
          className="input wiki-px"
          maxLength={FACT_MAX_CHARS}
          placeholder="Founded by Maren"
          autoComplete="off"
          autoFocus
          required
          style={{ fontSize: 16 }}
        />
        <span className="flabel" style={{ color: "var(--muted)" }}>
          A FEW KEY WORDS: UP TO {FACT_MAX_WORDS_TEXT.toUpperCase()} WORDS. THERE IS NO WRONG ANSWER, ONLY WHAT THE CITY BELIEVES.
        </span>
      </div>

      <button
        type="submit"
        className={`btn btn-lg btn-block${affordable ? " btn-purple" : ""}`}
        aria-disabled={!affordable}
      >
        {affordable ? (
          <>
            ADD TO THE PAGE <Cost n={COSTS.wikiEdit} />
          </>
        ) : (
          "REST FIRST"
        )}
      </button>

      <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)" }}>
        {profile.is_witch
          ? "As a witch, what you add goes straight onto the page. Nobody needs to approve it."
          : "Everyone else sees it only once a witch has read and kept it. Until then it is just for you and the witches. They can keep it, change the wording, or send it back."}
      </div>
    </form>
  );
}
