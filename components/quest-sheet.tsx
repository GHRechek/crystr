"use client";

import Link from "next/link";
import { useState } from "react";
import { BadgeFace } from "@/components/badge-chooser";
import { QrScanner } from "@/components/qr-scanner";
import type { ShownBadge } from "@/lib/badges";
import { targetLabel } from "@/lib/species";

/** Where each system badge is done, for the ones that have a place to go. */
export const WHERE: Record<string, [string, string]> = {
  "top-five-full": ["/me/top-six", "PICK YOUR TOP 5"],
  "first-bio": ["/me/edit", "EDIT YOUR PROFILE"],
  "token-made": ["/me/token", "MAKE YOUR TOKEN"],
  "visit-the-well": ["/well", "GO TO THE WELL"],
  "vote-on-a-motion": ["/ball?tab=motions", "SEE THE MOTIONS"],
  "publish-an-op-ed": ["/ball", "GO TO THE BALL"],
  "first-trade": ["/me/trades", "YOUR TRADES"],
};

/** Quests that are earned by doing something else: how to find the thing, and where it is. */
const CUSTOM: Record<string, { text: string; link: [string, string] }> = {
  "first-friend": {
    text: "Go to Side Quests, tap WITH SOMEONE, and find a Friend quest, like Human Friend or Elf Friend. Tap it, then scan their QR code from there. Any one of them counts.",
    link: ["/quests?mode=with#side-quests", "GO TO SIDE QUESTS"],
  },
};

const article = (t: string) => (/^[aeiou]/i.test(t) ? "an" : "a");

/** One quest in a list. Tap it (the badge or the name) and a tooltip opens in the middle of the screen
 *  saying how it is earned, with a button to scan a code if it needs one. A quest that needs scanning
 *  has a badge that trembles every few seconds. */
export function QuestRow({ b, face, rest, scan, bare }: { b: ShownBadge; face: React.ReactNode; rest: React.ReactNode; scan?: boolean; bare?: boolean }) {
  const [tip, setTip] = useState(false);
  const [scanning, setScanning] = useState(false);
  const slug = b.key.slice(2);
  const custom = CUSTOM[slug];
  const where = custom?.link ?? WHERE[slug];
  const kind = b.target ? `${article(targetLabel(b.target))} ${targetLabel(b.target).toLowerCase()}` : null;
  const delay = (Array.from(slug).reduce((n, c) => n + c.charCodeAt(0), 0) % 7) * 0.9;
  const open = () => setTip(true);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, width: bare ? undefined : "100%" }}>
        <button type="button" onClick={open} aria-label={`${b.title}: how to earn it`} className={scan && b.locked ? "tremble" : undefined} style={{ flex: "none", padding: 0, border: 0, background: "none", cursor: "pointer", lineHeight: 0, animationDelay: `${delay}s` }}>
          {face}
        </button>
        <button type="button" onClick={open} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, padding: 0, background: "none", border: 0, cursor: "pointer", color: "inherit", font: "inherit", textAlign: "left" }}>
          {rest}
        </button>
      </div>

      {tip ? (
        <div role="dialog" aria-label={b.title} onClick={() => setTip(false)} style={{ position: "fixed", inset: 0, zIndex: 85, background: "rgba(0,0,0,.6)", display: "grid", placeItems: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(340px, 100%)", background: "var(--surface)", border: "1px solid var(--edge)", borderRadius: "var(--px-r)", padding: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
            <BadgeFace b={b} size={64} />
            <div className="px" style={{ fontSize: 12, lineHeight: 1.5, color: "var(--text)" }}>{b.title}</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--muted)" }}>{b.line}</div>
            {b.locked ? (
              <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)" }}>
                {scan
                  ? b.key === "a:a-helping-hand"
                    ? "Scan the QR of the person you helped. They get a note asking whether you did, and if they say yes it counts. Every ten helps brings a tradable badge."
                    : `${kind ? `It has to be ${kind}. ` : ""}Scan ${kind ? `${kind}'s` : "their"} QR code. ${b.instant ? "That is all: it completes the moment you scan." : "They get a whisper asking whether it happened, and if they say yes it counts."}`
                  : b.request
                    ? "Make a post that shows it. It is marked as a badge request, and when a witch likes it, the badge is yours."
                    : custom
                      ? custom.text
                      : b.auto
                        ? "You get this one on your own, the moment it is true."
                        : null}
              </div>
            ) : null}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 4 }}>
              {b.locked && scan ? (
                <button type="button" className="btn btn-purple" onClick={() => { setTip(false); setScanning(true); }} style={{ minHeight: 44 }}>
                  SCAN A CODE
                </button>
              ) : null}
              {b.locked && !scan && b.request ? (
                <Link href={`/post?badge=${slug}`} className="btn btn-purple" style={{ minHeight: 44, display: "inline-flex", alignItems: "center" }}>
                  MAKE THE POST →
                </Link>
              ) : null}
              {b.locked && !scan && !b.request && where ? (
                <Link href={where[0]} className="btn" style={{ minHeight: 44, display: "inline-flex", alignItems: "center" }}>
                  {where[1]} →
                </Link>
              ) : null}
              <button type="button" className="btn" onClick={() => setTip(false)} style={{ minHeight: 44 }}>
                CLOSE
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {scanning ? <QrScanner mode="quest" only={slug} title={b.title} how={b.line} onClose={() => setScanning(false)} /> : null}
    </>
  );
}
