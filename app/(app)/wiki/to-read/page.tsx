import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMe } from "@/lib/data";
import { getWaitingFacts } from "@/lib/wiki";
import { reviewFact } from "@/lib/wiki-actions";
import { FACT_MAX_CHARS } from "@/lib/wiki-fact";
import { ago } from "@/lib/crystr";

/** What the City has added to the wiki, waiting for a witch. */
export default async function ToRead() {
  const { profile } = await requireMe();
  if (!profile.is_witch) redirect("/wiki");
  const facts = await getWaitingFacts();

  return (
    <div className="pad" style={{ gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/wiki" className="btn btn-sm">
          ← THE WIKI
        </Link>
        <div className="spacer" />
        <span className="px" style={{ fontSize: 9, color: "var(--text-3)" }}>
          {facts.length} WAITING
        </span>
      </div>

      <div>
        <div className="screen-title">TO READ</div>
        <div className="screen-intro">
          New facts the City has added to the wiki. Nothing here is wrong. Keep what fits the
          world, tidy what almost does, and send back what does not.
        </div>
      </div>

      {facts.length === 0 ? (
        <div className="empty">
          NOTHING WAITING
          <br />
          <span style={{ color: "var(--muted)" }}>EVERYTHING THE CITY ADDED HAS BEEN READ.</span>
        </div>
      ) : null}

      {facts.map((f) => (
        <form key={f.id} action={reviewFact} className="card" style={{ gap: 9 }}>
          <input type="hidden" name="id" value={f.id} />
          <div className="px" style={{ fontSize: 8, color: "var(--muted)" }}>
            <Link href={`/wiki/${f.page.slug}`} style={{ color: "inherit" }}>
              {f.page.title.toUpperCase()}
            </Link>{" "}
            · {(f.author?.handle ?? "unknown").toUpperCase()} · {ago(f.created_at).toUpperCase()}
          </div>
          <input
            name="text"
            className="input"
            maxLength={FACT_MAX_CHARS}
            defaultValue={f.body}
            aria-label="Keep it in these words"
            style={{ fontSize: 13.5 }}
          />
          <input name="note" className="input" maxLength={200} placeholder="A note if you send it back (optional)" style={{ fontSize: 12 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" name="act" value="keep" className="btn btn-sm btn-purple" style={{ flex: 1, minHeight: 36 }}>
              KEEP
            </button>
            <button type="submit" name="act" value="return" className="btn btn-sm" style={{ flex: 1, minHeight: 36 }}>
              SEND BACK
            </button>
          </div>
        </form>
      ))}
    </div>
  );
}
