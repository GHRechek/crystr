"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { reactToMessage, submitReport, unsendMessage } from "@/lib/actions";
import { REPORT_REASONS } from "@/lib/terms";
import { PIXEL_EMOJI, PIXEL_REACTS_ON, QUICK_PIXEL, REACTIONS, TOO_MUCH, TOO_MUCH_ON } from "@/lib/whisper";

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
  // While a finger is down the bubble sinks a step; the menu ignores taps for a moment after it opens, so the
  // lifting finger does not land on (or select) one of its options.
  const [holding, setHolding] = useState(false);
  const [more, setMore] = useState(false);
  const [ready, setReady] = useState(false);
  const timer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  const cancel = () => {
    setHolding(false);
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
          setHolding(true);
          timer.current = window.setTimeout(() => {
            setReady(false);
            window.setTimeout(() => setReady(true), 380);
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
          setReady(true);
          setOpen(true);
        }}
        className={holding ? "hold-sink" : undefined}
        style={{ userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none", touchAction: "manipulation" }}
      >
        {children}
      </div>

      {open ? (
        <div
          role="dialog"
          aria-label="Message options"
          onClick={() => setOpen(false)}
          className="hold-overlay"
          style={{ position: "fixed", inset: 0, zIndex: 95, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: side, gap: 10, padding: "24px 16px", maxWidth: 480, margin: "0 auto", pointerEvents: ready ? "auto" : "none" }}
        >
          <div onClick={(e) => e.stopPropagation()} className="pix-block pix-in" style={{ padding: "4px 6px 6px" }}>
          <div className="no-scrollbar" style={{ display: "flex", gap: 2, alignItems: "center", overflowX: "auto", maxWidth: "calc(100vw - 48px)" }}>
            {TOO_MUCH_ON ? (
              <form action={reactToMessage} onSubmit={() => setOpen(false)} style={{ flex: "none" }}>
                <input type="hidden" name="thread_id" value={thread} />
                <input type="hidden" name="message_id" value={id} />
                <input type="hidden" name="emoji" value={TOO_MUCH} />
                <button type="submit" aria-pressed={!!myTooMuch} title={myTooMuch ? "Tap to take it back" : "This caused off-game discomfort."} className="px too-much-text" style={{ height: 40, padding: "0 10px", border: 0, background: myTooMuch ? "#5a1420" : "#3a0f18", fontSize: 11, whiteSpace: "nowrap", cursor: "pointer" }}>
                  too much
                </button>
              </form>
            ) : null}
            {(PIXEL_REACTS_ON ? QUICK_PIXEL : REACTIONS).map((e) => (
              <PixelReact key={e} e={e} thread={thread} id={id} done={() => setOpen(false)} />
            ))}
            {PIXEL_REACTS_ON ? (
            <button type="button" aria-label="More reactions" aria-expanded={more} onClick={() => setMore((m) => !m)} className="px" style={{ flex: "none", width: 40, height: 40, border: 0, background: more ? "#5a1f47" : "#3b2c66", color: "var(--pur-pale)", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>
              {more ? "−" : "+"}
            </button>
            ) : null}
          </div>
          {more ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 40px)", gap: 2, maxHeight: 220, overflowY: "auto", paddingTop: 6, marginTop: 4, background: "#1a1330" }}>
              {PIXEL_EMOJI.map((e) => (
                <PixelReact key={e} e={e} thread={thread} id={id} done={() => setOpen(false)} />
              ))}
            </div>
          ) : null}
          </div>

          <div onClick={(e) => e.stopPropagation()} className="pix-in" style={{ maxWidth: "90%", pointerEvents: "none" }}>
            {children}
          </div>

          <div onClick={(e) => e.stopPropagation()} className="pix-block pix-in pix-in-late" style={{ minWidth: 220, padding: "4px 0", display: "flex", flexDirection: "column" }}>
            <div className="px" style={{ padding: "8px 16px", fontSize: 10, color: "var(--pur-pale)", background: "#1a1330" }}>{when.toUpperCase()}</div>
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
                <button type="submit" className="hold-item" style={{ color: "#ff5fae" }}>
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
        <div role="dialog" aria-label="Report misconduct" onClick={() => setReporting(false)} className="hold-overlay" style={{ position: "fixed", inset: 0, zIndex: 96, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <form
            action={submitReport}
            onClick={(e) => e.stopPropagation()}
            className="pix-block pix-in" style={{ width: "100%", maxWidth: 480, padding: "16px 16px calc(20px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 10, userSelect: "text" }}
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

/** One pixel emoji in the reaction picker. */
function PixelReact({ e, thread, id, done }: { e: string; thread: number; id: number; done: () => void }) {
  return (
    <form action={reactToMessage} onSubmit={done} style={{ flex: "none" }}>
      <input type="hidden" name="thread_id" value={thread} />
      <input type="hidden" name="message_id" value={id} />
      <input type="hidden" name="emoji" value={e} />
      <button type="submit" aria-label={`React ${e}`} style={{ flex: "none", width: 40, height: 40, border: 0, background: "none", cursor: "pointer", padding: 0, display: "grid", placeItems: "center" }}>
        {e.startsWith("pm-") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/emoji/${e}.png`} alt="" width={22} height={24} style={{ imageRendering: "pixelated", objectFit: "contain" }} />
        ) : (
          <span style={{ fontSize: 22, lineHeight: 1 }}>{e}</span>
        )}
      </button>
    </form>
  );
}
