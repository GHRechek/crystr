"use client";

import { useEffect, useRef, useState } from "react";
import { reviewFact } from "@/lib/wiki-actions";
import { FACT_MAX_CHARS } from "@/lib/wiki-fact";

/** A fact still waiting on a wiki page, for a witch: tap the words and a small sheet opens under
 *  them with who wrote it, the words to keep (in theirs or yours), a note, KEEP and SEND BACK. */
export function WikiReviewMenu({ id, body, who, when, children }: { id: number; body: string; who: string; when: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); window.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <span ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`${body}, waiting: keep it or send it back`}
        className="wiki-fact"
        style={{ font: "inherit", color: "var(--pur-pale)", background: open ? "rgba(140,90,230,.24)" : "rgba(140,90,230,.14)", border: 0, borderBottom: "1px dashed var(--pur)", padding: "0 2px", cursor: "pointer", textAlign: "left" }}
      >
        {children}
      </button>
      {open ? (
        <form
          action={reviewFact}
          role="dialog"
          aria-label="Waiting to be read"
          style={{ position: "absolute", left: 0, top: "100%", zIndex: 30, marginTop: 6, width: "min(320px, 88vw)", padding: 10, background: "var(--raised)", boxShadow: "0 0 0 1px var(--pur), 0 8px 24px rgba(0,0,0,.45)", borderRadius: "var(--px-r)", display: "flex", flexDirection: "column", gap: 8, font: "13px/1.4 system-ui, sans-serif", letterSpacing: 0 }}
        >
          <input type="hidden" name="id" value={id} />
          <span className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
            WAITING · {who.toUpperCase()} · {when.toUpperCase()}
          </span>
          <input name="text" defaultValue={body} maxLength={FACT_MAX_CHARS} className="input" aria-label="Keep it in these words" style={{ fontSize: 13 }} />
          <input name="note" maxLength={200} className="input" aria-label="A note if you send it back" placeholder="A note if you send it back (optional)" style={{ fontSize: 12 }} />
          <span style={{ display: "flex", gap: 6 }}>
            <button type="submit" name="act" value="keep" className="btn btn-sm btn-purple" style={{ flex: 1, minHeight: 40 }}>KEEP</button>
            <button type="submit" name="act" value="return" className="btn btn-sm" style={{ flex: 1, minHeight: 40 }}>SEND BACK</button>
          </span>
        </form>
      ) : null}
    </span>
  );
}
