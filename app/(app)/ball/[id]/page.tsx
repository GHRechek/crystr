import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMe, getArticle } from "@/lib/data";
import { setArticleStatus } from "@/lib/actions";
import { byline, paragraphs, readTime } from "@/lib/crystr";

export default async function ArticlePage({ params }: { params: { id: string } }) {
  const { profile } = await requireMe();
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const article = await getArticle(id);
  if (!article) notFound();

  const isWitch = profile.is_witch;
  const pending = article.status === "pending";
  const nextStatus =
    pending || article.status === "draft" || article.status === "returned"
      ? "published"
      : "draft";
  const statusLabel = pending
    ? "APPROVE"
    : article.status === "published"
      ? "UNPUBLISH"
      : "PUBLISH";

  return (
    <div style={{ paddingBottom: 24 }}>
      {article.banner ? (
        <div className="placeholder" style={{ height: 150, borderRadius: 0, boxShadow: "none" }}>
          <span>{article.banner_label || "IMAGE — PENDING TILE"}</span>
        </div>
      ) : null}

      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <Link href="/ball" className="btn btn-sm" style={{ alignSelf: "flex-start" }}>
          ← CRYSTR BALL
        </Link>

        <div>
          <div className="kicker" style={{ display: "block", marginBottom: 9, fontSize: 8.5 }}>
            {article.kicker}
            {article.status === "draft" ? " · DRAFT" : ""}
          </div>
          <div
            style={{
              fontSize: 25,
              fontWeight: 500,
              lineHeight: 1.15,
              letterSpacing: "-.025em",
              marginBottom: 10,
              textWrap: "pretty",
            }}
          >
            {article.headline}
          </div>
          {article.standfirst ? (
            <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--text-3)", textWrap: "pretty" }}>
              {article.standfirst}
            </div>
          ) : null}
        </div>

        <div
          className="byline"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 0",
            borderTop: "1px solid var(--rule)",
            borderBottom: "1px solid var(--rule)",
          }}
        >
          <span>{byline(article.author.handle, article.status, article.created_at, article.published_at, article.byline_name)}</span>
          <span className="spacer" />
          <span>{readTime(article.body)}</span>
        </div>

        {paragraphs(article.body).map((p, i) => (
          <div key={i} style={{ fontSize: 14, lineHeight: 1.65, color: "var(--text-2)", textWrap: "pretty" }}>
            {p}
          </div>
        ))}

        {isWitch ? (
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            {pending ? (
              <form action={setArticleStatus} style={{ flex: 1, display: "flex" }}>
                <input type="hidden" name="id" value={article.id} />
                <input type="hidden" name="status" value="returned" />
                <button type="submit" className="btn btn-block" style={{ minHeight: 42, fontSize: 9.5 }}>
                  RETURN
                </button>
              </form>
            ) : (
              <Link
                href={`/ball/${article.id}/edit`}
                className="btn btn-purple"
                style={{ flex: 1, minHeight: 42, fontSize: 9.5 }}
              >
                EDIT
              </Link>
            )}

            <form action={setArticleStatus} style={{ flex: 1, display: "flex" }}>
              <input type="hidden" name="id" value={article.id} />
              <input type="hidden" name="status" value={nextStatus} />
              <button type="submit" className="btn btn-block" style={{ minHeight: 42, fontSize: 9.5 }}>
                {statusLabel}
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
