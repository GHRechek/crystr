import Link from "next/link";
import { requireMe, getFeed, type FeedItem } from "@/lib/data";
import { Avatar, Placeholder } from "@/components/bits";
import { likePost, replyNotice } from "@/lib/actions";
import {
  ago,
  corrupt,
  decayLevel,
  DECAY_FILTER,
  DECAY_NOTE,
  SCAN_OPACITY,
} from "@/lib/crystr";

export default async function FeedPage() {
  const { userId, profile } = await requireMe();
  const items = await getFeed(userId);

  const decay = decayLevel(profile.mana);
  const posts = items.filter((i) => i.kind === "post").length;

  return (
    <>
      <div className="pad" style={{ padding: "14px 16px 24px", filter: DECAY_FILTER[decay] }}>
        {decay > 0 ? (
          <div className="degrading">
            <span className="px" style={{ fontSize: 13, color: "var(--mag)" }}>
              !
            </span>
            <div>
              <div
                className="px"
                style={{ fontSize: 9.5, color: "var(--mag-soft)", marginBottom: 4 }}
              >
                SIGNAL DEGRADING
              </div>
              <div style={{ fontSize: 11.5, lineHeight: 1.5, color: "var(--text-3)" }}>
                {DECAY_NOTE[decay]}
              </div>
            </div>
          </div>
        ) : null}

        {items.map((item) => (
          <Card key={`${item.kind}-${item.id}`} item={item} decay={decay} me={userId} />
        ))}

        {items.length === 0 ? (
          <div className="empty">
            NOBODY HAS SAID ANYTHING YET
            <br />
            <span style={{ color: "var(--muted)" }}>BE THE FIRST. IT COSTS FIVE.</span>
          </div>
        ) : (
          <div className="empty">
            {posts > 0 ? "END OF WHAT YOU CAN AFFORD TO SEE" : "THE CITY IS TALKING TO ITSELF"}
          </div>
        )}
      </div>

      {decay > 0 ? (
        <div className="scanlines" style={{ opacity: SCAN_OPACITY[decay] }} />
      ) : null}
    </>
  );
}

function Card({ item, decay, me }: { item: FeedItem; decay: number; me: string }) {
  if (item.kind === "ball") {
    return (
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Avatar bg="linear-gradient(135deg,#4c7df0,#9184d9)" glyph="◉" />
          <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: "-.01em" }}>
              crystr ball
            </div>
            <div className="px" style={{ fontSize: 8.5, color: "var(--muted)" }}>
              {item.kicker} · {ago(item.published_at || item.created_at)}
            </div>
          </div>
          <div className="spacer" />
          <div className="pill pill-ball">◉ BALL</div>
          <div className="px" style={{ fontSize: 8.5, color: "var(--dim)" }}>
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

  const mine = item.author.id === me;

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <Avatar person={item.author} />
        <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: "-.01em" }}>
            {item.author.handle}
          </div>
          <div className="px" style={{ fontSize: 8.5, color: "var(--muted)" }}>
            {mine ? "YOU · " : ""}
            {ago(item.created_at)}
          </div>
        </div>
        <div className="spacer" />
        <div className="px" style={{ fontSize: 8.5, color: "var(--dim)" }}>
          -{item.cost}
        </div>
      </div>

      <div
        style={{
          fontSize: 13.5,
          lineHeight: 1.55,
          color: "var(--text-2)",
          textWrap: "pretty",
          whiteSpace: "pre-wrap",
        }}
      >
        {corrupt(item.body, decay)}
      </div>

      {item.has_image ? (
        <Placeholder label="IMAGE — PENDING TILE" height={132} />
      ) : null}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 1 }}>
        <form action={likePost}>
          <input type="hidden" name="post_id" value={item.id} />
          <button
            className="btn btn-sm"
            type="submit"
            style={{
              borderColor: item.liked ? "var(--mag)" : "var(--edge)",
              color: item.liked ? "var(--mag-soft)" : "var(--dim)",
            }}
          >
            ♥ {item.likes}
          </button>
        </form>
        <form action={replyNotice}>
          <button className="btn btn-sm" type="submit">
            ↩ REPLY
          </button>
        </form>
        <div className="spacer" />
        <span className="px" style={{ fontSize: 8, color: "var(--dim)" }}>
          -1 TO LIKE
        </span>
      </div>
    </div>
  );
}
