"use client";

import Link from "next/link";
import { useState } from "react";
import { createMotion } from "@/lib/actions";
import { IconPicker } from "@/components/icon-picker";

const WINDOWS = [
  { hours: 4, label: "4 HOURS" },
  { hours: 24, label: "A DAY" },
  { hours: 72, label: "THREE DAYS" },
];

/** One page: the briefing is the motion. Its headline is what the City says YAY or NAY to, its
 *  highlight is the line under it on the board, and the body explains it. */
export function MotionComposer() {
  const [hours, setHours] = useState(24);
  const [headline, setHeadline] = useState("");
  const [highlight, setHighlight] = useState("");
  const [body, setBody] = useState("");

  const canPublish = headline.trim().length > 0 && body.trim().length >= 40;

  return (
    <form action={createMotion} className="pad" style={{ gap: 11 }}>
      <input type="hidden" name="m_hours" value={hours} />
      <input type="hidden" name="m_kicker" value="MOTION" />
      <input type="hidden" name="m_title" value={headline} />
      <input type="hidden" name="m_blurb" value={highlight} />
      <input type="hidden" name="b_kicker" value="MOTION BRIEFING" />

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/ball?tab=motions" className="btn btn-sm">
          ✕ DISCARD
        </Link>
        <div className="spacer" />
        <div className="px" style={{ fontSize: 11, color: "var(--pur-pale)" }}>NEW MOTION</div>
      </div>

      <div className="field">
        <label htmlFor="b_headline">THE MOTION</label>
        <textarea
          id="b_headline"
          name="b_headline"
          className="textarea textarea-title"
          rows={2}
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="Something the City can say YAY or NAY to"
        />
      </div>

      <div className="field">
        <label htmlFor="b_standfirst">HIGHLIGHT</label>
        <textarea
          id="b_standfirst"
          name="b_standfirst"
          className="textarea textarea-sub"
          rows={2}
          value={highlight}
          onChange={(e) => setHighlight(e.target.value)}
          placeholder="One sentence for people who will not read the rest"
        />
      </div>

      <div className="field">
        <label htmlFor="b_body">WHAT IT WOULD DO — BLANK LINE BETWEEN PARAGRAPHS</label>
        <textarea
          id="b_body"
          name="b_body"
          className="textarea"
          rows={9}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          style={{ fontSize: 13.5, lineHeight: 1.6 }}
          placeholder="What the motion would actually do, and to whom. Both sides, if you can."
        />
        <span className="flabel" style={{ color: body.trim().length < 40 ? "var(--mag-soft)" : "var(--muted)" }}>
          {body.trim().length < 40 ? `${40 - body.trim().length} MORE CHARACTERS BEFORE THIS COUNTS AS AN EXPLANATION` : "LONG ENOUGH TO COUNT"}
        </span>
      </div>

      <IconPicker name="b_banner_icon" />

      <div className="field">
        <span className="flabel">OPEN FOR</span>
        <div className="seg">
          {WINDOWS.map((w) => (
            <button key={w.hours} type="button" data-on={hours === w.hours} onClick={() => setHours(w.hours)}>
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" className={`btn btn-lg btn-block${canPublish ? " btn-blue" : ""}`} aria-disabled={!canPublish}>
        PUT IT TO A VOTE · YAY OR NAY
      </button>
    </form>
  );
}
