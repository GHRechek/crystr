"use client";

import Link from "next/link";
import { useState } from "react";
import { tableMotion } from "@/lib/actions";

const WINDOWS = [
  { hours: 4, label: "4 HOURS" },
  { hours: 24, label: "A DAY" },
  { hours: 72, label: "THREE DAYS" },
];

/** Two steps, one form, one transaction: the motion and the briefing that
 *  explains it land together or not at all. */
export function MotionComposer() {
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState("");
  const [hours, setHours] = useState(24);
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [banner, setBanner] = useState(false);

  const canAdvance = title.trim().length > 0;
  const canPublish = canAdvance && headline.trim().length > 0 && body.trim().length >= 40;

  return (
    <form action={tableMotion} className="pad" style={{ gap: 11 }}>
      <input type="hidden" name="m_hours" value={hours} />
      <input type="hidden" name="b_banner" value={banner ? "true" : "false"} />
      <input type="hidden" name="b_kicker" value="MOTION BRIEFING" />

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {step === 1 ? (
          <Link href="/vote" className="btn btn-sm">
            ✕ DISCARD
          </Link>
        ) : (
          <button type="button" className="btn btn-sm" onClick={() => setStep(1)}>
            ← THE MOTION
          </button>
        )}
        <div className="spacer" />
        <div className="px" style={{ fontSize: 9, color: "var(--pur-pale)" }}>
          {step === 1 ? "STEP 1 OF 2 · THE MOTION" : "STEP 2 OF 2 · THE BRIEFING"}
        </div>
      </div>

      <div style={{ display: "flex", gap: 4 }}>
        <div style={{ flex: 1, height: 4, background: "var(--pur)", borderRadius: 2 }} />
        <div
          style={{
            flex: 1,
            height: 4,
            background: step === 2 ? "var(--pur)" : "var(--edge)",
            borderRadius: 2,
          }}
        />
      </div>

      {/* Step one stays mounted so a single submit carries both halves. */}
      <div style={{ display: step === 1 ? "contents" : "none" }}>
        <div className="banner-note banner-purple">
          Every motion goes to the board with a briefing attached. You write that next,
          in the same sitting. Nothing reaches the City unexplained.
        </div>

        <div className="field">
          <label htmlFor="m_kicker">WARD / BODY</label>
          <input
            id="m_kicker"
            name="m_kicker"
            className="input input-px"
            placeholder="COUNCIL · MANA LEVY"
          />
        </div>

        <div className="field">
          <label htmlFor="m_title">THE MOTION</label>
          <textarea
            id="m_title"
            name="m_title"
            className="textarea"
            rows={2}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.3 }}
            placeholder="Something the City can answer for or against"
          />
        </div>

        <div className="field">
          <label htmlFor="m_blurb">WHAT IT MEANS</label>
          <textarea
            id="m_blurb"
            name="m_blurb"
            className="textarea textarea-sub"
            rows={3}
            placeholder="Two sentences. Both sides, if you can manage it."
          />
        </div>

        <div className="field">
          <span className="flabel">OPEN FOR</span>
          <div className="seg">
            {WINDOWS.map((w) => (
              <button
                key={w.hours}
                type="button"
                data-on={hours === w.hours}
                onClick={() => setHours(w.hours)}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className={`btn btn-lg btn-block${canAdvance ? " btn-purple" : ""}`}
          aria-disabled={!canAdvance}
          onClick={() => canAdvance && setStep(2)}
        >
          {canAdvance ? "NEXT · WRITE THE BRIEFING" : "STATE THE MOTION FIRST"}
        </button>
      </div>

      <div style={{ display: step === 2 ? "contents" : "none" }}>
        <div className="banner-note banner-purple">
          Briefing for: {title.trim() || "your motion"}. It publishes to the Ball the
          moment the motion goes on the board.
        </div>

        <div className="field">
          <label htmlFor="b_headline">HEADLINE</label>
          <textarea
            id="b_headline"
            name="b_headline"
            className="textarea textarea-title"
            rows={2}
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Say the thing plainly"
          />
        </div>

        <div className="field">
          <label htmlFor="b_standfirst">STANDFIRST</label>
          <textarea
            id="b_standfirst"
            name="b_standfirst"
            className="textarea textarea-sub"
            rows={2}
            placeholder="One sentence for people who will not read the rest"
          />
        </div>

        <div className="field">
          <label htmlFor="b_body">BODY — BLANK LINE BETWEEN PARAGRAPHS</label>
          <textarea
            id="b_body"
            name="b_body"
            className="textarea"
            rows={9}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            style={{ fontSize: 13.5, lineHeight: 1.6 }}
            placeholder="What the motion would actually do, and to whom."
          />
          <span className="flabel" style={{ color: body.trim().length < 40 ? "var(--mag-soft)" : "var(--muted)" }}>
            {body.trim().length < 40
              ? `${40 - body.trim().length} MORE CHARACTERS BEFORE THIS COUNTS AS AN EXPLANATION`
              : "LONG ENOUGH TO COUNT"}
          </span>
        </div>

        <button
          type="button"
          className={`btn${banner ? " btn-purple" : ""}`}
          onClick={() => setBanner((b) => !b)}
        >
          ▣ {banner ? "BANNER ATTACHED" : "ATTACH BANNER IMAGE"}
        </button>

        <button
          type="submit"
          className={`btn btn-lg btn-block${canPublish ? " btn-blue" : ""}`}
          aria-disabled={!canPublish}
        >
          PUBLISH MOTION + BRIEFING
        </button>
      </div>
    </form>
  );
}
