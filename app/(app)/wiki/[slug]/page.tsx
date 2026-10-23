import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMe } from "@/lib/data";
import { getWikiFacts, getWikiPage, SLUG, touchWikiPage, type WikiFact } from "@/lib/wiki";
import { moderateWikiPage, removeFact } from "@/lib/wiki-actions";
import { layoutPage } from "@/lib/wiki-layout";
import { runePosition } from "@/lib/wiki-runes";
import { COSTS } from "@/lib/crystr";
import { ago, corrupt, decayLevel } from "@/lib/crystr";

const TEXT = { fontSize: 16, lineHeight: 1.4 } as const;

/** What a person added: sharp, same size as the text around it. */
const FOCUS = { color: "#fff", fontWeight: 700 } as const;

/** Each fact drifts at its own slow pace, starting at its own point in the drift. */
function floatOf(id: number) {
  return { animationDuration: `${9 + (id % 5)}s`, animationDelay: `-${(id * 3.7) % 9}s` };
}

/** A fact reads as a sentence in the paragraph: end it with a full stop. */
function sentence(text: string): string {
  return /[.!?…]$/.test(text) ? text : `${text}.`;
}

// The low-mana wash is applied by the app layout; this page only has to eat the
// letters (corrupt) in the facts it shows.
export default async function WikiPageView(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const { profile, userId } = await requireMe();
  if (!SLUG.test(params.slug)) notFound();

  const page = await getWikiPage(params.slug);
  if (!page) notFound();

  // Opening a page moves it to the top of this person's list.
  await touchWikiPage(page.id);
  const facts = await getWikiFacts(page.id);
  const witch = profile.is_witch;
  const decay = decayLevel(profile.mana);
  const paused = page.locked && !witch;

  // The facts this person sees, in the order they were added: every kept one, plus their
  // own waiting one(s). Returned ones are mentioned below the article instead.
  const kept = facts.filter((f) => f.status === "kept");
  const mine = facts.filter((f) => f.status !== "kept" && f.author?.id === userId);
  const shown = [...kept, ...mine.filter((m) => m.status === "pending")].sort((x, y) => x.slot - y.slot);
  const filled = kept.length;
  const paragraphs = layoutPage(page.id, shown);

  return (
    <div className="pad" style={{ gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/wiki" className="btn btn-sm">
          ← THE WIKI
        </Link>
        <div className="spacer" />
        {page.archived ? (
          <span className="px" style={{ fontSize: 11, color: "var(--mag-soft)" }}>
            ARCHIVED
          </span>
        ) : null}
        {page.locked ? (
          <span className="px" style={{ fontSize: 11, color: "var(--mag-soft)" }}>
            ◈ PAUSED
          </span>
        ) : null}
      </div>

      {/* The article: its title at the head, then the text the City is writing. */}
      <article
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          padding: "16px 14px 18px",
          background: "var(--surface)",
          boxShadow: "0 0 0 1px var(--edge)",
          borderRadius: "var(--px-r)",
        }}
      >
        <header style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 12, borderBottom: "1px solid var(--rule)" }}>
          <h1
            className="wiki-px wiki-title"
            style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.1, letterSpacing: ".01em", overflowWrap: "anywhere" }}
          >
            {corrupt(page.title, decay)}
          </h1>
          <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
            {filled} {filled === 1 ? "FACT" : "FACTS"} · EDITED {ago(page.updated_at)}
            {page.updated_by ? ` BY ${page.updated_by.handle}` : ""}
          </div>
        </header>

        {/* A few paragraphs in runes, with what the City has added standing in bold letters
            inside them, two facts to a paragraph. */}
        {paragraphs.map((pieces, pi) => (
          <p
            key={pi}
            className="wiki-px"
            style={{ ...TEXT, margin: 0, textAlign: "left", color: "var(--text-2)" }}
          >
            {pieces.map((piece, i) =>
              piece.kind === "runes" ? (
                <span key={i} aria-hidden>
                  {piece.words.map((word, wi) => (
                    <span key={wi} className="rune-word">
                      {word.map((g, gi) => (
                        <span key={gi} className="rune" style={{ backgroundPosition: runePosition(g) }} />
                      ))}
                    </span>
                  ))}{" "}
                </span>
              ) : piece.fact.status === "pending" ? (
                <Link
                  key={i}
                  href={paused ? `/wiki/${page.slug}` : `/wiki/${page.slug}/add/${piece.fact.slot}`}
                  className="wiki-fact"
                  style={{
                    ...floatOf(piece.fact.id),
                    ...FOCUS,
                    color: "var(--pur-pale)",
                    background: "rgba(140,90,230,.14)",
                    borderBottom: "1px dashed var(--pur)",
                    textDecoration: "none",
                    padding: "0 2px",
                  }}
                >
                  {sentence(corrupt(piece.fact.body, decay))}{" "}
                </Link>
              ) : (
                <span key={i} className="wiki-fact" style={{ ...FOCUS, ...floatOf(piece.fact.id) }}>
                  {sentence(corrupt(piece.fact.body, decay))}{" "}
                </span>
              ),
            )}
          </p>
        ))}

        {paused ? (
          <div className="screen-intro" style={{ margin: 0 }}>
            A witch has paused this page for now.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Link href={`/wiki/${page.slug}/add`} className="btn btn-lg btn-block btn-purple">
              ＋ ADD SOMETHING
            </Link>
            <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--muted)" }}>
              A few key words about {page.title}. It costs {COSTS.wikiEdit} mana and joins the page once a witch has read it.
            </div>
          </div>
        )}
      </article>

      {mine.map((m) => (
        <div key={m.id} className="notice" style={m.status === "pending" ? { borderColor: "var(--pur)" } : undefined}>
          {m.status === "pending"
            ? `YOU ADDED “${m.body}”. ONLY YOU AND THE WITCHES CAN SEE IT UNTIL IT HAS BEEN READ.`
            : `A WITCH SENT BACK “${m.body}”${m.note ? ` — ${m.note}` : ""}. YOU CAN ADD SOMETHING ELSE ABOVE.`}
        </div>
      ))}

      {witch && kept.length ? (
        <div className="tile" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="px" style={{ fontSize: 11, color: "var(--pur-pale)" }}>
            THE FACTS ON THIS PAGE
          </div>
          {kept.map((f) => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "var(--text-2)" }}>
                {f.body}
                <span className="px" style={{ display: "block", fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                  {(f.author?.handle ?? "unknown").toUpperCase()} · {ago(f.created_at).toUpperCase()}
                </span>
              </div>
              <form action={removeFact}>
                <input type="hidden" name="id" value={f.id} />
                <input type="hidden" name="slug" value={page.slug} />
                <button type="submit" className="btn btn-sm" style={{ minHeight: 40, fontSize: 11, padding: "0 8px" }}>
                  TAKE DOWN
                </button>
              </form>
            </div>
          ))}
        </div>
      ) : null}

      {witch ? (
        <div className="witchbar" style={{ flexWrap: "wrap", gap: 8 }}>
          <span className="px" style={{ fontSize: 11, color: "var(--pur-pale)" }}>
            MODERATE
          </span>
          <span className="spacer" />
          <Moderate id={page.id} slug={page.slug} act={page.locked ? "unlock" : "lock"} label={page.locked ? "UNPAUSE" : "PAUSE"} />
          <Moderate id={page.id} slug={page.slug} act={page.archived ? "restore" : "archive"} label={page.archived ? "RESTORE" : "ARCHIVE"} />
        </div>
      ) : null}
    </div>
  );
}

function Moderate({ id, slug, act, label }: { id: number; slug: string; act: string; label: string }) {
  return (
    <form action={moderateWikiPage}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="act" value={act} />
      <button type="submit" className="btn btn-sm" style={{ minHeight: 40 }}>
        {label}
      </button>
    </form>
  );
}
