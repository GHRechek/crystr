import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMe, getThread } from "@/lib/data";
import { Avatar } from "@/components/bits";
import { sendWhisper } from "@/lib/actions";
import { COSTS } from "@/lib/crystr";

export default async function ThreadPage({ params }: { params: { id: string } }) {
  const { userId, profile } = await requireMe();
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const thread = await getThread(id, userId);
  if (!thread) notFound();

  const broke = profile.mana < COSTS.whisper;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <div
        style={{
          flex: "none",
          padding: "11px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderBottom: "1px solid var(--rule)",
          background: "var(--device)",
          position: "sticky",
          top: 0,
          zIndex: 2,
        }}
      >
        <Link href="/whispers" className="btn btn-sm" style={{ padding: "0 9px" }}>
          ←
        </Link>
        <Avatar person={thread.other} size={28} />
        <div style={{ fontSize: 13.5, fontWeight: 500 }}>{thread.other.handle}</div>
        <div className="spacer" />
        <div className="px" style={{ fontSize: 9, color: "var(--muted)" }}>
          {COSTS.whisper}/MSG
        </div>
      </div>

      <div
        style={{
          flex: 1,
          padding: "14px 16px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 9,
        }}
      >
        {thread.messages.map((m) => {
          const mine = m.sender_id === userId;
          return (
            <div
              key={m.id}
              style={{
                maxWidth: "78%",
                alignSelf: mine ? "flex-end" : "flex-start",
                padding: "9px 11px",
                borderRadius: "var(--px-r)",
                background: mine ? "rgba(76,125,240,.18)" : "var(--surface)",
                boxShadow: mine ? "0 0 0 1px var(--blu-edge)" : "0 0 0 1px var(--edge)",
                fontSize: 13,
                lineHeight: 1.5,
                color: mine ? "var(--blu-pale)" : "var(--text-2)",
                whiteSpace: "pre-wrap",
              }}
            >
              {m.body}
            </div>
          );
        })}

        {thread.messages.length === 0 ? (
          <div className="empty">NOTHING HAS BEEN SAID HERE YET</div>
        ) : null}

        {broke ? (
          <div
            className="px"
            style={{
              alignSelf: "center",
              fontSize: 8.5,
              color: "var(--mag)",
              textAlign: "center",
              lineHeight: 1.8,
              padding: "8px 0",
            }}
          >
            MESSAGE HELD — INSUFFICIENT MANA
            <br />
            <span style={{ color: "var(--muted)" }}>GO OUTSIDE. COME BACK. TRY AGAIN.</span>
          </div>
        ) : null}
      </div>

      <form
        action={sendWhisper}
        style={{
          flex: "none",
          padding: "10px 16px 16px",
          display: "flex",
          gap: 8,
          alignItems: "flex-end",
          background: "var(--device)",
          position: "sticky",
          bottom: 0,
        }}
      >
        <input type="hidden" name="thread_id" value={id} />
        <input
          name="body"
          className="input"
          style={{ flex: 1, fontSize: 13.5 }}
          placeholder={`whisper (${COSTS.whisper} mana)`}
          autoComplete="off"
        />
        <button type="submit" className="btn btn-blue" style={{ minHeight: 44, minWidth: 56 }}>
          SEND
        </button>
      </form>
    </div>
  );
}
