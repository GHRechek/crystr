"use client";

import { useEffect, useRef } from "react";
import { BadgeArt } from "@/components/badges";

/** A short, original 8-bit fanfare: a rising arpeggio and a held chord, square waves. Plays once. */
export function playFanfare() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const notes: [number, number, number][] = [
      // [frequency, start, length] in seconds
      [392.0, 0.0, 0.12], [523.25, 0.13, 0.12], [659.25, 0.26, 0.12], [783.99, 0.39, 0.12],
      [698.46, 0.6, 0.12], [880.0, 0.73, 0.12], [1046.5, 0.86, 0.7],
      [659.25, 0.86, 0.7], [523.25, 0.86, 0.7],
    ];
    for (const [f, t, len] of notes) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + len);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + len + 0.05);
    }
    window.setTimeout(() => void ctx.close(), 2200);
  } catch {
    // No sound is fine.
  }
}

/** The wooden crate the badge rises out of: a front, a dark mouth, two lid boards thrown open. */
function Crate() {
  return (
    <svg viewBox="0 0 40 26" width={200} height={130} shapeRendering="crispEdges" aria-hidden="true" style={{ display: "block", position: "relative", zIndex: 2 }}>
      {/* open lid boards */}
      <rect x={0} y={0} width={12} height={4} fill="#5a3416" transform="rotate(-18 6 4)" />
      <rect x={28} y={0} width={12} height={4} fill="#5a3416" transform="rotate(18 34 4)" />
      {/* the crate's mouth */}
      <rect x={2} y={4} width={36} height={3} fill="#1c0f06" />
      {/* the front */}
      <rect x={1} y={6} width={38} height={20} fill="#7a4a1f" />
      <rect x={1} y={6} width={38} height={2} fill="#9c6330" />
      <rect x={1} y={13} width={38} height={1} fill="#5a3416" />
      <rect x={1} y={19} width={38} height={1} fill="#5a3416" />
      <rect x={1} y={6} width={3} height={20} fill="#5a3416" />
      <rect x={36} y={6} width={3} height={20} fill="#5a3416" />
      {/* the cross-brace */}
      <rect x={6} y={8} width={2} height={2} fill="#c08a45" />
      <rect x={32} y={8} width={2} height={2} fill="#c08a45" />
      <rect x={6} y={22} width={2} height={2} fill="#c08a45" />
      <rect x={32} y={22} width={2} height={2} fill="#c08a45" />
      <rect x={0} y={25} width={40} height={1} fill="#2a1508" />
    </svg>
  );
}

export type AskSide = "ask" | "wait";

/** The screen both people see when one asks the other, face to face, to confirm a quest (or a trade):
 *  the badge rises out of a pixel crate to a fanfare, the question sits on top, and the person being
 *  asked answers YES or NO (trembling words, not buttons). The asker sees the same scene with
 *  "Waiting…" until the answer lands. */
export function AskScene({
  side,
  badge,
  title,
  question,
  who,
  result,
  onYes,
  onNo,
  onClose,
  sound = true,
}: {
  side: AskSide;
  badge: { art: string | null; slug: string; tiers?: number };
  /** The badge's name, under it. */
  title: string;
  /** What the person being asked is asked, e.g. "Would you call sammi a friend?". */
  question: string;
  /** The other person's handle. */
  who: string;
  result?: "yes" | "no" | null;
  onYes?: () => void;
  onNo?: () => void;
  onClose?: () => void;
  sound?: boolean;
}) {
  const played = useRef(false);
  useEffect(() => {
    if (sound && !played.current) {
      played.current = true;
      window.setTimeout(playFanfare, 900);
    }
  }, [sound]);

  return (
    <div role="dialog" aria-label={question} className="ask-scene">
      <div className="ask-rays" aria-hidden />
      <div className="px ask-question">{question}</div>

      <div className="ask-stage">
        <div className="ask-badge">
          <BadgeArt b={{ art: badge.art, slug: badge.slug, tiers: badge.tiers ?? 1 }} got tier={1} size={84} />
          <span className="ask-glint g1" aria-hidden />
          <span className="ask-glint g2" aria-hidden />
          <span className="ask-glint g3" aria-hidden />
        </div>
        <Crate />
        <div className="px ask-title">{title.toUpperCase()}</div>
      </div>

      {result ? (
        <div className={`px ask-result ${result === "yes" ? "is-yes" : "is-no"}`}>
          {result === "yes" ? (side === "wait" ? `${who.toUpperCase()} SAID YES!` : "CONFIRMED!") : side === "wait" ? `${who.toUpperCase()} SAID NO` : "NOT THIS TIME"}
        </div>
      ) : side === "wait" ? (
        <div className="px ask-waiting">
          WAITING ON {who.toUpperCase()}<span className="ask-dots" aria-hidden><i>.</i><i>.</i><i>.</i></span>
        </div>
      ) : (
        <div className="ask-choices">
          <button type="button" className="px ask-yes" onClick={onYes}>YES</button>
          <button type="button" className="px ask-no" onClick={onNo}>NO</button>
        </div>
      )}

      {onClose && (result || side === "wait") ? (
        <button type="button" className="px ask-close" onClick={onClose}>{result ? "CLOSE" : "CLOSE · KEEP WAITING"}</button>
      ) : null}
    </div>
  );
}
