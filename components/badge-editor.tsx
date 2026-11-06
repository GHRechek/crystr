"use client";

import { deleteBadge, saveBadge } from "@/lib/actions";

export type BadgeDraft = { slug?: string; title: string; how: string; blurb: string; art: number };

/** The form a witch edits a badge in: its title, how to earn it, the line once earned, and its
 *  picture. It covers whatever it sits in. A new badge has no slug. Delete asks first. */
export function BadgeEditor({ draft, setDraft }: { draft: BadgeDraft; setDraft: (d: BadgeDraft | null) => void }) {
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
        <label className="field">
          <span className="px" style={{ fontSize: 11, color: "var(--blu-soft)" }}>PICTURE NUMBER (1 TO 299)</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input name="art" className="input" type="number" min={1} max={299} value={draft.art} required onChange={(e) => setDraft({ ...draft, art: Math.min(299, Math.max(1, Number(e.target.value) || 1)) })} style={{ width: 110 }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/badges/set/${draft.art}.png`} alt="" width={46} height={46} style={{ imageRendering: "pixelated", display: "block" }} />
          </div>
        </label>
        <button type="submit" className="btn btn-lg btn-purple btn-block">SAVE BADGE</button>
      </form>
      {draft.slug ? (
        <form action={deleteBadge} onSubmit={(e) => { if (!confirm("Delete this badge? Anyone who earned it loses it too.")) e.preventDefault(); }}>
          <input type="hidden" name="slug" value={draft.slug} />
          <button type="submit" className="btn btn-block" style={{ color: "var(--mag-soft)" }}>DELETE THIS BADGE</button>
        </form>
      ) : null}
    </div>
  );
}
