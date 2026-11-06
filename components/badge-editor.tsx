"use client";

import { useState } from "react";
import { deleteBadge, saveBadge } from "@/lib/actions";

export type BadgeDraft = { slug?: string; title: string; how: string; blurb: string; art: number };

/** The form a witch edits a badge in: its title, how to earn it, the line once earned, and its
 *  picture. It covers whatever it sits in. A new badge has no slug. Delete asks first. */
export function BadgeEditor({ draft, setDraft }: { draft: BadgeDraft; setDraft: (d: BadgeDraft | null) => void }) {
  const [picking, setPicking] = useState(false);
  return (
    <div role="dialog" aria-label={draft.slug ? "Edit badge" : "New badge"} style={{ position: "absolute", inset: 0, zIndex: 2, background: "var(--device)", padding: "16px 16px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div className="px" style={{ fontSize: 12, color: "var(--pur-soft)" }}>{draft.slug ? "EDIT BADGE" : "NEW BADGE"}</div>
        <span className="spacer" />
        <button type="button" className="btn btn-sm" onClick={() => setDraft(null)} style={{ minHeight: 40, padding: "0 9px" }}>✕</button>
      </div>
      <form action={saveBadge} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {draft.slug ? <input type="hidden" name="slug" value={draft.slug} /> : null}
        <label className="field">
          <span className="px" style={{ fontSize: 11, color: "var(--blu-soft)" }}>TITLE</span>
          <input name="title" className="input" value={draft.title} maxLength={40} required onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        </label>
        <label className="field">
          <span className="px" style={{ fontSize: 11, color: "var(--blu-soft)" }}>HOW TO EARN IT</span>
          <textarea name="how" className="textarea" rows={3} value={draft.how} maxLength={200} required onChange={(e) => setDraft({ ...draft, how: e.target.value })} />
        </label>
        <label className="field">
          <span className="px" style={{ fontSize: 11, color: "var(--blu-soft)" }}>ONCE EARNED (PAST TENSE)</span>
          <input name="blurb" className="input" value={draft.blurb} maxLength={120} required onChange={(e) => setDraft({ ...draft, blurb: e.target.value })} />
        </label>
        <div className="field">
          <span className="px" style={{ fontSize: 11, color: "var(--blu-soft)" }}>PICTURE</span>
          <input type="hidden" name="art" value={draft.art} />
          <button type="button" className="btn" onClick={() => setPicking(true)} style={{ minHeight: 64, justifyContent: "flex-start", gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/badges/set/${draft.art}.png`} alt="" width={46} height={46} style={{ imageRendering: "pixelated", display: "block" }} />
            <span className="px" style={{ fontSize: 11 }}>PICK A PICTURE</span>
          </button>
        </div>
        <button type="submit" className="btn btn-lg btn-purple btn-block">SAVE BADGE</button>
      </form>
      {draft.slug ? (
        <form action={deleteBadge} onSubmit={(e) => { if (!confirm("Delete this badge? Anyone who earned it loses it too.")) e.preventDefault(); }}>
          <input type="hidden" name="slug" value={draft.slug} />
          <button type="submit" className="btn btn-block" style={{ color: "var(--mag-soft)" }}>DELETE THIS BADGE</button>
        </form>
      ) : null}
      {picking ? (
        <div role="dialog" aria-label="Pick a picture" style={{ position: "absolute", inset: 0, zIndex: 3, background: "var(--device)", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "14px 16px 8px" }}>
            <div className="px" style={{ fontSize: 12, color: "var(--pur-soft)" }}>PICK A PICTURE</div>
            <span className="spacer" />
            <button type="button" className="btn btn-sm" onClick={() => setPicking(false)} aria-label="Close" style={{ minHeight: 40, padding: "0 9px" }}>✕</button>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "4px 16px 20px", display: "flex", flexWrap: "wrap", gap: 8, alignContent: "flex-start" }}>
            {Array.from({ length: 299 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`Picture ${n}`}
                aria-pressed={n === draft.art}
                onClick={() => {
                  setDraft({ ...draft, art: n });
                  setPicking(false);
                }}
                style={{ flex: "none", width: 52, height: 52, padding: 0, display: "grid", placeItems: "center", background: n === draft.art ? "rgba(145,132,217,.25)" : "none", border: `1px solid ${n === draft.art ? "var(--pur)" : "transparent"}`, borderRadius: "var(--px-r)", cursor: "pointer" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/badges/set/${n}.png`} alt="" loading="lazy" style={{ height: 46, width: "auto", maxWidth: 50, objectFit: "contain", imageRendering: "pixelated", display: "block" }} />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
