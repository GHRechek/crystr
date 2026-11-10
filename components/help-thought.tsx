"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { HelpMark } from "@/components/help-mark";

/** A call for help in a banner: a speech bubble, rounded, no outline, its point toward the portrait,
 *  starting three quarters of the way across it. Inside, the question mark then the words; the mark is as
 *  tall as the words: one line, one line's height; three lines, all three. `face` is the portrait's width. */
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
    <button type="button" className="helpcall" onClick={onClick} aria-label={label} style={{ position: "absolute", left: 16 + face * 0.75, right: 10, bottom: 30, zIndex: 2 }}>
      <span style={{ display: "flex", alignItems: "center", flex: "none" }}>
        <HelpMark size={h} />
      </span>
      <span ref={words} style={{ color: muted ? "var(--muted)" : undefined }}>{text}</span>
    </button>
  );
}
