"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { HelpMark } from "@/components/help-mark";

/** A call for help in a banner: the question mark stands on the portrait, three quarters of the way
 *  across it, and the box with the words starts right after. The mark is as tall as the words: one line,
 *  one line's height; three lines, all three. `face` is the portrait's width; both sit 16px in. */
export function HelpThought({ text, muted, face = 104, onClick, label }: {
  text: string;
  /** No words yet: the prompt, greyed. */
  muted?: boolean;
  face?: number;
  onClick?: () => void;
  label?: string;
}) {
  const box = useRef<HTMLSpanElement>(null);
  const [h, setH] = useState(22);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const read = () => setH(Math.max(18, el.getBoundingClientRect().height - 20));   // the box's padding comes off
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);
  return (
    <button type="button" className="helpcall" onClick={onClick} aria-label={label} style={{ position: "absolute", left: 16 + face * 0.75, right: 12, bottom: 30, zIndex: 2 }}>
      <span style={{ display: "flex", alignItems: "center", flex: "none" }}>
        <HelpMark size={h} />
      </span>
      <span ref={box} className="helpcall-box">
        <span style={{ color: muted ? "var(--muted)" : undefined }}>{text}</span>
      </span>
    </button>
  );
}
