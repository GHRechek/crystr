"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { DECAY_FILTER, DECAY_NOTE, SCAN_OPACITY, decayLevel } from "@/lib/crystr";

const DISMISSED = "crystr.signal-dismissed";

/** The low-mana effect, for every screen: the page washes out and blurs,
 *  scanlines come down over it, and a card floats in the middle of the screen
 *  saying why, with the way out (RECOVER goes to the Well) and NO THANKS to put
 *  it away. Put away, it stays away until the signal gets worse. It lives once,
 *  in the app layout, so no screen can be forgotten. The header, the tab bar and
 *  the toast sit outside it, so you can always see your mana and get around.
 *
 *  The text itself is eaten separately, by corrupt(), on screens that show
 *  someone's words — never in a field you can edit, or the damage would be
 *  saved. Level 0 renders the children untouched. */
export function DecayFrame({ mana, children }: { mana: number; children: ReactNode }) {
  const level = decayLevel(mana);
  // Hidden until we know it was not already put away, so it never flashes on.
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (level === 0) return;
    try {
      const put = Number(sessionStorage.getItem(DISMISSED) ?? "0");
      setShown(level > put);
    } catch {
      setShown(true);
    }
  }, [level]);

  function dismiss() {
    setShown(false);
    try {
      sessionStorage.setItem(DISMISSED, String(level));
    } catch {
      // No storage: it comes back next screen, which is fair.
    }
  }

  if (level === 0) return <>{children}</>;

  return (
    <>
      <div className="scanlines" style={{ opacity: SCAN_OPACITY[level] }} />
      {shown ? (
        <div className="signal-float">
          <div className="signal-card" role="alertdialog" aria-labelledby="signal-title" aria-describedby="signal-text">
            <button type="button" className="btn btn-sm signal-x" onClick={dismiss} aria-label="Put this away">
              ✕
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="px" style={{ fontSize: 16, color: "var(--mag)" }}>
                !
              </span>
              <div id="signal-title" className="px" style={{ fontSize: 12, color: "var(--mag-soft)", letterSpacing: ".07em" }}>
                SIGNAL DEGRADING
              </div>
            </div>
            <div id="signal-text" style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--text-2)" }}>
              {DECAY_NOTE[level]}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Link href="/well" className="btn btn-purple" onClick={dismiss} style={{ flex: 1, minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                RECOVER
              </Link>
              <button type="button" className="btn" onClick={dismiss} style={{ flex: 1, minHeight: 44 }}>
                NO THANKS.
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div style={{ filter: DECAY_FILTER[level] }}>{children}</div>
    </>
  );
}
