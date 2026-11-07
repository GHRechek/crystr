"use client";

import { useState } from "react";
import { BadgeArt } from "@/components/badges";
import { setShownBadges } from "@/lib/actions";
import { SHOW_MAX, type ShownBadge } from "@/lib/badges";

const SHOW = SHOW_MAX;

/** One badge's picture. */
export function BadgeFace({ b, size }: { b: ShownBadge; size: number }) {
  if (b.badge) return <BadgeArt b={{ art: b.badge.art, slug: b.badge.slug, tiers: b.badge.tiers }} got tier={b.badge.tier} size={size} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={b.src} alt="" width={size} height={size} style={{ display: "block", imageRendering: "pixelated" }} />;
}

/** The sheet for choosing which of your badges are on show: the ones you have earned and the
 *  tradable ones you hold, up to five, numbered in the order you tap them. SHOW THESE saves. */
export function BadgeChooser({ options, current, onClose }: { options: ShownBadge[]; current: string[]; onClose: () => void }) {
  const [pick, setPick] = useState<string[]>(current);
  const toggle = (key: string) =>
    setPick((p) => (p.includes(key) ? p.filter((k) => k !== key) : p.length >= SHOW ? p : [...p, key]));

  return (
    <div role="dialog" aria-label="Choose the badges you show" style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", flexDirection: "column", justifyContent: "flex-end", maxWidth: 480, margin: "0 auto" }}>
      <button type="button" aria-label="Close" onClick={onClose} style={{ flex: 1, border: 0, background: "rgba(5,5,12,.6)", cursor: "default" }} />
      <form action={setShownBadges} style={{ maxHeight: "78%", overflowY: "auto", background: "var(--device)", boxShadow: "0 -1px 0 var(--edge), 0 -12px 36px rgba(0,0,0,.5)", padding: "12px 16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        <input type="hidden" name="list" value={JSON.stringify(pick)} />
        <div style={{ display: "flex", alignItems: "center" }}>
          <div className="px" style={{ fontSize: 12, color: "var(--pur-soft)" }}>
            BADGES TO SHOW · {pick.length}/{SHOW}
          </div>
          <div className="spacer" />
          <button type="button" className="btn btn-sm" onClick={onClose} style={{ minHeight: 40, padding: "0 9px" }}>
            ✕
          </button>
        </div>
        {options.length ? (
          <div role="listbox" aria-multiselectable aria-label="Your badges" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
            {options.map((o) => {
              const at = pick.indexOf(o.key);
              return (
                <button
                  key={o.key}
                  type="button"
                  role="option"
                  aria-selected={at >= 0}
                  aria-label={o.title}
                  title={o.title}
                  onClick={() => toggle(o.key)}
                  style={{ position: "relative", padding: 6, background: at >= 0 ? "rgba(145,132,217,.18)" : "var(--surface)", border: `1px solid ${at >= 0 ? "var(--pur)" : "var(--edge)"}`, borderRadius: "var(--px-r)", cursor: "pointer", display: "grid", placeItems: "center", gap: 4 }}
                >
                  <BadgeFace b={o} size={42} />
                  <span className="px" style={{ fontSize: 9, lineHeight: 1.2, color: "var(--muted)", textAlign: "center" }}>
                    {o.title}
                  </span>
                  {at >= 0 ? (
                    <span aria-hidden className="px" style={{ position: "absolute", top: 3, right: 3, minWidth: 16, height: 16, display: "grid", placeItems: "center", fontSize: 10, background: "var(--pur)", color: "#fff", borderRadius: 0 }}>
                      {at + 1}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="notice">You have not earned or been given any badges to show yet.</div>
        )}
        <button type="submit" className="btn btn-lg btn-purple btn-block">
          SHOW THESE
        </button>
      </form>
    </div>
  );
}
