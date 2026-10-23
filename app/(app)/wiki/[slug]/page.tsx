import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMe } from "@/lib/data";
import { getWikiFacts, getWikiPage, SLUG, touchWikiPage, type WikiFact } from "@/lib/wiki";
import { moderateWikiPage, removeFact } from "@/lib/wiki-actions";
import { fillerChunk } from "@/lib/wiki-filler";
import { ago, corrupt, decayLevel } from "@/lib/crystr";

const TEXT = { fontSize: 14, lineHeight: 1.75 } as const;

/** Blurred by a soft glow where the letters were, rather than a filter, so it
 *  wraps and justifies like any other run of text. */
const BLUR = {
  color: "transparent",
  textShadow: "0 0 5px rgba(170,176,214,.9)",
  userSelect: "none",
  pointerEvents: "none",
} as const;

/** What a person added: sharp, same size as the text around it. */
const FOCUS = { color: "var(--text)", fontWeight: 500 } as const;

const CHIP = {
  display: "inline-block",
  fontSize: 11,
  lineHeight: 1,
  padding: "4px 7px",
  margin: "0 2px",
  border: "1px dashed var(--pur)",
  borderRadius: 3,
  color: "var(--pur-pale)",
  textDecoration: "none",
  textIndent: 0,
  verticalAlign: "1px",
} as const;

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

  // What each slot holds for this person: the kept fact, or their own waiting
  // or sent-back one, or nothing (open).
  const kept = new Map<number, WikiFact>();
  const mine = new Map<number, WikiFact>();
  for (const f of facts) {
    if (f.status === "kept") kept.set(f.slot, f);
    else if (f.author?.id === userId) mine.set(f.slot, f);
  }
  const filled = kept.size;

  // Three gaps to a paragraph, in order.
  const paragraphs: number[][] = [];
  for (let slot = 1; slot <= page.slots; slot++) {
    if (paragraphs.length === 0 || paragraphs[paragraphs.length - 1].length === 3) paragraphs.push([]);
    paragraphs[paragraphs.length - 1].push(slot);
  }

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

      <div>
        <h1 style={{ fontSize: 25, fontWeight: 500, lineHeight: 1.15, letterSpacing: "-.025em" }}>
          {corrupt(page.title, decay)}
        </h1>
        <div className="px" style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
          {filled} {filled === 1 ? "FACT" : "FACTS"} · EDITED {ago(page.updated_at)}
          {page.updated_by ? ` BY ${page.updated_by.handle}` : ""}
        </div>
      </div>

      <div className="screen-intro" style={{ margin: 0 }}>
        {paused
          ? "A witch has paused this page for now."
          : "Tap a gap to add a few key words. A witch will read what you write."}
      </div>

      {/* The page is a few paragraphs of text nobody can read, with the facts the
          City has added standing in focus inside it, as if they were part of the
          prose. Open gaps are small chips in the same flow. */}
      {paragraphs.map((slots, pi) => (
        <p key={pi} style={{ ...TEXT, margin: 0, textAlign: "justify", textIndent: "1.6em", color: "var(--text-2)" }}>
          {slots.map((slot) => {
            const fact = kept.get(slot);
            const own = mine.get(slot);
            return (
              <span key={slot}>
                <span aria-hidden style={BLUR}>
                  {fillerChunk(page.id, slot)}{" "}
                </span>
                {fact ? (
                  <span style={FOCUS}>{sentence(corrupt(fact.body, decay))} </span>
                ) : own?.status === "pending" ? (
                  <Link
                    href={paused ? `/wiki/${page.slug}` : `/wiki/${page.slug}/add/${slot}`}
                    style={{
                      ...FOCUS,
                      color: "var(--pur-pale)",
                      background: "rgba(140,90,230,.14)",
                      borderBottom: "1px dashed var(--pur)",
                      textDecoration: "none",
                      padding: "0 2px",
                    }}
                  >
                    {sentence(corrupt(own.body, decay))}
                  </Link>
                ) : paused ? null : (
                  <Link href={`/wiki/${page.slug}/add/${slot}`} className="px" style={CHIP}>
                    ＋ ADD
                  </Link>
                )}{" "}
              </span>
            );
          })}
        </p>
      ))}

      {[...mine.values()].map((m) => (
        <div key={m.id} className="notice" style={m.status === "pending" ? { borderColor: "var(--pur)" } : undefined}>
          {m.status === "pending"
            ? `YOU ADDED “${m.body}”. ONLY YOU AND THE WITCHES CAN SEE IT UNTIL IT HAS BEEN READ.`
            : `A WITCH SENT BACK “${m.body}”${m.note ? ` — ${m.note}` : ""}. THE GAP IS OPEN IF YOU WANT TO TRY AGAIN.`}
        </div>
      ))}

      {witch && kept.size ? (
        <div className="tile" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="px" style={{ fontSize: 11, color: "var(--pur-pale)" }}>
            THE FACTS ON THIS PAGE
          </div>
          {[...kept.values()].map((f) => (
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
