"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { HelpMark } from "@/components/help-mark";

/** A call for help in a banner: a speech bubble, rounded, no outline, its point toward the portrait,
 *  starting three quarters of the way across it. Inside, the question mark then the words; the mark is as
 *  tall as the words: one line, one line's height; three lines, all three. `face` is the portrait's width.
 *  It is placed inside the block that holds the portrait (which overlaps the banner by half the face), so
 *  it paints over the portrait but under anything that block opens on top, like the scanner. Its bottom
 *  sits 30px above the banner's foot: 22px below that block's top. */
export function HelpThought({ text, muted, face = 104, onClick, label }: {
  text: string;
  /** No words yet: the prompt, greyed. */
  muted?: boolean;
  face?: number;
  onClick?: () => void;
  label?: string;
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
  return (
    <button type="button" className="helpcall" onClick={onClick} aria-label={label} style={{ position: "absolute", left: 16 + face * 0.75, right: 10, top: 22, transform: "translateY(-100%)", zIndex: 2 }}>
      {/* The mark, as tall as the words. */}
      <span style={{ display: "flex", alignItems: "center", flex: "none" }}>
        <HelpMark size={h} />
      </span>
      <span ref={words} style={{ opacity: muted ? 0.75 : 1 }}>{text}</span>
    </button>
  );
}
