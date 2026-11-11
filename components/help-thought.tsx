"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { HelpMark } from "@/components/help-mark";
import { QrGlyph } from "@/components/about-badges";

/** A call for help in a banner: a speech bubble in the CRYSTR gradient, square, its point toward the portrait,
 *  starting three quarters of the way across it. The words first, then a square button on the right, as tall as
 *  the words: on your own profile it opens your code to be scanned; on someone else's it wears a ! and opens the
 *  scanner, to say you helped them. `face` is the portrait's width. It is placed inside the block that holds the
 *  portrait (which overlaps the banner by half the face), so it paints over the portrait but under anything that
 *  block opens on top. Its bottom sits 30px above the banner's foot: 22px below that block's top. */
export function HelpThought({ text, muted, face = 104, onClick, label, onCode, helped }: {
  text: string;
  /** No words yet: the prompt, greyed. */
  muted?: boolean;
  face?: number;
  /** The words were tapped. */
  onClick?: () => void;
  label?: string;
  /** The square button was tapped: your code (own profile), or the scanner (someone else's). */
  onCode?: () => void;
  /** Someone else's bubble: the button wears a ! and means "I helped them". */
  helped?: boolean;
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
  // The code's square: white, a little smaller than the words, with the code filling most of it.
  const side = h + 4;
  const style: React.CSSProperties = { position: "absolute", left: 16 + face * 0.75, right: 16, top: 22, transform: "translateY(-100%)", zIndex: 2 };
  return (
    <span className="helpcall" style={style}>
      <button type="button" onClick={onClick} aria-label={label} style={{ flex: 1, minWidth: 0, background: "none", border: 0, padding: 0, color: "inherit", font: "inherit", textAlign: "left", cursor: "pointer" }}>
        <span ref={words} className="helpcall-words" style={{ opacity: muted ? 0.75 : 1 }}>{text}</span>
      </button>
      <button type="button" onClick={onCode ?? onClick} aria-label={helped ? "I helped them: scan their code" : "Your code: show it to be scanned"} title={helped ? "I helped them" : "Your code"} style={{ position: "relative", width: side, height: side, flex: "none", display: "grid", placeItems: "center", background: "#fff", border: 0, padding: 0, cursor: "pointer" }}>
        <QrGlyph size={Math.round(side * 0.82)} />
        {helped ? (
          <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
            <HelpMark size={Math.round(side * 0.5)} fill="#fff" edge />
          </span>
        ) : null}
      </button>
    </span>
  );
}
