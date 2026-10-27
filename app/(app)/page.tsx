import Link from "next/link";
import { requireMe, getFeed, type FeedItem } from "@/lib/data";
import { Avatar, Placeholder } from "@/components/bits";
import { PostCard } from "@/components/post-card";
import { Cost } from "@/components/mana";
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
        {/* Saying something starts here, at the top of the feed, where it used to be a tab. */}
        <div style={{ padding: "8px 16px 2px" }}>
          <Link href="/post" className="btn btn-block btn-purple" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 42 }}>
            ✚ NEW POST <Cost n={COSTS.post} />
          </Link>
        </div>

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
          <Avatar bg="linear-gradient(135deg,#4c7df0,#9184d9)" glyph="◉" />
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

        <div
          style={{
            fontSize: 15.5,
            fontWeight: 500,
            lineHeight: 1.28,
            letterSpacing: "-.015em",
            textWrap: "pretty",
          }}
        >
          {corrupt(item.headline, decay)}
        </div>

        {item.standfirst ? (
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--text-2)" }}>
            {corrupt(item.standfirst, decay)}
          </div>
        ) : null}

        {item.banner ? (
          <Placeholder label={item.banner_label || "IMAGE — PENDING TILE"} height={132} />
        ) : null}

        <Link href={`/ball/${item.id}`} className="btn btn-blue" style={{ alignSelf: "flex-start" }}>
          READ THE DISPATCH · FREE
        </Link>
      </div>
    );
  }

  return <PostCard post={item} me={me} decay={decay} />;
}
