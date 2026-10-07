import type { ReactNode } from "react";
import { DECAY_FILTER, DECAY_NOTE, SCAN_OPACITY, decayLevel } from "@/lib/crystr";

/** The low-mana effect, for every screen: the page washes out and blurs,
 *  scanlines come down over it, and a note says why. It lives once, in the app
 *  layout, so no screen can be forgotten. The header, the tab bar and the
 *  toast sit outside it, so you can always see your mana and get around.
 *
 *  The text itself is eaten separately, by corrupt(), on screens that show
 *  someone's words — never in a field you can edit, or the damage would be
 *  saved. Level 0 renders the children untouched. */
export function DecayFrame({ mana, children }: { mana: number; children: ReactNode }) {
  const level = decayLevel(mana);
  if (level === 0) return <>{children}</>;

  return (
    <>
      <div style={{ filter: DECAY_FILTER[level] }}>
        <div className="degrading" style={{ margin: "14px 16px 0" }}>
          <span className="px" style={{ fontSize: 13, color: "var(--mag)" }}>
            !
          </span>
          <div>
            <div className="px" style={{ fontSize: 9.5, color: "var(--mag-soft)", marginBottom: 4 }}>
              SIGNAL DEGRADING
            </div>
            <div style={{ fontSize: 11.5, lineHeight: 1.5, color: "var(--text-3)" }}>
              {DECAY_NOTE[level]}
            </div>
          </div>
        </div>
        {children}
      </div>
      <div className="scanlines" style={{ opacity: SCAN_OPACITY[level] }} />
    </>
  );
}
