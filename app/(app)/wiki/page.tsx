import Link from "next/link";
import { requireMe } from "@/lib/data";
import { getWikiPages, nestPages, searchWikiPages, type WikiHit, type WikiListing } from "@/lib/wiki";
import { cleanQuery } from "@/lib/wiki-search";
import { wikiText } from "@/lib/wiki-mask";
import { WellHint } from "@/components/well-hint";
import { ago, COSTS, decayLevel } from "@/lib/crystr";

// The low-mana wash is applied by the app layout; this page only has to break the
// numbers, then the letters, in the words it shows (wikiText).
export default async function WikiIndex(props: { searchParams: Promise<{ q?: string }> }) {
  const searchParams = await props.searchParams;
  const { profile, userId } = await requireMe();
  const witch = profile.is_witch;
  const decay = decayLevel(profile.mana);
  const q = cleanQuery(searchParams.q);
  const hits = q ? await searchWikiPages(q) : null;
  const pages = hits ? [] : await getWikiPages(witch);
  const live = pages.filter((p) => !p.archived);
  const archived = pages.filter((p) => p.archived);
  const waiting = witch ? live.reduce((n, p) => n + p.waiting, 0) : 0;

  return (
    <div className="pad" style={{ gap: 12 }}>
      {profile.onboarded === false ? null : <WellHint userId={userId} mana={profile.mana} />}
      <div>
        <h1 className="screen-title">THE WIKI</h1>
        <div className="screen-intro">
          What the City knows, a few words at a time. Reading is free, and a witch reads everything
          before the City sees it.
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
            <Hit key={h.id} hit={h} decay={decay} witch={witch} />
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
        nestPages(live).map(({ page, under }) => (
          <div key={page.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Row page={page} decay={decay} witch={witch} />
            {under.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginLeft: 18, borderLeft: "2px solid var(--edge)", paddingLeft: 10 }}>
                {under.map((c) => (
                  <Row key={c.id} page={c} decay={decay} witch={witch} />
                ))}
              </div>
            ) : null}
          </div>
        ))
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
          <span className="wiki-px" style={{ fontSize: 16 }}>{wikiText(page.title, decay, witch)}</span>
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

function Hit({ hit, decay, witch }: { hit: WikiHit; decay: number; witch: boolean }) {
  const mask = (t: string) => wikiText(t, decay, witch);
  return (
    <Link
      href={`/wiki/${hit.slug}`}
      className="card"
      style={{ gap: 5, textDecoration: "none", opacity: hit.archived ? 0.55 : 1 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 14.5, fontWeight: 500, letterSpacing: "-.01em", flex: 1, minWidth: 0 }}>
          <span className="wiki-px" style={{ fontSize: 16 }}>{mask(hit.title)}</span>
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
        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--text-2)" }}>{mask(hit.fact)}</div>
      ) : null}
    </Link>
  );
}
