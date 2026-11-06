"use client";

import { useState } from "react";
import { BadgeFace } from "@/components/badge-chooser";
import { ArrowIcon } from "@/components/icons";
import { setWorkingOn } from "@/lib/actions";
import { WORKING_MAX, type ShownBadge } from "@/lib/badges";

const PER_PAGE = 20; // rows to a page, scrolling

/** "Working on": the badges a person is going after, as a plain list, one to a row, each with
 *  what it takes. On your own profile a button opens every badge there is, to pick up to five
 *  (tap to pick, tap again to put back; the order you pick them is the order they are listed in). */
export function WorkingOn({ items, all, editable }: { items: ShownBadge[]; all?: ShownBadge[]; editable?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<string[]>(items.map((b) => b.key));
  const [page, setPage] = useState(0);

  if (!editable && items.length === 0) return null;

  const options = all ?? [];
  const pages = Math.max(1, Math.ceil(options.length / PER_PAGE));
  const at = Math.min(page, pages - 1);
  const toggle = (b: ShownBadge) => {
    setPick((p) => (p.includes(b.key) ? p.filter((k) => k !== b.key) : p.length >= WORKING_MAX ? p : [...p, b.key]));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="px" style={{ fontSize: 12, color: "var(--blu-soft)", minHeight: 24, display: "flex", alignItems: "center" }}>
        WORKING ON <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 6 }}>· {items.length}/{WORKING_MAX}</span>
      </div>

      {items.length ? (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((b) => (
            <li key={b.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ flex: "none", opacity: b.locked ? 0.7 : 1, lineHeight: 0 }}>
                <BadgeFace b={b} size={42} />
              </span>
              <span style={{ minWidth: 0 }}>
                <span className="px" style={{ display: "block", fontSize: 11, color: "var(--text)", lineHeight: 1.5 }}>
                  {b.title}
                </span>
                <span style={{ display: "block", fontSize: 12, lineHeight: 1.4, color: "var(--muted)" }}>{b.line}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)" }}>Nothing picked yet. See all the badges and choose up to five to go after.</div>
      )}

      {editable ? (
        <button
          type="button"
          className="btn btn-block"
          onClick={() => {
            setPick(items.map((b) => b.key));
            setPage(0);
            setOpen(true);
          }}
          style={{ minHeight: 44 }}
        >
          SEE ALL BADGES · CHOOSE WHAT YOU ARE WORKING ON
        </button>
      ) : null}

      {open && editable ? (
        <div role="dialog" aria-label="Choose what you are working on" style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto" }}>
          <form action={setWorkingOn} style={{ flex: 1, minHeight: 0, overflowY: "auto", background: "var(--device)", padding: "16px 16px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
            <input type="hidden" name="list" value={JSON.stringify(pick)} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="px" style={{ fontSize: 12, color: "var(--pur-soft)" }}>
                ALL BADGES · {pick.length}/{WORKING_MAX}
              </div>
              <span className="spacer" />
              {pages > 1 ? (
                <>
                  <span className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
                    {at + 1} / {pages}
                  </span>
                  <button type="button" className="btn btn-sm" aria-label="Previous page" disabled={at === 0} onClick={() => setPage(at - 1)} style={{ minHeight: 32, minWidth: 34, padding: 0 }}>
                    <ArrowIcon dir="left" />
                  </button>
                  <button type="button" className="btn btn-sm" aria-label="Next page" disabled={at === pages - 1} onClick={() => setPage(at + 1)} style={{ minHeight: 32, minWidth: 34, padding: 0 }}>
                    <ArrowIcon dir="right" />
                  </button>
                </>
              ) : null}
              <button type="button" className="btn btn-sm" onClick={() => setOpen(false)} style={{ minHeight: 40, padding: "0 9px" }}>
                ✕
              </button>
            </div>

            <div role="listbox" aria-multiselectable aria-label="All badges" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {options.slice(at * PER_PAGE, (at + 1) * PER_PAGE).map((b) => {
                const n = pick.indexOf(b.key);
                return (
                  <button
                    key={b.key}
                    type="button"
                    role="option"
                    aria-selected={n >= 0}
                    onClick={() => toggle(b)}
                    style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, textAlign: "left", padding: "6px 8px", background: n >= 0 ? "rgba(145,132,217,.18)" : "var(--surface)", border: `1px solid ${n >= 0 ? "var(--pur)" : "var(--edge)"}`, borderRadius: "var(--px-r)", cursor: "pointer", color: "inherit", font: "inherit" }}
                  >
                    <span style={{ flex: "none", lineHeight: 0, opacity: b.locked ? 0.7 : 1 }}>
                      <BadgeFace b={b} size={42} />
                    </span>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span className="px" style={{ display: "block", fontSize: 11, color: "var(--text)", lineHeight: 1.5 }}>{b.title}</span>
                      <span style={{ display: "block", fontSize: 12, lineHeight: 1.4, color: "var(--muted)" }}>{b.line}</span>
                    </span>
                    {n >= 0 ? (
                      <span aria-hidden className="px" style={{ flex: "none", minWidth: 20, height: 20, display: "grid", placeItems: "center", fontSize: 11, background: "var(--pur)", color: "#fff", borderRadius: 10 }}>{n + 1}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <button type="submit" className="btn btn-lg btn-purple btn-block">
              SAVE
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
