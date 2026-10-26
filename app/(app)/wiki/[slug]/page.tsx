import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMe } from "@/lib/data";
import { getWikiChildren, getWikiFacts, getWikiPage, getWikiPageById, SLUG, touchWikiPage, type WikiFact } from "@/lib/wiki";
import { moderateWikiPage, removeFact } from "@/lib/wiki-actions";
import { layoutPage } from "@/lib/wiki-layout";
import { wikiText } from "@/lib/wiki-mask";
import { WellHint } from "@/components/well-hint";
import { runePosition } from "@/lib/wiki-runes";
import { ArrowIcon } from "@/components/icons";
import { COSTS } from "@/lib/crystr";
import { Cost } from "@/components/mana";
import { ago, decayLevel } from "@/lib/crystr";

const TEXT = { fontSize: 16, lineHeight: 1.4 } as const;

/** What a person added: sharp, same size as the text around it. */
const FOCUS = { color: "#fff", fontWeight: 700 } as const;

/** Each word drifts on its own: its own pace, its own starting point, its own small direction. */
function floatOf(seed: number): React.CSSProperties {
  const h = (n: number) => Math.abs(Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453) % 1;
  return {
    animationDuration: `${(7 + h(1) * 7).toFixed(1)}s`,
    animationDelay: `-${(h(2) * 14).toFixed(1)}s`,
    // Every word moves a visible amount (1.2 to 3 pixels), each in its own direction.
    ["--dx" as string]: `${((h(3) < 0.5 ? -1 : 1) * (1.2 + h(5) * 1.8)).toFixed(1)}px`,
    ["--dy" as string]: `${((h(4) < 0.5 ? -1 : 1) * (1.2 + h(6) * 1.8)).toFixed(1)}px`,
  } as React.CSSProperties;
}

/** A fact as a run of single words, each one floating by itself. */
function Words({ text, id }: { text: string; id: number }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <span key={i}>
          <span className="wiki-word" style={floatOf(id * 31 + i * 7 + 1)}>
            {w}
          </span>{" "}
        </span>
      ))}
    </>
  );
}

/** A fact reads as a sentence in the paragraph: end it with a full stop. */
function sentence(text: string): string {
  return /[.!?…]$/.test(text) ? text : `${text}.`;
}

// The low-mana wash is applied by the app layout; this page only has to break the
// numbers, then the letters, in the facts it shows (wikiText).
export default async function WikiPageView(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const { profile, userId } = await requireMe();
  if (!SLUG.test(params.slug)) notFound();

  const page = await getWikiPage(params.slug);
  if (!page) notFound();

  // Opening a page moves it to the top of this person's list.
  await touchWikiPage(page.id);
  const [facts, parent, children] = await Promise.all([
    getWikiFacts(page.id),
    page.parent_id ? getWikiPageById(page.parent_id) : Promise.resolve(null),
    getWikiChildren(page.id),
  ]);
  const witch = profile.is_witch;
  const decay = decayLevel(profile.mana);
  const paused = page.locked && !witch;
  // Low on mana, numbers break first, then letters; witches read everything (lib/wiki-mask.ts).
  const mask = (t: string) => wikiText(t, decay, witch);

  // The facts this person sees, in the order they were added: every kept one, plus their
  // own waiting one(s). Returned ones are mentioned below the article instead.
  const kept = facts.filter((f) => f.status === "kept");
  const mine = facts.filter((f) => f.status !== "kept" && f.author?.id === userId);
  const shown = [...kept, ...mine.filter((m) => m.status === "pending")].sort((x, y) => x.slot - y.slot);
  const filled = kept.length;
  const paragraphs = layoutPage(page.id, shown, children);

  return (
    <div className="pad" style={{ gap: 12 }}>
      {profile.onboarded === false ? null : <WellHint userId={userId} mana={profile.mana} />}
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
          margin: "0 -16px",
          padding: "16px 16px 18px",
          borderTop: "1px solid var(--edge)",
          borderBottom: "1px solid var(--edge)",
        }}
      >
        <header style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 12, borderBottom: "1px solid var(--rule)" }}>
          <h1
            className="wiki-px wiki-title"
            style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.1, letterSpacing: ".01em", overflowWrap: "anywhere" }}
          >
            {mask(page.title)}
          </h1>
          <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
            {filled} {filled === 1 ? "FACT" : "FACTS"} · EDITED {ago(page.updated_at)}
            {page.updated_by ? ` BY ${page.updated_by.handle}` : ""}
          </div>
          {parent ? (
            <Link href={`/wiki/${parent.slug}`} className="px" style={{ fontSize: 11, color: "var(--pur-pale)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <ArrowIcon dir="up" /> PART OF {mask(parent.title).toUpperCase()}
            </Link>
          ) : null}
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
              ) : piece.kind === "link" ? (
                <Link
                  key={i}
                  href={`/wiki/${piece.page.slug}`}
                  className="wiki-fact"
                  style={{ ...FOCUS, color: "var(--blu-mid)", borderBottom: "1px dotted var(--blu)", textDecoration: "none", padding: "0 2px" }}
                >
                  {/* A link drifts as one piece, arrow and all, and only a little: it is a way
                      out of the page, not a word floating in it. */}
                  <span className="wiki-word" style={{ ...floatOf(piece.page.id * 101), ["--dx" as string]: "0.6px", ["--dy" as string]: "0.6px", animationDuration: "16s", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 5 }}>
                    {mask(piece.page.title)}
                    <ArrowIcon />
                  </span>
                </Link>
              ) : piece.fact.status === "pending" ? (
                <Link
                  key={i}
                  href={paused ? `/wiki/${page.slug}` : `/wiki/${page.slug}/add/${piece.fact.slot}`}
                  className="wiki-fact"
                  style={{
                    ...FOCUS,
                    color: "var(--pur-pale)",
                    background: "rgba(140,90,230,.14)",
                    borderBottom: "1px dashed var(--pur)",
                    textDecoration: "none",
                    padding: "0 2px",
                  }}
                >
                  <Words text={sentence(mask(piece.fact.body))} id={piece.fact.id} />
                </Link>
              ) : (
                <span key={i} className="wiki-fact" style={FOCUS}>
                  <Words text={sentence(mask(piece.fact.body))} id={piece.fact.id} />
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
              ＋ ADD SOMETHING <Cost n={COSTS.wikiEdit} />
            </Link>
            <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--muted)" }}>
              A few key words about {page.title}. It joins the page once a witch has read it.
            </div>
          </div>
        )}

        {children.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 12, borderTop: "1px solid var(--rule)" }}>
            <div className="px" style={{ fontSize: 11, color: "var(--pur-pale)" }}>
              UNDER THIS
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {children.map((c) => (
                <Link key={c.id} href={`/wiki/${c.slug}`} className="btn btn-sm" style={{ minHeight: 40, gap: 6 }}>
                  <span className="wiki-px" style={{ fontSize: 14 }}>{mask(c.title)}</span>
                  <ArrowIcon />
                </Link>
              ))}
            </div>
          </div>
        ) : null}
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
