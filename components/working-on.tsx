"use client";

import Link from "next/link";
import { useState } from "react";
import { BadgeFace } from "@/components/badge-chooser";
import { ArrowIcon } from "@/components/icons";
import { BadgeEditor, type BadgeDraft as Draft } from "@/components/badge-editor";
import { setWorkingOn, vouchFromProfile } from "@/lib/actions";
import { WORKING_MAX, type ShownBadge } from "@/lib/badges";

const PER_PAGE = 20; // rows to a page, scrolling

/** "Working on": the badges a person is going after, as a plain list, one to a row, each with
 *  what it takes. On your own profile a button opens every badge there is, to pick up to five
 *  (tap to pick, tap again to put back; the order you pick them is the order they are listed in). */
export function WorkingOn({ items, all, editable, person, finished, isWitch, openAtStart }: { items: ShownBadge[]; all?: ShownBadge[]; editable?: boolean; person?: { id: string; handle: string }; finished?: string[]; isWitch?: boolean; openAtStart?: boolean }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [say, setSay] = useState<string | null>(null);
  const [open, setOpen] = useState(!!openAtStart && !!editable);
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
          {items.map((b) => {
            const row = (
              <>
                <span style={{ flex: "none", opacity: b.locked ? 0.7 : 1, lineHeight: 0 }}>
                  <BadgeFace b={b} size={42} />
                </span>
                <span style={{ minWidth: 0, textAlign: "left" }}>
                  <span className="px" style={{ display: "block", fontSize: 11, color: "var(--text)", lineHeight: 1.5 }}>
                    {b.title}
                  </span>
                  <span style={{ display: "block", fontSize: 12, lineHeight: 1.4, color: "var(--muted)" }}>{b.line}</span>
                </span>
              </>
            );
            // On someone else's page a badge they are working on can be tapped to say
            // "they helped me" or "we met up".
            // On your own page, a badge to ask a witch for opens the way to make the post.
            if (editable && b.request) {
              const open = say === b.key;
              return (
                <li key={b.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <button type="button" aria-expanded={open} onClick={() => setSay(open ? null : b.key)} style={{ display: "flex", alignItems: "center", gap: 10, padding: 0, background: "none", border: 0, cursor: "pointer", color: "inherit", font: "inherit" }}>
                    {row}
                  </button>
                  {open ? (
                    <div style={{ paddingLeft: 52, display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ fontSize: 12, lineHeight: 1.45, color: "var(--muted)" }}>Make a post that shows it. It is marked as a badge request, and when a witch likes it, the badge is yours.</div>
                      <Link href={`/post?badge=${b.key.slice(2)}`} className="btn btn-sm btn-purple" style={{ minHeight: 40, alignSelf: "flex-start", display: "inline-flex", alignItems: "center" }}>
                        MAKE THE POST →
                      </Link>
                    </div>
                  ) : null}
                </li>
              );
            }
            if (!person || !b.key.startsWith("a:")) {
              return (
                <li key={b.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {row}
                </li>
              );
            }
            const open = say === b.key;
            return (
              <li key={b.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setSay(open ? null : b.key)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: 0, background: "none", border: 0, cursor: "pointer", color: "inherit", font: "inherit" }}
                >
                  {row}
                </button>
                {open ? (
                  <div style={{ display: "flex", gap: 8, paddingLeft: 52 }}>
                    {(
                      [
                        ["helped", "THEY HELPED ME"],
                        ["meetup", "WE MET UP"],
                      ] as const
                    ).map(([kind, label]) => (
                      <form key={kind} action={vouchFromProfile} style={{ flex: 1, minWidth: 0 }}>
                        <input type="hidden" name="kind" value={kind} />
                        <input type="hidden" name="person_id" value={person.id} />
                        <input type="hidden" name="handle" value={person.handle} />
                        <input type="hidden" name="badge" value={b.key.slice(2)} />
                        <button type="submit" className="btn btn-sm btn-block" style={{ minHeight: 40 }}>
                          {label}
                        </button>
                      </form>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)" }}>Nothing picked yet. See all the badges and choose up to five to go after.</div>
      )}

      {editable && (finished?.length || items.length < WORKING_MAX) ? (
        <div className="notice" style={{ fontSize: 12, lineHeight: 1.5 }}>
          {finished?.length
            ? `You earned ${finished.join(" and ")}. `
            : ""}
          {items.length < WORKING_MAX ? "Pick a new goal." : ""}
        </div>
      ) : null}

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
              {isWitch ? (
                <button type="button" className="btn btn-sm" onClick={() => setDraft({ title: "", how: "", blurb: "", art: 1 })} style={{ minHeight: 32, padding: "0 9px" }}>
                  + NEW BADGE
                </button>
              ) : null}
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
                  <div
                    key={b.key}
                    role="option"
                    tabIndex={0}
                    aria-selected={n >= 0}
                    onClick={() => toggle(b)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggle(b))}
                    style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, textAlign: "left", padding: "6px 8px", background: n >= 0 ? "rgba(145,132,217,.18)" : "var(--surface)", border: `1px solid ${n >= 0 ? "var(--pur)" : "var(--edge)"}`, borderRadius: "var(--px-r)", cursor: "pointer", color: "inherit", font: "inherit" }}
                  >
                    <span style={{ flex: "none", lineHeight: 0, opacity: b.locked ? 0.7 : 1 }}>
                      <BadgeFace b={b} size={42} />
                    </span>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span className="px" style={{ display: "block", fontSize: 11, color: "var(--text)", lineHeight: 1.5 }}>
                        {b.title}
                        {b.auto ? <span title="The system awards this one itself" aria-label="Awarded by the system" style={{ color: "#e8c14b", marginLeft: 6 }}>★</span> : null}
                      </span>
                      <span style={{ display: "block", fontSize: 12, lineHeight: 1.4, color: "var(--muted)" }}>{b.line}</span>
                    </span>
                    {isWitch && b.edit ? (
                      <button
                        type="button"
                        aria-label={`Edit ${b.title}`}
                        title="Edit this badge"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDraft({ ...b.edit! });
                        }}
                        className="btn btn-sm"
                        style={{ flex: "none", minHeight: 32, minWidth: 32, padding: 0 }}
                      >
                        ✎
                      </button>
                    ) : null}
                    {n >= 0 ? (
                      <span aria-hidden className="px" style={{ flex: "none", minWidth: 20, height: 20, display: "grid", placeItems: "center", fontSize: 11, background: "var(--pur)", color: "#fff", borderRadius: 10 }}>{n + 1}</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <button type="submit" className="btn btn-lg btn-purple btn-block">
              SAVE
            </button>
          </form>

          {draft ? <BadgeEditor draft={draft} setDraft={setDraft} /> : null}
        </div>
      ) : null}
    </div>
  );
}
