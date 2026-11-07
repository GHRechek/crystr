import Link from "next/link";
import { answerBadgeClaim } from "@/lib/actions";
import { HoldMenu } from "@/components/hold-menu";
import { TOO_MUCH, isPixelEmoji } from "@/lib/whisper";
import { corrupt } from "@/lib/crystr";
import type { Message } from "@/lib/data";

/** A short line standing in for a message: its words, or "a picture". */
export function snippet(m: Message): string {
  if (m.unsent) return "Message unsent.";
  const t = m.body.trim().replace(/\s+/g, " ");
  if (t) return t.length > 60 ? `${t.slice(0, 60)}…` : t;
  return m.image_url ? "a picture" : "";
}

/** One message: what it answers, its words or picture, its reactions, and a small menu
 *  (held down) to react, reply, copy or, if it is yours, unsend. An unsent message is only a note that it was. */
export function Bubble({
  m,
  mine,
  thread,
  decay,
  other,
  quoted,
  quotedWho,
}: {
  m: Message;
  mine: boolean;
  thread: number;
  decay: number;
  other: string;
  quoted?: Message;
  quotedWho: (q: Message) => string;
}) {
  const side = mine ? "flex-end" : "flex-start";
  // Somebody called this one too much: it wears a red pixel outline, and its own pill.
  const tooMuchR = m.reactions.find((r) => r.emoji === TOO_MUCH);
  const tooMuch = !!tooMuchR;

  if (m.unsent) {
    return (
      <div
        style={{
          maxWidth: "78%",
          alignSelf: side,
          padding: "7px 11px",
          fontSize: 12,
          fontStyle: "italic",
          color: "var(--dim)",
          background: "#1a1626",
        }}
      >
        {mine ? "You unsent this." : `${other} unsent this.`}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "78%", alignSelf: side, display: "flex", flexDirection: "column", alignItems: side, gap: 4 }}>
      <HoldMenu thread={thread} id={m.id} mine={mine} text={m.body} sentAt={m.created_at} tooMuch={tooMuch} myTooMuch={!!tooMuchR?.mine} who={mine ? undefined : other}>
      <div style={{ display: "flex", flexDirection: mine ? "row-reverse" : "row", alignItems: "flex-end", gap: 6 }}>
        <div
          style={{
            padding: "9px 11px",
            borderRadius: 0,
            background: mine ? "#1e3270" : "#2b1f4f",
            boxShadow: tooMuch ? "0 0 0 2px #ef4444, 0 0 0 4px rgba(239,68,68,.35), 0 0 0 6px rgba(239,68,68,.12)" : "none",
            fontSize: 13,
            lineHeight: 1.5,
            color: mine ? "#dbe5ff" : "#e6e0f5",
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            minWidth: 0,
          }}
        >
          {m.reply_to ? (
            <div
              style={{
                fontSize: 12,
                lineHeight: 1.4,
                color: "var(--muted)",
                padding: "4px 8px",
                background: mine ? "#16245a" : "#1f1640",
                borderLeft: "3px solid #9184d9",
              }}
            >
              {quoted ? `${quotedWho(quoted)}: ${snippet(quoted)}` : "an earlier message"}
            </div>
          ) : null}
          {m.image_url ? (
            <a href={m.image_url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.image_url}
                alt="A picture in this whisper"
                loading="lazy"
                style={{ display: "block", maxWidth: "100%", maxHeight: 280, borderRadius: 0 }}
              />
            </a>
          ) : null}
          {m.post ? (
            <Link
              href={`/thread/${m.post.id}`}
              style={{
                display: "block",
                padding: "8px 10px",
                background: mine ? "#16245a" : "#1f1640",
                color: "var(--text-2)",
                textDecoration: "none",
                fontSize: 12.5,
                lineHeight: 1.45,
              }}
            >
              <span className="px" style={{ display: "block", fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>
                A POST BY {(m.post.handle ?? "SOMEONE").toUpperCase()}
              </span>
              {corrupt(m.post.body.length > 200 ? `${m.post.body.slice(0, 200)}…` : m.post.body, decay)}
              {m.post.has_image ? (
                <span className="px" style={{ display: "block", fontSize: 11, color: "var(--dim)", marginTop: 3 }}>
                  WITH A PICTURE
                </span>
              ) : null}
            </Link>
          ) : m.post_gone ? (
            <div className="px" style={{ fontSize: 11, color: "var(--dim)" }}>
              A POST WAS SENT HERE. IT HAS BEEN DELETED.
            </div>
          ) : null}
          {m.body ? <div>{corrupt(m.body, decay)}</div> : null}
          {m.claim ? (
            m.claim.status === "pending" && m.claim.forMe ? (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {(["yes", "no"] as const).map((a) => (
                  <form key={a} action={answerBadgeClaim} style={{ flex: 1 }}>
                    <input type="hidden" name="id" value={m.claim!.id} />
                    <input type="hidden" name="answer" value={a} />
                    <input type="hidden" name="thread" value={thread} />
                    <button type="submit" className={`btn btn-sm btn-block${a === "yes" ? " btn-purple" : ""}`} style={{ minHeight: 40 }}>
                      {a === "yes" ? "YES" : "NO"}
                    </button>
                  </form>
                ))}
              </div>
            ) : (
              <div className="px" style={{ fontSize: 11, marginTop: 6, color: m.claim.status === "confirmed" ? "var(--blu-soft)" : "var(--muted)" }}>
                {m.claim.status === "confirmed" ? "✓ CONFIRMED" : m.claim.status === "declined" ? "✗ NOT QUITE" : "WAITING FOR AN ANSWER"}
              </div>
            )
          ) : null}
        </div>

      </div>
      </HoldMenu>

      {m.reactions.length ? (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: side }}>
          {tooMuchR ? (
            <span className="px too-much-text" style={{ fontSize: 11, padding: "2px 7px", background: "#3a0f18" }}>
              too much{tooMuchR.count > 1 ? ` ${tooMuchR.count}` : ""}
            </span>
          ) : null}
          {m.reactions.filter((r) => r.emoji !== TOO_MUCH).map((r) => (
            <span
              key={r.emoji}
              style={{
                fontSize: 12,
                padding: "1px 6px",
                background: r.mine ? "#4a2f86" : "#2b1f4f",
              }}
            >
              {isPixelEmoji(r.emoji) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/emoji/${r.emoji}.png`} alt="" width={14} height={15} style={{ imageRendering: "pixelated", objectFit: "contain", verticalAlign: "-3px" }} />
              ) : (
                r.emoji
              )}
              {r.count > 1 ? <span style={{ fontSize: 11, marginLeft: 3, color: "var(--muted)" }}>{r.count}</span> : null}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
