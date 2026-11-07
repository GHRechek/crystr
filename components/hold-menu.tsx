"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { reactToMessage, unsendMessage } from "@/lib/actions";
import { REACTIONS } from "@/lib/whisper";

const HOLD_MS = 450;

/** Hold a whisper down (or right-click it) to bring it forward over a blurred conversation, with a row
 *  of reactions above it and its options below: when it was sent, reply, copy, and unsend if it is yours. */
export function HoldMenu({
  thread,
  id,
  mine,
  text,
  sentAt,
  children,
}: {
  thread: number;
  id: number;
  mine: boolean;
  text: string;
  sentAt: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
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
          <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 4, padding: "6px 8px", background: "var(--surface)", borderRadius: 999, boxShadow: "0 0 0 1px var(--edge), 0 10px 30px rgba(0,0,0,.5)" }}>
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
            {mine ? (
              <form action={unsendMessage} onSubmit={() => setOpen(false)}>
                <input type="hidden" name="thread_id" value={thread} />
                <input type="hidden" name="message_id" value={id} />
                <button type="submit" className="hold-item" style={{ color: "var(--mag)" }}>
                  <span aria-hidden>✕</span> Unsend
                </button>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
