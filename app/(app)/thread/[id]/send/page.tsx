import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMe, getPeople, getPostForSend } from "@/lib/data";
import { Avatar } from "@/components/bits";
import { Cost } from "@/components/mana";
import { sendPost } from "@/lib/actions";
import { COSTS, corrupt, decayLevel, capOf } from "@/lib/crystr";

/** Send a post to someone in a whisper: the post, a note if you like, and who. Picking a
 *  person sends it (a whisper's price) and takes you to the conversation. */
export default async function SendPostPage(props: { params: Promise<{ id: string }> }) {
  const { id: raw } = await props.params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) notFound();
  const { userId, profile } = await requireMe();
  const [post, people] = await Promise.all([getPostForSend(id), getPeople(userId)]);
  if (!post) notFound();
  const decay = decayLevel(profile.mana, capOf(profile));

  return (
    <div className="pad" style={{ gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href={`/thread/${id}`} className="btn btn-sm">
          ← BACK
        </Link>
        <div className="spacer" />
        <div className="px" style={{ fontSize: 11, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 6 }}>
          SENDING COSTS <Cost n={COSTS.whisper} />
        </div>
      </div>

      <div>
        <h1 className="screen-title">SEND A POST</h1>
        <div className="screen-intro">Pick who gets it. It goes into your whisper with them, with your note on top.</div>
      </div>

      <div className="tile" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 5 }}>
        <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
          {post.handle ?? "SOMEONE"} SAID
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text-2)", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {corrupt(post.body.length > 240 ? `${post.body.slice(0, 240)}…` : post.body, decay)}
        </div>
        {post.has_image ? (
          <div className="px" style={{ fontSize: 11, color: "var(--dim)" }}>
            WITH A PICTURE
          </div>
        ) : null}
      </div>

      {/* One form: the note, and a button per person that says who it is for. */}
      <form action={sendPost} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input type="hidden" name="post_id" value={id} />
        <input
          name="note"
          className="input"
          maxLength={500}
          placeholder="Add a note (optional)"
          aria-label="A note to go with the post"
          style={{ fontSize: 13 }}
        />
        {people.map((p) => (
          <div key={p.id} className="rowcard" style={{ padding: 0, gap: 0, cursor: "default" }}>
            <span style={{ display: "flex", padding: "11px 0 11px 11px", flex: "none" }}>
              <Avatar person={p} />
            </span>
            <button
              type="submit"
              name="other_id"
              value={p.id}
              style={{
                flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 11, padding: 11,
                background: "none", border: 0, color: "inherit", font: "inherit", textAlign: "left", cursor: "pointer",
              }}
            >
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{p.handle}</div>
                {p.display_name ? <div style={{ fontSize: 12, color: "var(--muted)" }}>{p.display_name}</div> : null}
              </div>
              <span className="px" style={{ fontSize: 11, color: "var(--dim)" }}>
                SEND →
              </span>
            </button>
          </div>
        ))}
      </form>

      {people.length === 0 ? <div className="empty">THERE IS NOBODY ELSE IN THE CITY YET</div> : null}
    </div>
  );
}
