"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { HelpMark } from "@/components/help-mark";
import { QrGlyph } from "@/components/about-badges";

/** A call for help in a banner: a speech bubble, rounded, no outline, its point toward the portrait,
 *  starting three quarters of the way across it. Inside, the question mark then the words; the mark is as
 *  tall as the words: one line, one line's height; three lines, all three. `face` is the portrait's width.
 *  It is placed inside the block that holds the portrait (which overlaps the banner by half the face), so
 *  it paints over the portrait but under anything that block opens on top, like the scanner. Its bottom
 *  sits 30px above the banner's foot: 22px below that block's top. */
export function HelpThought({ text, muted, face = 104, onClick, label, onCode }: {
  text: string;
  /** No words yet: the prompt, greyed. */
  muted?: boolean;
  face?: number;
  onClick?: () => void;
  label?: string;
  /** Your own bubble: a code button stands where the mark would, opening your code to be scanned. */
  onCode?: () => void;
}) {
  const words = useRef<HTMLSpanElement>(null);
  const [h, setH] = useState(18);
  useLayoutEffect(() => {
    const el = words.current;
    if (!el) return;
    const read = () => setH(Math.max(16, el.getBoundingClientRect().height));
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);
  const mark = onCode ? (
    <button type="button" onClick={onCode} aria-label="Your code: show it to be scanned" title="Your code" style={{ width: h + 10, height: h + 10, flex: "none", display: "grid", placeItems: "center", background: "var(--blk-pur)", border: 0, padding: 0, cursor: "pointer" }}>
      <QrGlyph size={Math.round((h + 10) * 0.66)} />
    </button>
  ) : (
    <span style={{ display: "flex", alignItems: "center", flex: "none" }}>
      <HelpMark size={h} />
    </span>
  );
  const style: React.CSSProperties = { position: "absolute", left: 16 + face * 0.75, right: 16, top: 22, transform: "translateY(-100%)", zIndex: 2 };
  if (!onCode) {
    return (
      <button type="button" className="helpcall" onClick={onClick} aria-label={label} style={style}>
        {mark}
        <span ref={words} className="helpcall-words" style={{ opacity: muted ? 0.75 : 1 }}>{text}</span>
      </button>
    );
  }
  // Two buttons in one bubble: the code, then the words (which open the editor).
  return (
    <span className="helpcall" style={style}>
      {mark}
      <button type="button" onClick={onClick} aria-label={label} style={{ flex: 1, minWidth: 0, background: "none", border: 0, padding: 0, color: "inherit", font: "inherit", textAlign: "left", cursor: "pointer" }}>
        <span ref={words} className="helpcall-words" style={{ opacity: muted ? 0.75 : 1 }}>{text}</span>
      </button>
    </span>
  );
}
