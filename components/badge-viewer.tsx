"use client";

import { useState } from "react";
import { BadgeFace } from "@/components/badge-chooser";
import { setShownBadges } from "@/lib/actions";
import { SHOW_MAX, type ShownBadge } from "@/lib/badges";

/** Historikals in the display are your lineup: the three you battle with. */
const LINEUP = 3;

/** Every badge a person has, full screen: no cards, just the pictures on the background, in two
 *  tabs, earned and Historikals. Tap one to read what it is and how it was earned. On your own
 *  page (`editable`) tapping also picks up to five to show on the profile, numbered in the order
 *  you tap, and SAVE keeps them; on someone else's page it is only for looking. */
export function BadgeViewer({
  earned,
  tradable,
  current,
  editable,
  aside,
  onClose,
  inline,
}: {
  earned: ShownBadge[];
  tradable: ShownBadge[];
  current: string[];
  editable?: boolean;
  aside?: React.ReactNode;
  onClose?: () => void;
  /** Sit in the page instead of covering it: no close button, and the page scrolls. */
  inline?: boolean;
}) {
  const [tab, setTab] = useState(0);
  const [pick, setPick] = useState<string[]>(current);
  const [last, setLast] = useState<ShownBadge | null>(null);
  const list = tab === 0 ? earned : tradable;

  const tap = (b: ShownBadge) => {
    setLast(b);
    // At most three Historikals: they are your lineup, the team you battle with.
    const full = (p: string[]) => p.length >= SHOW_MAX || (b.key.startsWith("i:") && p.filter((k) => k.startsWith("i:")).length >= LINEUP);
    if (editable) setPick((p) => (p.includes(b.key) ? p.filter((k) => k !== b.key) : full(p) ? p : [...p, b.key]));
  };

  return (
    <div role={inline ? undefined : "dialog"} aria-label="All badges" style={inline ? { display: "flex", flexDirection: "column" } : { position: "fixed", inset: 0, zIndex: 80, maxWidth: 480, margin: "0 auto", background: "var(--device)", display: "flex", flexDirection: "column" }}>
      <form action={editable ? setShownBadges : undefined} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <input type="hidden" name="list" value={JSON.stringify(pick)} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: inline ? "4px 0 8px" : "14px 16px 8px" }}>
          <div className="px" style={{ fontSize: 12, color: "var(--pur-soft)" }}>
            BADGES{editable ? ` · SHOWING ${pick.length}/${SHOW_MAX} · LINEUP ${pick.filter((k) => k.startsWith("i:")).length}/${LINEUP}` : ""}
          </div>
          <span className="spacer" />
          {aside}
          {inline ? null : (
            <button type="button" className="btn btn-sm" onClick={onClose} aria-label="Close" style={{ minHeight: 40, padding: "0 10px" }}>
              ✕
            </button>
          )}
        </div>

        <div className="seg" style={{ margin: inline ? 0 : "0 16px" }}>
          <button type="button" data-on={tab === 0} onClick={() => setTab(0)}>
            EARNED · {earned.length}
          </button>
          <button type="button" data-on={tab === 1} onClick={() => setTab(1)}>
            HISTORIKALS · {tradable.length}
          </button>
        </div>

        <div style={{ minHeight: 56, padding: inline ? "10px 0 4px" : "10px 16px 4px" }} aria-live="polite">
          {last ? (
            <>
              <div className="px" style={{ fontSize: 11, color: "var(--text)" }}>{last.title}</div>
              <div style={{ fontSize: 12, lineHeight: 1.4, color: "var(--muted)" }}>{last.line}</div>
            </>
          ) : (
            <div style={{ fontSize: 12, lineHeight: 1.4, color: "var(--muted)" }}>
              {editable ? `Tap a badge to read it, and to show it on your profile: up to ${SHOW_MAX}. The Historikals you show, up to ${LINEUP}, are your lineup, the team you battle with.` : "Tap a badge to read what it is and how it was earned."}
            </div>
          )}
        </div>

        <div style={inline ? { padding: "8px 0 16px" } : { flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 16px 16px" }}>
          {list.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "14px 10px" }}>
              {list.map((b) => {
                const n = pick.indexOf(b.key);
                return (
                  <button
                    key={b.key}
                    type="button"
                    aria-label={`${b.title}. ${b.line}`}
                    aria-pressed={editable ? n >= 0 : undefined}
                    onClick={() => tap(b)}
                    style={{ position: "relative", flex: "none", width: 80, padding: "4px 0 0", background: "none", border: 0, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: "inherit" }}
                  >
                    <span style={{ lineHeight: 0, outline: n >= 0 ? "2px solid var(--pur)" : last?.key === b.key ? "2px solid var(--edge)" : "none", outlineOffset: 3 }}>
                      <BadgeFace b={b} size={63} />
                    </span>
                    <span className="px" style={{ fontSize: 10, lineHeight: 1.35, color: n >= 0 ? "var(--text)" : "var(--muted)", textAlign: "center", overflowWrap: "anywhere" }}>
                      {b.title}
                    </span>
                    {n >= 0 ? (
                      <span aria-hidden className="px" style={{ position: "absolute", top: -2, right: 4, minWidth: 16, height: 16, display: "grid", placeItems: "center", fontSize: 10, lineHeight: 1, background: "var(--pur)", color: "#fff", borderRadius: 0 }}>
                        {n + 1}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="empty">NONE YET</div>
          )}
        </div>

        {editable ? (
          <div style={{ padding: inline ? "4px 0 12px" : "8px 16px 20px" }}>
            <button type="submit" className="btn btn-lg btn-purple btn-block">
              SHOW THESE
            </button>
          </div>
        ) : null}
      </form>
    </div>
  );
}
