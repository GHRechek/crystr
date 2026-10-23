import Link from "next/link";
import { requireMe } from "@/lib/data";
import { getWikiPages, searchWikiPages, type WikiHit, type WikiListing } from "@/lib/wiki";
import { cleanQuery } from "@/lib/wiki-search";
import { ago, corrupt, COSTS, decayLevel } from "@/lib/crystr";

// The low-mana wash is applied by the app layout; this page only has to eat the
// letters (corrupt) in the words it shows.
export default async function WikiIndex(props: { searchParams: Promise<{ q?: string }> }) {
  const searchParams = await props.searchParams;
  const { profile } = await requireMe();
  const witch = profile.is_witch;
  const decay = decayLevel(profile.mana);
  const q = cleanQuery(searchParams.q);
  const hits = q ? await searchWikiPages(q) : null;
  const pages = hits ? [] : await getWikiPages(witch);
  const live = pages.filter((p) => !p.archived);
  const archived = pages.filter((p) => p.archived);
  const waiting = witch ? live.reduce((n, p) => n + p.waiting, 0) : 0;

  return (
    <div className="pad" style={{ gap: 13 }}>
      <div>
        <h1 className="screen-title">THE WIKI</h1>
        <div className="screen-intro">
          What the City knows, a few words at a time. Reading is free. Adding a fact to a page
          takes {COSTS.wikiEdit}, and a witch reads everything before the City sees it.
        </div>
      </div>

      {witch ? (
        <div className="witchbar">
          <span className="px" style={{ fontSize: 11, color: "var(--pur-pale)" }}>
            WITCH ACCESS
          </span>
          <span className="spacer" />
          <Link href="/wiki/to-read" className="btn btn-sm" style={{ minHeight: 40 }}>
            TO READ · {waiting}
          </Link>
          <Link href="/wiki/new" className="btn btn-sm btn-purple" style={{ minHeight: 40 }}>
            ＋ NEW PAGE
          </Link>
        </div>
      ) : null}

      <form action="/wiki" method="get" role="search" style={{ display: "flex", gap: 8 }}>
        <input
          name="q"
          type="search"
          className="input"
          defaultValue={q}
          maxLength={80}
          placeholder="Search the wiki"
          aria-label="Search the wiki"
          style={{ flex: 1, minWidth: 0 }}
        />
        <button type="submit" className="btn">
          SEARCH
        </button>
      </form>

      {hits ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
              {hits.length === 0
                ? "NOTHING FOR"
                : `${hits.length}${hits.length === 50 ? "+" : ""} ${hits.length === 1 ? "PAGE" : "PAGES"} FOR`}{" "}
              “{q.toUpperCase()}”
            </div>
            <div className="spacer" />
            <Link href="/wiki" className="btn btn-sm">
              ✕ CLEAR
            </Link>
          </div>

          {hits.map((h) => (
            <Hit key={h.id} hit={h} decay={decay} />
          ))}

          {hits.length === 0 ? (
            <div className="empty">
              NO PAGE MENTIONS THAT
              {witch ? (
                <>
                  <br />
                  <Link href={`/wiki/new?title=${encodeURIComponent(q)}`} style={{ color: "var(--pur-pale)" }}>
                    START A PAGE CALLED “{q.toUpperCase()}”
                  </Link>
                </>
              ) : null}
            </div>
          ) : null}
        </>
      ) : live.length === 0 ? (
        <div className="empty">
          NOTHING HAS BEEN WRITTEN DOWN YET
          <br />
          <span style={{ color: "var(--muted)" }}>{witch ? "START A PAGE." : "A WITCH WILL START ONE."}</span>
        </div>
      ) : (
        live.map((p) => <Row key={p.id} page={p} decay={decay} witch={witch} />)
      )}

      {!hits && witch && archived.length ? (
        <>
          <div className="px" style={{ fontSize: 11, color: "var(--dim)", marginTop: 6 }}>
            ARCHIVED · ONLY WITCHES SEE THESE
          </div>
          {archived.map((p) => (
            <Row key={p.id} page={p} decay={decay} witch={witch} />
          ))}
        </>
      ) : null}
    </div>
  );
}

function Row({ page, decay, witch }: { page: WikiListing; decay: number; witch: boolean }) {
  return (
    <Link
      href={`/wiki/${page.slug}`}
      className="card"
      style={{ gap: 4, textDecoration: "none", opacity: page.archived ? 0.55 : 1 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 14.5, fontWeight: 500, letterSpacing: "-.01em", flex: 1, minWidth: 0 }}>
          {corrupt(page.title, decay)}
        </div>
        {page.locked ? (
          <span className="px" style={{ fontSize: 11, color: "var(--mag-soft)" }}>
            ◈ PAUSED
          </span>
        ) : null}
      </div>
      <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
        /{page.slug} · {page.facts} {page.facts === 1 ? "FACT" : "FACTS"}
        {witch && page.waiting ? ` · ${page.waiting} WAITING FOR A WITCH` : ""} · EDITED {ago(page.updated_at)}
      </div>
    </Link>
  );
}

function Hit({ hit, decay }: { hit: WikiHit; decay: number }) {
  return (
    <Link
      href={`/wiki/${hit.slug}`}
      className="card"
      style={{ gap: 5, textDecoration: "none", opacity: hit.archived ? 0.55 : 1 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 14.5, fontWeight: 500, letterSpacing: "-.01em", flex: 1, minWidth: 0 }}>
          {corrupt(hit.title, decay)}
        </div>
        {hit.archived ? (
          <span className="px" style={{ fontSize: 11, color: "var(--mag-soft)" }}>
            ARCHIVED
          </span>
        ) : null}
      </div>
      <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
        /{hit.slug} · MATCHES THE {hit.in === "fact" ? "FACTS" : hit.in.toUpperCase()}
      </div>
      {hit.fact ? (
        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--text-2)" }}>{corrupt(hit.fact, decay)}</div>
      ) : null}
    </Link>
  );
}
