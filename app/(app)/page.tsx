import Link from "next/link";
import { requireMe, getFeed, type FeedItem } from "@/lib/data";
import { Avatar } from "@/components/bits";
import { PostCard } from "@/components/post-card";
import { Cost } from "@/components/mana";
import { ArticleIcon } from "@/components/article-icon";
import {
  ago,
  corrupt,
  COSTS,
  decayLevel,
} from "@/lib/crystr";

export default async function FeedPage() {
  const { userId, profile } = await requireMe();
  const items = await getFeed(userId);

  const decay = decayLevel(profile.mana);
  const posts = items.filter((i) => i.kind === "post").length;

  return (
    <>
      <h1 className="sr-only">The feed</h1>
      <div style={{ display: "flex", flexDirection: "column", paddingBottom: 24 }}>
        {/* Saying something starts here, like Threads: your face, your name, and "What's new?" greyed out.
            Tapping any of it opens the post maker. */}
        <Link
          href="/post"
          aria-label="Make a post"
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--rule)", color: "inherit", textDecoration: "none" }}
        >
          <Avatar person={profile} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{profile.handle}</div>
            <div style={{ fontSize: 13.5, color: "var(--dim)" }}>What&apos;s new?</div>
          </div>
          <Cost n={COSTS.post} />
        </Link>

        {items.map((item) => (
          <Card key={`${item.kind}-${item.id}`} item={item} decay={decay} me={userId} />
        ))}

        {items.length === 0 ? (
          <div className="empty" style={{ margin: 16 }}>
            NOBODY HAS SAID ANYTHING YET
            <br />
            <Link href="/post" style={{ color: "var(--pur-pale)" }}>
              BE THE FIRST TO SAY SOMETHING.
            </Link>
          </div>
        ) : (
          <div className="empty" style={{ margin: 16 }}>
            {posts > 0 ? "END OF WHAT YOU CAN AFFORD TO SEE" : "THE CITY IS TALKING TO ITSELF"}
          </div>
        )}
      </div>

    </>
  );
}

function Card({ item, decay, me }: { item: FeedItem; decay: number; me: string }) {
  if (item.kind === "ball") {
    return (
      <div className="card card-flat">
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          {/* A published dispatch wears a quill. */}
          <div aria-hidden style={{ width: 34, height: 34, flex: "none", display: "grid", placeItems: "center", background: "linear-gradient(135deg,#4c7df0,#9184d9)", borderRadius: "var(--px-r)" }}>
            <svg width="20" height="20" viewBox="0 0 10 10" shapeRendering="crispEdges" fill="#fff">
              <rect x="7" y="0" width="2" height="1" />
              <rect x="6" y="1" width="3" height="1" />
              <rect x="5" y="2" width="3" height="1" />
              <rect x="4" y="3" width="3" height="1" />
              <rect x="3" y="4" width="3" height="1" />
              <rect x="3" y="5" width="2" height="1" />
              <rect x="2" y="6" width="2" height="1" />
              <rect x="2" y="7" width="1" height="1" />
              <rect x="1" y="8" width="1" height="1" />
              <rect x="0" y="9" width="1" height="1" />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: "-.01em" }}>
              {item.byline_name?.trim().toLowerCase() || "crystr ball"}
            </div>
            <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
              {item.kicker} · {ago(item.published_at || item.created_at)}
            </div>
          </div>
          <div className="spacer" />
          <div className="pill pill-ball">◉ BALL</div>
          <div className="px" style={{ fontSize: 11, color: "var(--dim)" }}>
            FREE
          </div>
        </div>

        {/* The picture sits small to the left of the headline and its line. */}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          {item.banner_icon ? (
            <div style={{ width: 64, height: 64, flex: "none", display: "grid", placeItems: "center", background: "var(--inset)" }}>
              <ArticleIcon slug={item.banner_icon} box={52} />
            </div>
          ) : null}
          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 15.5, fontWeight: 500, lineHeight: 1.28, letterSpacing: "-.015em", textWrap: "pretty" }}>
              {corrupt(item.headline, decay)}
            </div>
            {item.standfirst ? (
              <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text-2)" }}>{corrupt(item.standfirst, decay)}</div>
            ) : null}
          </div>
        </div>

        <Link href={`/ball/${item.id}`} className="btn btn-blue" style={{ alignSelf: "flex-start" }}>
          READ THE DISPATCH · FREE
        </Link>
      </div>
    );
  }

  return <PostCard post={item} me={me} decay={decay} />;
}
