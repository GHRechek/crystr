"use client";

import { useRef, useState } from "react";
import { TokenDesigner } from "@/app/(app)/me/token/designer";
import { defaultToken } from "@/lib/token";
import { TARGETS } from "@/lib/species";
import { PICTURE_CATEGORIES, pictureCategory, SET_COUNT, SET_NUMBERS } from "@/lib/badges";
import { deleteBadge, saveBadge } from "@/lib/actions";

export type BadgeDraft = { slug?: string; title: string; how: string; blurb: string; art: number; /** A picture made in the token maker, as its packed design. */ custom?: string; /** A long-term goal: only its name and picture may change. */ fixed?: boolean; /** How a badge a witch makes is approved: true when someone you ask says yes, false when a witch likes a post. Undefined for the system's own. */ peer?: boolean; /** For a quest someone confirms: who it has to be. */ target?: string };

/** The form a witch edits a badge in: its title, how to earn it, the line once earned, and its
 *  picture. It covers whatever it sits in. A new badge has no slug. Delete asks first. */
export function BadgeEditor({ draft, setDraft, used = [] }: { draft: BadgeDraft; setDraft: (d: BadgeDraft | null) => void; /** Picture numbers other badges already wear. */ used?: number[] }) {
  const [picking, setPicking] = useState(false);
  const [making, setMaking] = useState(false);
  const [cat, setCat] = useState(() => (draft.custom ? 0 : pictureCategory(draft.art)));
  const own = useRef(draft.custom ? 0 : draft.art).current;
  const taken = new Set(used);
  return (
    <div role="dialog" aria-label={draft.slug ? "Edit badge" : "New badge"} style={{ position: "absolute", inset: 0, zIndex: 2, background: "var(--device)", padding: "16px 16px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div className="px" style={{ fontSize: 12, color: "var(--pur-soft)" }}>{draft.slug ? "EDIT BADGE" : "NEW BADGE"}</div>
        <span className="spacer" />
        <button type="button" className="btn btn-sm" onClick={() => setDraft(null)} style={{ minHeight: 40, padding: "0 9px" }}>✕</button>
      </div>
      {draft.fixed ? (
        <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)" }}>
          This is a main quest, so how it is earned is fixed. You can change its name and picture.
        </div>
      ) : null}
      <form
        action={async (fd) => {
          await saveBadge(fd);
          setDraft(null);
        }}
        style={{ display: "flex", flexDirection: "column", gap: 10 }}
      >
        {draft.slug ? <input type="hidden" name="slug" value={draft.slug} /> : null}
        <label className="field">
          <span className="px" style={{ fontSize: 11, color: "var(--blu-soft)" }}>TITLE</span>
          <input name="title" className="input" value={draft.title} maxLength={40} required onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        </label>
        <label className="field">
          <span className="px" style={{ fontSize: 11, color: "var(--blu-soft)" }}>HOW TO EARN IT</span>
          <textarea name="how" className="textarea" rows={3} value={draft.how} maxLength={200} required readOnly={draft.fixed} style={draft.fixed ? { opacity: 0.55 } : undefined} onChange={(e) => setDraft({ ...draft, how: e.target.value })} />
        </label>
        <label className="field">
          <span className="px" style={{ fontSize: 11, color: "var(--blu-soft)" }}>ONCE EARNED (PAST TENSE)</span>
          <input name="blurb" className="input" value={draft.blurb} maxLength={120} required readOnly={draft.fixed} style={draft.fixed ? { opacity: 0.55 } : undefined} onChange={(e) => setDraft({ ...draft, blurb: e.target.value })} />
        </label>
        {!draft.fixed && (draft.slug === undefined || draft.peer !== undefined) ? (
          <div className="field">
            <span className="px" style={{ fontSize: 11, color: "var(--blu-soft)" }}>HOW IS IT APPROVED?</span>
            <input type="hidden" name="peer" value={draft.peer ? "1" : "0"} />
            <div className="seg">
              <button type="button" data-on={!draft.peer} onClick={() => setDraft({ ...draft, peer: false })}>A WITCH LIKES A POST</button>
              <button type="button" data-on={!!draft.peer} onClick={() => setDraft({ ...draft, peer: true })}>SOMEONE SAYS YES</button>
            </div>
          </div>
        ) : null}
        {!draft.fixed && draft.peer ? (
          <div className="field">
            <span className="px" style={{ fontSize: 11, color: "var(--blu-soft)" }}>WHO IT HAS TO BE</span>
            <select name="target" className="input" value={draft.target ?? ""} onChange={(e) => setDraft({ ...draft, target: e.target.value || undefined })}>
              <option value="">Anyone</option>
              {TARGETS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="field">
          <span className="px" style={{ fontSize: 11, color: "var(--blu-soft)" }}>PICTURE</span>
          <input type="hidden" name="art" value={draft.art} />
          {draft.custom ? <input type="hidden" name="art_custom" value={draft.custom} /> : null}
          <button type="button" className="btn" onClick={() => setPicking(true)} style={{ minHeight: 64, justifyContent: "flex-start", gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={draft.custom ? `/token/${draft.custom}.png` : `/badges/set/${draft.art}.png`} alt="" width={46} height={46} style={{ imageRendering: "pixelated", display: "block" }} />
            <span className="px" style={{ fontSize: 11 }}>PICK A PICTURE</span>
          </button>
        </div>
        <button type="submit" className="btn btn-lg btn-purple btn-block">SAVE BADGE</button>
      </form>
      {draft.slug ? (
        <form
          action={async (fd) => {
            await deleteBadge(fd);
            setDraft(null);
          }}
          onSubmit={(e) => { if (!confirm("Delete this badge? Anyone who earned it loses it too.")) e.preventDefault(); }}>
          <input type="hidden" name="slug" value={draft.slug} />
          <button type="submit" className="btn btn-block" style={{ color: "var(--mag-soft)" }}>DELETE THIS BADGE</button>
        </form>
      ) : null}
      {picking ? (
        <div role="dialog" aria-label="Pick a picture" style={{ position: "absolute", inset: 0, zIndex: 3, background: "var(--device)", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "14px 16px 8px" }}>
            <div className="px" style={{ fontSize: 12, color: "var(--pur-soft)" }}>PICK A PICTURE</div>
            <span className="spacer" />
            <button type="button" className="btn btn-sm btn-purple" onClick={() => setMaking(true)} style={{ minHeight: 40 }}>+ MAKE A NEW ONE</button>
            <button type="button" className="btn btn-sm" onClick={() => setPicking(false)} aria-label="Close" style={{ minHeight: 40, padding: "0 9px", marginLeft: 6 }}>✕</button>
          </div>
          <div style={{ display: "flex", gap: 6, padding: "0 16px 8px", overflowX: "auto" }}>
            {PICTURE_CATEGORIES.map((c, i) => (
              <button key={c.label} type="button" aria-pressed={cat === i} onClick={() => setCat(i)} className={`btn btn-sm${cat === i ? " btn-purple" : ""}`} style={{ flex: "none", minHeight: 36, fontSize: 10 }}>
                {c.label}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "4px 16px 20px", display: "flex", flexWrap: "wrap", gap: 8, alignContent: "flex-start" }}>
            {SET_NUMBERS.filter((n) => pictureCategory(n) === cat).map((n) => (
              <button
                key={n}
                type="button"
                aria-label={taken.has(n) && n !== own ? `Picture ${n}, already used` : `Picture ${n}`}
                aria-pressed={!draft.custom && n === draft.art}
                disabled={taken.has(n) && n !== own}
                onClick={() => {
                  setDraft({ ...draft, art: n, custom: undefined });
                  setPicking(false);
                }}
                style={{ flex: "none", width: 52, height: 52, padding: 0, display: "grid", placeItems: "center", background: !draft.custom && n === draft.art ? "rgba(145,132,217,.25)" : "none", border: `1px solid ${!draft.custom && n === draft.art ? "var(--pur)" : "transparent"}`, borderRadius: "var(--px-r)", cursor: taken.has(n) && n !== own ? "not-allowed" : "pointer", opacity: taken.has(n) && n !== own ? 0.25 : 1, filter: taken.has(n) && n !== own ? "grayscale(1)" : "none" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/badges/set/${n}.png`} alt="" loading="lazy" style={{ height: 46, width: "auto", maxWidth: 50, objectFit: "contain", imageRendering: "pixelated", display: "block" }} />
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {making ? (
        <div role="dialog" aria-label="Make a picture" style={{ position: "absolute", inset: 0, zIndex: 4, background: "var(--device)", overflowY: "auto", padding: "14px 16px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
            <div className="px" style={{ fontSize: 12, color: "var(--pur-soft)" }}>MAKE A PICTURE</div>
            <span className="spacer" />
            <button type="button" className="btn btn-sm" onClick={() => setMaking(false)} aria-label="Close" style={{ minHeight: 40, padding: "0 9px" }}>✕</button>
          </div>
          <TokenDesigner
            start={defaultToken()}
            fresh
            onUse={(packed) => {
              setDraft({ ...draft, custom: packed });
              setMaking(false);
              setPicking(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
