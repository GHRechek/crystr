import Link from "next/link";
import { reactToMessage, unsendMessage } from "@/lib/actions";
import { REACTIONS } from "@/lib/whisper";
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
 *  to react, reply or (if it is yours) unsend. An unsent message is only a note that it was. */
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
          boxShadow: "0 0 0 1px var(--edge)",
        }}
      >
        {mine ? "You unsent this." : `${other} unsent this.`}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "78%", alignSelf: side, display: "flex", flexDirection: "column", alignItems: side, gap: 4 }}>
      <div style={{ display: "flex", flexDirection: mine ? "row-reverse" : "row", alignItems: "flex-end", gap: 6 }}>
        <div
          style={{
            padding: "9px 11px",
            borderRadius: "var(--px-r)",
            background: mine ? "rgba(76,125,240,.18)" : "var(--surface)",
            boxShadow: mine ? "0 0 0 1px var(--blu-edge)" : "0 0 0 1px var(--edge)",
            fontSize: 13,
            lineHeight: 1.5,
            color: mine ? "var(--blu-pale)" : "var(--text-2)",
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
                paddingLeft: 8,
                borderLeft: "2px solid var(--edge-hover)",
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
                style={{ display: "block", maxWidth: "100%", maxHeight: 280, borderRadius: 4 }}
              />
            </a>
          ) : null}
          {m.body ? <div>{corrupt(m.body, decay)}</div> : null}
        </div>

      </div>

      <details className="msg-menu" style={{ alignSelf: side }}>
        <summary aria-label="Message options" className="px" style={{ fontSize: 11, color: "var(--dim)", padding: "3px 4px", cursor: "pointer" }}>
          ⋯ REACT · REPLY{mine ? " · UNSEND" : ""}
        </summary>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6, alignItems: side }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {REACTIONS.map((e) => (
              <form key={e} action={reactToMessage}>
                <input type="hidden" name="thread_id" value={thread} />
                <input type="hidden" name="message_id" value={m.id} />
                <input type="hidden" name="emoji" value={e} />
                <button type="submit" className="btn btn-sm" aria-label={`React ${e}`} style={{ minHeight: 40, minWidth: 40, padding: 0, fontSize: 16 }}>
                  {e}
                </button>
              </form>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Link href={`/whispers/${thread}?reply=${m.id}`} className="btn btn-sm" style={{ minHeight: 40 }}>
              ↩ REPLY
            </Link>
            {mine ? (
              <form action={unsendMessage}>
                <input type="hidden" name="thread_id" value={thread} />
                <input type="hidden" name="message_id" value={m.id} />
                <button type="submit" className="btn btn-sm" style={{ minHeight: 40 }}>
                  UNSEND
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </details>

      {m.reactions.length ? (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: side }}>
          {m.reactions.map((r) => (
            <span
              key={r.emoji}
              style={{
                fontSize: 12,
                padding: "1px 6px",
                boxShadow: `0 0 0 1px ${r.mine ? "var(--pur)" : "var(--edge)"}`,
                background: r.mine ? "rgba(145,132,217,.14)" : "var(--surface)",
              }}
            >
              {r.emoji}
              {r.count > 1 ? <span style={{ fontSize: 11, marginLeft: 3, color: "var(--muted)" }}>{r.count}</span> : null}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
