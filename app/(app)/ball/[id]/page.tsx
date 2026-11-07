import { isForsaken } from "@/lib/species";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMe, getArticle, getMotionForBriefing } from "@/lib/data";
import { Open as MotionVote } from "@/components/motion-board";
import { setArticleStatus } from "@/lib/actions";
import { byline, corrupt, decayLevel, capOf, paragraphs, readTime } from "@/lib/crystr";
import { ArticleBody } from "@/components/article-body";

export default async function ArticlePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { profile } = await requireMe();
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const article = await getArticle(id);
  if (!article) notFound();
  // A briefing carries its motion: YAY or NAY right under it while it is open.
  const motion = await getMotionForBriefing(id);
  const motionOpen = motion && new Date(motion.closes_at).getTime() > Date.now();

  const isWitch = profile.is_witch;
  const decay = decayLevel(profile.mana, capOf(profile));
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
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <Link href="/ball" className="btn btn-sm" style={{ alignSelf: "flex-start" }}>
          ← CRYSTR BALL
        </Link>

        {motion && motionOpen ? <MotionVote motion={{ ...motion, briefing_id: null }} mana={profile.mana} decay={decay} keyed={isForsaken(profile.species) && !isWitch} /> : null}

        <div>
          <div className="kicker" style={{ display: "block", marginBottom: 9, fontSize: 11 }}>
            {article.kicker}
            {article.status === "draft" ? " · DRAFT" : ""}
          </div>
          <h1
            style={{
              fontSize: 25,
              fontWeight: 500,
              lineHeight: 1.15,
              letterSpacing: "-.025em",
              marginBottom: 10,
              textWrap: "pretty",
            }}
          >
            {corrupt(article.headline, decay)}
          </h1>
          {article.standfirst ? (
            <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--text-3)", textWrap: "pretty" }}>
              {corrupt(article.standfirst, decay)}
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

        <ArticleBody icon={article.banner_icon} paras={paragraphs(article.body)} decay={decay} />

        {isWitch ? (
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            {pending ? (
              <form action={setArticleStatus} style={{ flex: 1, display: "flex" }}>
                <input type="hidden" name="id" value={article.id} />
                <input type="hidden" name="status" value="returned" />
                <button type="submit" className="btn btn-block" style={{ minHeight: 42, fontSize: 11 }}>
                  RETURN
                </button>
              </form>
            ) : (
              <Link
                href={`/ball/${article.id}/edit`}
                className="btn btn-purple"
                style={{ flex: 1, minHeight: 42, fontSize: 11 }}
              >
                EDIT
              </Link>
            )}

            <form action={setArticleStatus} style={{ flex: 1, display: "flex" }}>
              <input type="hidden" name="id" value={article.id} />
              <input type="hidden" name="status" value={nextStatus} />
              <button type="submit" className="btn btn-block" style={{ minHeight: 42, fontSize: 11 }}>
                {statusLabel}
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
