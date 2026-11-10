"use client";

import { useEffect, useRef, useState } from "react";
import { editFact, moveFact, removeFact } from "@/lib/wiki-actions";
import { ArrowIcon } from "@/components/icons";

/** A kept fact on a wiki page, for a witch: tap the words and a small sheet opens under them with the
 *  words to change, up and down, and TAKE DOWN. Everyone else just reads the fact. */
export function WikiFactMenu({ id, body, slug, first, last, children }: { id: number; body: string; slug: string; first: boolean; last: boolean; children: React.ReactNode }) {
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
        aria-label={`${body}: change, move or take down`}
        className="wiki-fact"
        style={{ font: "inherit", color: "inherit", background: open ? "rgba(140,90,230,.18)" : "none", border: 0, padding: "0 2px", cursor: "pointer", textAlign: "left", borderBottom: "1px dotted var(--pur)" }}
      >
        {children}
      </button>
      {open ? (
        <span
          role="dialog"
          aria-label="This fact"
          style={{ position: "absolute", left: 0, top: "100%", zIndex: 30, marginTop: 6, width: "min(320px, 88vw)", padding: 10, background: "var(--raised)", boxShadow: "0 0 0 1px var(--edge), 0 8px 24px rgba(0,0,0,.45)", borderRadius: "var(--px-r)", display: "flex", flexDirection: "column", gap: 8, font: "13px/1.4 system-ui, sans-serif", letterSpacing: 0 }}
        >
          <form action={editFact} style={{ display: "flex", gap: 6 }}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="slug" value={slug} />
            <input name="body" defaultValue={body} maxLength={80} className="input" aria-label="The words" style={{ flex: 1, minWidth: 0, fontSize: 13 }} />
            <button type="submit" className="btn btn-sm btn-purple" style={{ minHeight: 40 }}>SAVE</button>
          </form>
          <span style={{ display: "flex", gap: 6 }}>
            <form action={moveFact} style={{ display: "flex", gap: 6 }}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="slug" value={slug} />
              <button type="submit" name="dir" value="up" className="btn btn-sm" disabled={first} aria-label="Move up" style={{ minHeight: 40, minWidth: 40, padding: 0 }}><ArrowIcon dir="up" /></button>
              <button type="submit" name="dir" value="down" className="btn btn-sm" disabled={last} aria-label="Move down" style={{ minHeight: 40, minWidth: 40, padding: 0 }}><ArrowIcon dir="down" /></button>
            </form>
            <span style={{ flex: 1 }} />
            <form action={removeFact}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="slug" value={slug} />
              <button type="submit" className="btn btn-sm" style={{ minHeight: 40, fontSize: 11 }}>TAKE DOWN</button>
            </form>
          </span>
        </span>
      ) : null}
    </span>
  );
}
