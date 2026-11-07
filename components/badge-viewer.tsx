"use client";

import { useState } from "react";
import { BadgeFace } from "@/components/badge-chooser";
import { setShownBadges } from "@/lib/actions";
import { HistorikalCard } from "@/components/historikal-card";
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
  const [card, setCard] = useState<ShownBadge | null>(null);
  const all = [...earned, ...tradable];
  const lineup = pick.filter((k) => k.startsWith("i:"));
  const byKey = (k: string) => all.find((b) => b.key === k);
  // Move a lineup member one place earlier: swap it with the Historikal before it.
  const earlier = (k: string) => setPick((p) => {
    const ix = p.filter((x) => x.startsWith("i:"));
    const at = ix.indexOf(k);
    if (at <= 0) return p;
    const a = p.indexOf(ix[at - 1]), b = p.indexOf(k), next = [...p];
    [next[a], next[b]] = [next[b], next[a]];
    return next;
  });
  const list = tab === 0 ? earned : tradable;

  const tap = (b: ShownBadge) => {
    setLast(b);
    // Just looking (someone else's, or not editing): a Historikal opens its card.
    if (!editable && b.hk) { setCard(b); return; }
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
            {editable ? `EDIT LINEUP · SHOWING ${pick.length}/${SHOW_MAX}` : "BADGES"}
          </div>
          <span className="spacer" />
          {aside}
          {inline ? null : (
            <button type="button" className="btn btn-sm" onClick={onClose} aria-label="Close" style={{ minHeight: 40, padding: "0 10px" }}>
              ✕
            </button>
          )}
        </div>

        {editable ? (
          // Your lineup: the three Historikals you battle with, in order. Tap one to take it out; ◀ moves it up.
          <div style={{ padding: inline ? "0 0 10px" : "0 16px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="px" style={{ fontSize: 10, color: "#e0398a" }}>LINEUP · THE THREE YOU BATTLE WITH</div>
            <div style={{ display: "flex", gap: 10 }}>
              {[0, 1, 2].map((n) => {
                const k = lineup[n], b = k ? byKey(k) : undefined;
                const ko = (b?.hk?.hp ?? 1) <= 0;
                return (
                  <div key={n} style={{ position: "relative", width: 76, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    {b ? (
                      <>
                        <button type="button" onClick={() => setPick((p) => p.filter((x) => x !== k))} aria-label={`${b.title}: take out of your lineup`} style={{ border: 0, background: "none", padding: 0, cursor: "pointer", lineHeight: 0, filter: ko ? "grayscale(1) brightness(.6)" : undefined }}>
                          <BadgeFace b={b} size={56} />
                        </button>
                        <span className="px" style={{ fontSize: 9, color: ko ? "#ff5a7a" : "var(--muted)", textAlign: "center" }}>{ko ? "KNOCKED OUT" : b.title}</span>
                        {n > 0 ? <button type="button" className="btn btn-sm" onClick={() => earlier(k)} aria-label={`Move ${b.title} earlier`} style={{ position: "absolute", left: -8, top: 18, minHeight: 24, minWidth: 24, padding: 0, fontSize: 10 }}>◀</button> : null}
                      </>
                    ) : (
                      <div className="px" style={{ width: 56, height: 56, display: "grid", placeItems: "center", color: "var(--dim)", outline: "1px dashed var(--edge)", outlineOffset: -1, fontSize: 14 }}>{n + 1}</div>
                    )}
                  </div>
                );
              })}
            </div>
            {lineup.length < 3 ? <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Pick from HISTORIKALS below. You need three with hearts left to battle.</div> : null}
            {lineup.some((k) => (byKey(k)?.hk?.hp ?? 1) <= 0) ? <div style={{ fontSize: 11.5, color: "#ff5a7a" }}>Heal the knocked-out one on Your Historikals, or swap it out, before you battle.</div> : null}
          </div>
        ) : null}

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
              <div className="px" style={{ fontSize: 11, color: "var(--text)", display: "flex", alignItems: "center", gap: 8 }}>
                {last.title}
                {last.hk ? <button type="button" className="btn btn-sm" onClick={() => setCard(last)} style={{ minHeight: 26, fontSize: 9, padding: "0 8px" }}>VIEW CARD</button> : null}
              </div>
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
                    <span style={{ lineHeight: 0, outline: b.hk ? "none" : n >= 0 ? "2px solid var(--pur)" : last?.key === b.key ? "2px solid var(--edge)" : "none", outlineOffset: 3, filter: (b.hk?.hp ?? 1) <= 0 ? "grayscale(1) brightness(.6)" : undefined }}>
                      <BadgeFace b={b} size={63} />
                    </span>
                    <span className="px" style={{ fontSize: 10, lineHeight: 1.35, color: n >= 0 ? "var(--text)" : "var(--muted)", textAlign: "center", overflowWrap: "anywhere" }}>
                      {b.title}
                    </span>
                    {n >= 0 ? (
                      <span aria-hidden className="px" style={{ position: "absolute", top: -2, right: 4, minWidth: 16, height: 16, display: "grid", placeItems: "center", fontSize: 10, lineHeight: 1, background: "var(--pur)", color: "#fff", borderRadius: 0 }}>
                        {b.hk ? lineup.indexOf(b.key) + 1 : n + 1}
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
              SAVE
            </button>
          </div>
        ) : null}
      </form>
      {card?.hk ? <HistorikalCard hk={card.hk} line={card.line} own={!!editable} lineupPos={lineup.indexOf(card.key)} onClose={() => setCard(null)} /> : null}
    </div>
  );
}
