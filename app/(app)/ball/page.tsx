import Link from "next/link";
import { requireMe, getArticles, type Article } from "@/lib/data";
import { setArticleStatus } from "@/lib/actions";
import { byline, COSTS } from "@/lib/crystr";

export default async function BallPage({
  searchParams,
}: {
  searchParams: { as?: string };
}) {
  const { userId, profile } = await requireMe();
  const all = await getArticles();

  // A witch can look at the Ball as a player sees it — the prototype's
  // VIEWING AS switch, kept honest: a player cannot switch the other way.
  const asWitch = profile.is_witch && searchParams.as !== "player";

  const visible = asWitch
    ? all
    : all.filter((a) => a.status === "published" || a.author_id === userId);
  const queue = asWitch ? all.filter((a) => a.status === "pending") : [];

  return (
    <div className="pad">
      <div>
        <div
          className="px"
          style={{
            fontSize: 14,
            letterSpacing: ".02em",
            background: "linear-gradient(90deg,#4c7df0,#9184d9 60%,#e0398a)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            marginBottom: 6,
          }}
        >
          CRYSTR BALL
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--dim)" }}>
          What the City is told, and when. Free to read; the well makes its money
          elsewhere.
        </div>
      </div>

      {profile.is_witch ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "7px 9px",
            borderRadius: "var(--px-r)",
            background: "var(--inset)",
            boxShadow: "inset 0 0 0 1px var(--edge)",
          }}
        >
          <span className="px" style={{ fontSize: 8, color: "var(--dim)" }}>
            VIEWING AS
          </span>
          <span className="spacer" />
          <Link
            href="/ball"
            className="px"
            style={{
              minHeight: 30,
              padding: "0 10px",
              display: "grid",
              placeItems: "center",
              borderRadius: 4,
              fontSize: 8.5,
              background: asWitch ? "rgba(145,132,217,.3)" : "transparent",
              color: asWitch ? "var(--pur-bright)" : "var(--muted)",
            }}
          >
            WITCH
          </Link>
          <Link
            href="/ball?as=player"
            className="px"
            style={{
              minHeight: 30,
              padding: "0 10px",
              display: "grid",
              placeItems: "center",
              borderRadius: 4,
              fontSize: 8.5,
              background: !asWitch ? "rgba(224,57,138,.26)" : "transparent",
              color: !asWitch ? "var(--mag-pale)" : "var(--muted)",
            }}
          >
            PLAYER
          </Link>
        </div>
      ) : null}

      {asWitch ? (
        <div className="witchbar">
          <span className="px" style={{ fontSize: 8.5, color: "var(--pur-pale)" }}>
            WITCH ACCESS
          </span>
          <span className="spacer" />
          <Link href="/ball/new" className="btn btn-sm btn-purple" style={{ minHeight: 36 }}>
            ＋ NEW DISPATCH
          </Link>
        </div>
      ) : (
        <Link href="/ball/new?kind=oped" className="btn btn-mag btn-block" style={{ minHeight: 44 }}>
          ✎ SUBMIT AN OP-ED · -{COSTS.oped}
        </Link>
      )}

      {queue.length ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: 11,
            borderRadius: "var(--px-r)",
            background: "var(--inset)",
            boxShadow: "inset 0 0 0 1px var(--pur-edge)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="px" style={{ fontSize: 9.5, color: "var(--pur-pale)" }}>
              IN REVIEW
            </span>
            <span className="px" style={{ fontSize: 9.5, color: "var(--mag-soft)" }}>
              {queue.length}
            </span>
            <span className="spacer" />
            <span style={{ fontSize: 10.5, color: "var(--muted)" }}>player op-eds</span>
          </div>

          {queue.map((a) => (
            <div key={a.id} className="card" style={{ padding: 11, gap: 8 }}>
              <div className="px" style={{ fontSize: 8, color: "var(--mag-soft)" }}>
                OP-ED · {a.author.handle.toUpperCase()}
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.3, textWrap: "pretty" }}>
                {a.headline}
              </div>
              {a.standfirst ? (
                <div style={{ fontSize: 11.5, lineHeight: 1.5, color: "var(--dim)" }}>
                  {a.standfirst}
                </div>
              ) : null}
              <div style={{ display: "flex", gap: 7 }}>
                <Link href={`/ball/${a.id}`} className="btn btn-sm" style={{ minHeight: 38 }}>
                  READ
                </Link>
                <ReviewButton id={a.id} status="published" label="APPROVE" tone="btn-blue" />
                <ReviewButton id={a.id} status="returned" label="RETURN" tone="btn-mag" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {visible.map((a) => (
        <Link key={a.id} href={`/ball/${a.id}`} className="card" style={{ padding: 0, gap: 0, overflow: "hidden", color: "var(--text)" }}>
          {a.banner ? (
            <div
              className="placeholder"
              style={{ height: 96, borderRadius: 0, boxShadow: "none" }}
            >
              <span>{a.banner_label || "IMAGE — PENDING TILE"}</span>
            </div>
          ) : null}
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span className="kicker">{a.kicker}</span>
              <Pill article={a} />
            </div>
            <div className="headline">{a.headline}</div>
            {a.standfirst ? <div className="standfirst">{a.standfirst}</div> : null}
            <div className="byline" style={{ marginTop: 2 }}>
              {byline(a.author.handle, a.status, a.created_at, a.published_at, a.byline_name)}
            </div>
          </div>
        </Link>
      ))}

      {visible.length === 0 ? (
        <div className="empty">
          THE CITY HAS NOT BEEN TOLD ANYTHING YET
          <br />
          <span style={{ color: "var(--muted)" }}>
            {asWitch ? "THAT IS YOUR JOB." : "A WITCH WILL GET TO IT."}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function Pill({ article }: { article: Article }) {
  const map = {
    draft: ["DRAFT", "pill-draft"],
    pending: ["IN REVIEW", "pill-review"],
    returned: ["RETURNED", "pill-returned"],
    published: null,
  } as const;
  const hit = map[article.status];
  if (!hit) return null;
  return <span className={`pill ${hit[1]}`}>{hit[0]}</span>;
}

function ReviewButton({
  id,
  status,
  label,
  tone,
}: {
  id: number;
  status: string;
  label: string;
  tone: string;
}) {
  return (
    <form action={setArticleStatus} style={{ flex: 1, display: "flex" }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={`btn btn-block ${tone}`} style={{ minHeight: 38, fontSize: 8.5 }}>
        {label}
      </button>
    </form>
  );
}
