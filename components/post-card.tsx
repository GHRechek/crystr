import Link from "next/link";
import { Avatar, Placeholder } from "@/components/bits";
import { LikeButton } from "@/components/like-button";
import { PostMenu } from "@/components/report-button";
import { ago, corrupt } from "@/lib/crystr";
import type { FeedPost } from "@/lib/data";

/** A post, on the timeline or in a thread. On the timeline the text opens the
 *  thread and REPLY goes straight to its reply box; inside a thread there is
 *  nowhere further to go, so neither is a link. */
export function PostCard({
  post,
  me,
  decay = 0,
  inThread,
  thread,
  line,
  small,
}: {
  post: FeedPost;
  me: string;
  decay?: number;
  /** Rendered on a thread page: no links to itself. */
  inThread?: boolean;
  /** The thread's top post id, so liking can refresh that page. */
  thread?: number;
  /** Draw the thread line down from the picture, to the next post in the thread. */
  line?: boolean;
  /** A reply: a smaller picture. */
  small?: boolean;
}) {
  const mine = post.author.id === me;

  const body = (
    <div
      style={{
        fontSize: 13.5,
        lineHeight: 1.55,
        color: "var(--text-2)",
        textWrap: "pretty",
        whiteSpace: "pre-wrap",
      }}
    >
      {corrupt(post.body, decay)}
    </div>
  );

  return (
    <div className="tpost">
      <div className="tpost-side">
        <Link href={`/u/${post.author.handle}`} aria-label={`${post.author.handle}'s profile`}>
          <Avatar person={post.author} size={small ? 30 : 40} />
        </Link>
        {line || post.latest_reply ? <div className="tline" aria-hidden /> : null}
      </div>

      <div className="tpost-main">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link
            href={`/u/${post.author.handle}`}
            style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0, color: "inherit", textDecoration: "none" }}
          >
            <span style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-.01em" }}>{post.author.handle}</span>
            <span className="px" style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>
              {mine ? "YOU · " : ""}
              {ago(post.created_at)}
            </span>
          </Link>
          <div className="spacer" />
          {mine ? null : (
            <PostMenu kind="post" target={post.id} back={inThread && thread ? `/thread/${thread}` : "/"} />
          )}
        </div>

        {post.quest_title ? (
          <div className="px" style={{ fontSize: 11, color: "var(--mag-soft)" }}>
            FROM THE WELL · {post.quest_title.toUpperCase()}
          </div>
        ) : null}

        {inThread ? (
          body
        ) : (
          <Link href={`/thread/${post.id}`} style={{ color: "inherit", textDecoration: "none" }}>
            {body}
          </Link>
        )}

        {post.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.image_url}
            alt="A picture shared with this post"
            loading="lazy"
            style={{ display: "block", width: "100%", maxHeight: 420, objectFit: "contain", background: "var(--inset)" }}
          />
        ) : post.has_image ? (
          <Placeholder label="IMAGE — PENDING TILE" height={132} />
        ) : null}

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <LikeButton postId={post.id} likes={post.likes} liked={post.liked} thread={thread} />
          {inThread ? null : (
            <Link href={`/thread/${post.id}?reply=1`} className="btn btn-sm">
              ↩ REPLY{post.replies > 0 ? ` · ${post.replies}` : ""}
            </Link>
          )}
        </div>
      </div>

      {post.latest_reply && !inThread ? (
        <>
          <div className="tpost-side tpost-side-reply">
            <Link href={`/u/${post.latest_reply.author.handle}`} aria-label={`${post.latest_reply.author.handle}'s profile`}>
              <Avatar person={post.latest_reply.author} size={30} />
            </Link>
          </div>
          <Link href={`/thread/${post.id}`} className="tpost-main tpost-reply">
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{post.latest_reply.author.handle}</span>
              <span className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
                {ago(post.latest_reply.created_at)}
              </span>
            </div>
            <div className="tpost-reply-body">{corrupt(post.latest_reply.body, decay)}</div>
            {post.replies > 1 ? (
              <span className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
                {post.replies - 1} MORE {post.replies - 1 === 1 ? "REPLY" : "REPLIES"}
              </span>
            ) : null}
          </Link>
        </>
      ) : null}
    </div>
  );
}
