import Link from "next/link";
import { Avatar, Placeholder } from "@/components/bits";
import { likePost } from "@/lib/actions";
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
}: {
  post: FeedPost;
  me: string;
  decay?: number;
  /** Rendered on a thread page: no links to itself. */
  inThread?: boolean;
  /** The thread's top post id, so liking can refresh that page. */
  thread?: number;
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
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <Avatar person={post.author} />
        <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: "-.01em" }}>
            {post.author.handle}
          </div>
          <div className="px" style={{ fontSize: 8.5, color: "var(--muted)" }}>
            {mine ? "YOU · " : ""}
            {ago(post.created_at)}
          </div>
        </div>
        <div className="spacer" />
        <div className="px" style={{ fontSize: 8.5, color: "var(--dim)" }}>
          -{post.cost}
        </div>
      </div>

      {inThread ? (
        body
      ) : (
        <Link href={`/thread/${post.id}`} style={{ color: "inherit", textDecoration: "none" }}>
          {body}
        </Link>
      )}

      {post.has_image ? <Placeholder label="IMAGE — PENDING TILE" height={132} /> : null}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 1 }}>
        <form action={likePost}>
          <input type="hidden" name="post_id" value={post.id} />
          {thread ? <input type="hidden" name="thread" value={thread} /> : null}
          <button
            className="btn btn-sm"
            type="submit"
            style={{
              borderColor: post.liked ? "var(--mag)" : "var(--edge)",
              color: post.liked ? "var(--mag-soft)" : "var(--dim)",
            }}
          >
            ♥ {post.likes}
          </button>
        </form>
        {inThread ? null : (
          <Link href={`/thread/${post.id}?reply=1`} className="btn btn-sm">
            ↩ REPLY{post.replies > 0 ? ` · ${post.replies}` : ""}
          </Link>
        )}
        <div className="spacer" />
        <span className="px" style={{ fontSize: 8, color: "var(--dim)" }}>
          -1 TO LIKE
        </span>
      </div>
    </div>
  );
}
