import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMe, getThread } from "@/lib/data";
import { Avatar } from "@/components/bits";
import { Bubble, snippet } from "@/components/whisper-bubble";
import { WhisperComposer } from "./composer";
import { corrupt, COSTS, decayLevel } from "@/lib/crystr";

export default async function ThreadPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reply?: string }>;
}) {
  const params = await props.params;
  const query = await props.searchParams;
  const { userId, profile } = await requireMe();
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const thread = await getThread(id, userId);
  if (!thread) notFound();

  const broke = profile.mana < COSTS.whisper;
  const decay = decayLevel(profile.mana);
  const wanted = Number(query?.reply);
  const replyTarget = Number.isFinite(wanted) ? thread.messages.find((m) => m.id === wanted && !m.unsent) : undefined;

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
        <Link
          href={`/u/${thread.other.handle}`}
          style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, color: "inherit", textDecoration: "none" }}
        >
          <Avatar person={thread.other} size={28} />
          <h1 style={{ fontSize: 13.5, fontWeight: 500 }}>{thread.other.handle}</h1>
        </Link>
        <div className="spacer" />
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
        {thread.messages.map((m) => (
          <Bubble
            key={m.id}
            m={m}
            mine={m.sender_id === userId}
            thread={id}
            decay={decay}
            other={thread.other.handle}
            quoted={m.reply_to ? thread.messages.find((x) => x.id === m.reply_to) : undefined}
            quotedWho={(q) => (q.sender_id === userId ? "you" : thread.other.handle)}
          />
        ))}

        {thread.messages.length === 0 ? (
          <div className="empty">NOTHING HAS BEEN SAID HERE YET</div>
        ) : null}

        {broke ? (
          <div
            className="px"
            style={{
              alignSelf: "center",
              fontSize: 11,
              color: "var(--mag)",
              textAlign: "center",
              lineHeight: 1.8,
              padding: "8px 0",
            }}
          >
            REST FIRST — YOUR MESSAGE IS WAITING
            <br />
            <span style={{ color: "var(--muted)" }}>A LITTLE TIME AT THE WELL, THEN TRY AGAIN.</span>
          </div>
        ) : null}
      </div>


      <WhisperComposer
        key={thread.messages[thread.messages.length - 1]?.id ?? 0}
        threadId={id}
        cost={COSTS.whisper}
        replyTo={replyTarget?.id ?? null}
        replyLine={replyTarget ? `${replyTarget.sender_id === userId ? "you" : thread.other.handle}: ${snippet(replyTarget)}` : null}
        closeReplyHref={`/whispers/${id}`}
      />
    </div>
  );
}
