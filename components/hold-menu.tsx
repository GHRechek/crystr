"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { reactToMessage, submitReport, unsendMessage } from "@/lib/actions";
import { REPORT_REASONS } from "@/lib/terms";
import { REACTIONS, TOO_MUCH } from "@/lib/whisper";

const HOLD_MS = 450;

/** Hold a whisper down (or right-click it) to bring it forward over a blurred conversation, with a row
 *  of reactions above it and its options below: when it was sent, reply, copy, and unsend if it is yours. */
export function HoldMenu({
  thread,
  id,
  mine,
  text,
  sentAt,
  tooMuch,
  myTooMuch,
  who,
  children,
}: {
  /** The sender's handle, for a report. */
  who?: string;
  /** Somebody has called this message too much: it can no longer be unsent. */
  tooMuch?: boolean;
  /** You are the one who said so (tap again to take it back). */
  myTooMuch?: boolean;
  thread: number;
  id: number;
  mine: boolean;
  text: string;
  sentAt: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reporting, setReporting] = useState(false);
  const timer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  const cancel = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
  };
  const side = mine ? "flex-end" : "flex-start";
  const when = new Date(sentAt).toLocaleString([], { month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <>
      <div
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          start.current = { x: e.clientX, y: e.clientY };
          timer.current = window.setTimeout(() => {
            setOpen(true);
            if ("vibrate" in navigator) navigator.vibrate?.(10);
            cancel();
          }, HOLD_MS);
        }}
        onPointerMove={(e) => {
          if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 8) cancel();
        }}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => {
          e.preventDefault();
          cancel();
          setOpen(true);
        }}
        style={{ userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none", touchAction: "manipulation" }}
      >
        {children}
      </div>

      {open ? (
        <div
          role="dialog"
          aria-label="Message options"
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 95, background: "rgba(8,8,16,.55)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: side, gap: 10, padding: "24px 16px", maxWidth: 480, margin: "0 auto" }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 22, boxShadow: "0 0 0 1px var(--edge), 0 10px 30px rgba(0,0,0,.5)", padding: "4px 8px 6px" }}>
          {/* The safety word, first and on its own row. */}
          <form action={reactToMessage} onSubmit={() => setOpen(false)}>
            <input type="hidden" name="thread_id" value={thread} />
            <input type="hidden" name="message_id" value={id} />
            <input type="hidden" name="emoji" value={TOO_MUCH} />
            <button type="submit" aria-pressed={!!myTooMuch} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "9px 10px", border: 0, borderBottom: "1px solid var(--edge)", background: myTooMuch ? "rgba(239,68,68,.15)" : "none", cursor: "pointer", font: "inherit", textAlign: "left" }}>
              <span className="px too-much-text" style={{ fontSize: 12, whiteSpace: "nowrap" }}>too much</span>
              <span style={{ fontSize: 11, color: "var(--muted)", textAlign: "right" }}>{myTooMuch ? "Tap to take it back" : "This caused off-game discomfort."}</span>
            </button>
          </form>
          <div style={{ display: "flex", gap: 4, paddingTop: 2 }}>
            {REACTIONS.map((e) => (
              <form key={e} action={reactToMessage} onSubmit={() => setOpen(false)}>
                <input type="hidden" name="thread_id" value={thread} />
                <input type="hidden" name="message_id" value={id} />
                <input type="hidden" name="emoji" value={e} />
                <button type="submit" aria-label={`React ${e}`} style={{ width: 42, height: 42, border: 0, background: "none", fontSize: 24, cursor: "pointer", lineHeight: 1 }}>
                  {e}
                </button>
              </form>
            ))}
          </div>
          </div>

          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "90%", pointerEvents: "none" }}>
            {children}
          </div>

          <div onClick={(e) => e.stopPropagation()} style={{ minWidth: 220, background: "var(--surface)", borderRadius: 14, boxShadow: "0 0 0 1px var(--edge), 0 10px 30px rgba(0,0,0,.5)", padding: "6px 0", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 16px", fontSize: 12, color: "var(--muted)" }}>{when}</div>
            <Link href={`/whispers/${thread}?reply=${id}`} onClick={() => setOpen(false)} className="hold-item">
              <span aria-hidden>↩</span> Reply
            </Link>
            {text ? (
              <button
                type="button"
                className="hold-item"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(text);
                    setCopied(true);
                    window.setTimeout(() => { setCopied(false); setOpen(false); }, 600);
                  } catch {
                    setOpen(false);
                  }
                }}
              >
                <span aria-hidden>⧉</span> {copied ? "Copied" : "Copy"}
              </button>
            ) : null}
            {mine && !tooMuch ? (
              <form action={unsendMessage} onSubmit={() => setOpen(false)}>
                <input type="hidden" name="thread_id" value={thread} />
                <input type="hidden" name="message_id" value={id} />
                <button type="submit" className="hold-item" style={{ color: "var(--mag)" }}>
                  <span aria-hidden>✕</span> Unsend
                </button>
              </form>
            ) : null}
            {!mine ? (
              <button type="button" className="hold-item" onClick={() => { setOpen(false); setReporting(true); }} style={{ color: "#ef4444" }}>
                <span aria-hidden>⚑</span> Report
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {reporting ? (
        <div role="dialog" aria-label="Report misconduct" onClick={() => setReporting(false)} style={{ position: "fixed", inset: 0, zIndex: 96, background: "rgba(8,8,16,.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <form
            action={submitReport}
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 480, background: "var(--device)", borderTop: "1px solid var(--edge)", borderRadius: "16px 16px 0 0", padding: "16px 16px calc(20px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 10, userSelect: "text" }}
          >
            <input type="hidden" name="kind" value="whisper" />
            <input type="hidden" name="target" value={thread} />
            <input type="hidden" name="back" value={`/whispers/${thread}`} />
            <input type="hidden" name="evidence_id" value={id} />
            <input type="hidden" name="evidence_text" value={text} />
            <div style={{ display: "flex", alignItems: "center" }}>
              <div className="px" style={{ fontSize: 12, color: "#ef4444" }}>REPORT MISCONDUCT</div>
              <span className="spacer" />
              <button type="button" className="btn btn-sm" onClick={() => setReporting(false)} aria-label="Close" style={{ minHeight: 36, padding: "0 9px" }}>✕</button>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Only the witches see this. {who ? <>About <b style={{ color: "var(--text)" }}>@{who}</b>.</> : null}</div>
            <div>
              <div className="px" style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>EVIDENCE · THE LINE, AS IT STOOD</div>
              <div style={{ padding: "8px 10px", background: "var(--surface)", boxShadow: "0 0 0 1px var(--edge)", fontSize: 12.5, lineHeight: 1.45, color: "var(--text-2)", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {text || "a picture or a post"}
              </div>
            </div>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="px" style={{ fontSize: 10, color: "var(--muted)" }}>WHAT HAPPENED</span>
              <select name="reason" className="input" defaultValue="harassment">
                {REPORT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="px" style={{ fontSize: 10, color: "var(--muted)" }}>DETAILS (OPTIONAL)</span>
              <textarea name="note" className="textarea" rows={3} maxLength={300} placeholder="Anything the witches should know" style={{ fontSize: 12.5 }} />
            </label>
            <button type="submit" className="btn btn-block" style={{ minHeight: 46, color: "#ef4444", boxShadow: "0 0 0 1px #ef4444" }}>
              SEND TO THE WITCHES
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
