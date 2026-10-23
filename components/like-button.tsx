"use client";

import { useState } from "react";
import { likePost, unlikePost } from "@/lib/actions";
import { Cost } from "@/components/mana";
import { HeartIcon } from "@/components/icons";

/** The heart under a post. Liking costs 1 mana; taking a like back asks first, and the
 *  mana is not returned. */
export function LikeButton({ postId, likes, liked, thread }: { postId: number; likes: number; liked: boolean; thread?: number }) {
  const [asking, setAsking] = useState(false);

  const hidden = (
    <>
      <input type="hidden" name="post_id" value={postId} />
      {thread ? <input type="hidden" name="thread" value={thread} /> : null}
    </>
  );

  if (!liked) {
    return (
      <form action={likePost}>
        {hidden}
        <button className="tbtn" type="submit" aria-label={`Like. ${likes} likes`}>
          <HeartIcon /> <span className="tcount">{likes}</span> <Cost n={1} />
        </button>
      </form>
    );
  }

  if (!asking) {
    return (
      <button
        className="tbtn"
        type="button"
        onClick={() => setAsking(true)}
        aria-label={`You liked this. ${likes} likes. Take your like back`}
        style={{ color: "var(--mag)" }}
      >
        <HeartIcon filled /> <span className="tcount">{likes}</span>
      </button>
    );
  }

  return (
    <form action={unlikePost} onSubmit={() => setAsking(false)} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {hidden}
      <span className="px" style={{ fontSize: 11, color: "var(--text-2)" }}>
        TAKE IT BACK? YOUR MANA STAYS SPENT.
      </span>
      <button className="btn btn-sm" type="submit" style={{ borderColor: "var(--mag)", color: "var(--mag-soft)" }}>
        YES, UNLIKE
      </button>
      <button className="btn btn-sm" type="button" onClick={() => setAsking(false)}>
        KEEP IT
      </button>
    </form>
  );
}
