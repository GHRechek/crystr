"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeArt } from "@/components/badges";
import { setShownBadges } from "@/lib/actions";
import type { ShownBadge } from "@/lib/badges";

const SHOW = 5;
const GAP = 6;

/** One badge's picture. */
function Face({ b, size }: { b: ShownBadge; size: number }) {
  if (b.badge) return <BadgeArt b={{ art: b.badge.art, slug: b.badge.slug, tiers: b.badge.tiers }} got tier={b.badge.tier} size={size} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={b.src} alt="" width={size} height={size} style={{ display: "block", imageRendering: "pixelated" }} />;
}

/** The badges a person shows, in a row above their About card, on the profile's own background
 *  (no cards). Tap one for a tooltip with its name and how it is earned. On your own profile the
 *  empty places can be filled, and CHOOSE opens the badges you have earned or hold to pick from
 *  (up to five, in the order you tap them). */
export function ShownBadges({ shown, options, editable }: { shown: ShownBadge[]; options?: ShownBadge[]; editable?: boolean }) {
  const [tip, setTip] = useState<{ key: string; x: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [pick, setPick] = useState<string[]>(shown.map((b) => b.key));
  const row = useRef<HTMLDivElement>(null);
  // Whole multiples of the art's 21 cells keep its pixels square: three times where five fit across
  // the page, twice or once on a narrower one.
  const [px, setPx] = useState(63);
  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const fit = () => {
      const cell = (el.clientWidth - (SHOW - 1) * GAP) / SHOW;
      setPx(cell >= 65 ? 63 : cell >= 44 ? 42 : 21);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // A tooltip goes away on a tap anywhere else, or Escape.
  useEffect(() => {
    if (!tip) return;
    const away = (e: Event) => {
      if (!(e.target as HTMLElement).closest?.("[data-shown-badge], [data-shown-tip]")) setTip(null);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setTip(null);
    document.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [tip]);

  if (!editable && shown.length === 0) return null;

  const tipBadge = tip ? shown.find((b) => b.key === tip.key) : undefined;
  const slots = editable ? Array.from({ length: SHOW }, (_, i) => shown[i] ?? null) : shown;
  const toggle = (key: string) =>
    setPick((p) => (p.includes(key) ? p.filter((k) => k !== key) : p.length >= SHOW ? p : [...p, key]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {editable ? (
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <div className="px" style={{ fontSize: 11, color: "var(--mag-soft)" }}>
            ON SHOW · {shown.length}/{SHOW}
          </div>
          <span className="spacer" />
          <button type="button" className="px" onClick={() => { setPick(shown.map((b) => b.key)); setEditing(true); }} style={{ fontSize: 11, color: "var(--pur-pale)", background: "none", border: 0, cursor: "pointer", padding: "6px 0" }}>
            CHOOSE →
          </button>
        </div>
      ) : null}

      <div ref={row} style={{ position: "relative", display: "flex", justifyContent: editable ? "space-between" : "center", gap: GAP }}>
        {slots.map((b, i) =>
          b ? (
            <button
              key={b.key}
              type="button"
              data-shown-badge
              aria-label={`${b.title}. ${b.line}`}
              aria-expanded={tip?.key === b.key}
              onClick={(e) => {
                const r = e.currentTarget;
                setTip((t) => (t?.key === b.key ? null : { key: b.key, x: r.offsetLeft + r.offsetWidth / 2 }));
              }}
              style={{ flex: "none", width: px + 2, minHeight: px + 2, padding: 1, background: "none", border: 0, cursor: "pointer", display: "grid", placeItems: "center" }}
            >
              <Face b={b} size={px} />
            </button>
          ) : (
            <button
              key={`empty-${i}`}
              type="button"
              aria-label="Choose a badge to show"
              onClick={() => { setPick(shown.map((x) => x.key)); setEditing(true); }}
              style={{ flex: "none", width: px + 2, height: px + 2, background: "none", border: "1px dashed var(--edge)", borderRadius: "var(--px-r)", color: "var(--dim)", cursor: "pointer", fontSize: 16 }}
            >
              +
            </button>
          ),
        )}

        {tipBadge && tip ? (
          <div
            data-shown-tip
            role="tooltip"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "calc(100% + 8px)",
              zIndex: 20,
              padding: "9px 11px",
              background: "var(--raised)",
              boxShadow: "0 0 0 1px var(--edge), 0 8px 24px rgba(0,0,0,.45)",
              borderRadius: "var(--px-r)",
            }}
          >
            <span aria-hidden style={{ position: "absolute", top: -5, left: Math.max(10, Math.min(tip.x - 5, (row.current?.clientWidth ?? 320) - 20)), width: 10, height: 10, background: "var(--raised)", boxShadow: "-1px -1px 0 var(--edge)", transform: "rotate(45deg)" }} />
            <div className="px" style={{ fontSize: 11, color: "var(--text)", lineHeight: 1.5 }}>
              {tipBadge.title}
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.45, color: "var(--muted)", marginTop: 3 }}>{tipBadge.line}</div>
          </div>
        ) : null}
      </div>

      {editing && editable ? (
        <div role="dialog" aria-label="Choose the badges you show" style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", flexDirection: "column", justifyContent: "flex-end", maxWidth: 480, margin: "0 auto" }}>
          <button type="button" aria-label="Close" onClick={() => setEditing(false)} style={{ flex: 1, border: 0, background: "rgba(5,5,12,.6)", cursor: "default" }} />
          <form action={setShownBadges} style={{ maxHeight: "78%", overflowY: "auto", background: "var(--device)", boxShadow: "0 -1px 0 var(--edge), 0 -12px 36px rgba(0,0,0,.5)", padding: "12px 16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
            <input type="hidden" name="list" value={JSON.stringify(pick)} />
            <div style={{ display: "flex", alignItems: "center" }}>
              <div className="px" style={{ fontSize: 12, color: "var(--pur-soft)" }}>
                BADGES TO SHOW · {pick.length}/{SHOW}
              </div>
              <div className="spacer" />
              <button type="button" className="btn btn-sm" onClick={() => setEditing(false)} style={{ minHeight: 40, padding: "0 9px" }}>
                ✕
              </button>
            </div>
            {options && options.length ? (
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
                      <Face b={o} size={42} />
                      <span className="px" style={{ fontSize: 9, lineHeight: 1.2, color: "var(--muted)", textAlign: "center" }}>
                        {o.title}
                      </span>
                      {at >= 0 ? (
                        <span aria-hidden className="px" style={{ position: "absolute", top: 3, right: 3, minWidth: 16, height: 16, display: "grid", placeItems: "center", fontSize: 10, background: "var(--pur)", color: "#fff", borderRadius: 8 }}>
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
      ) : null}
    </div>
  );
}
