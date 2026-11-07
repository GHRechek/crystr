"use client";

import { useEffect, useRef, useState } from "react";
import { TokenImage } from "@/components/badges";

/** Someone's Proof, beside their name at the name's height. Tap it for whose it is and what would make
 *  them risk it. */
export function ProofMark({ design, title, line }: { design: unknown; title: string; line: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);
  return (
    <span ref={ref} style={{ position: "relative", flex: "none", lineHeight: 0 }}>
      <button type="button" aria-label={`${title}. ${line}`} aria-expanded={open} onClick={() => setOpen((o) => !o)} style={{ width: 28, height: 28, padding: 0, border: 0, background: "none", cursor: "pointer", lineHeight: 0 }}>
        <TokenImage design={design} size={28} />
      </button>
      {open ? (
        <span role="tooltip" style={{ position: "absolute", left: "50%", top: 34, transform: "translateX(-50%)", zIndex: 30, width: 220, padding: "10px 12px", background: "var(--blk-pur)", boxShadow: "4px 4px 0 #0a0616", lineHeight: 1.45, display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="px" style={{ fontSize: 10, color: "#f2b544" }}>{title}</span>
          <span style={{ fontSize: 12, color: "var(--text-2)" }}>{line}</span>
        </span>
      ) : null}
    </span>
  );
}
