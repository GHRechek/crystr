"use client";

import Link from "next/link";
import { useState } from "react";
import { createPost, voiceLocked } from "@/lib/actions";
import { COSTS } from "@/lib/crystr";
import { Cost } from "@/components/mana";
import { Placeholder } from "@/components/bits";

export function Composer({ mana, badge }: { mana: number; badge?: { slug: string; title: string; how: string } }) {
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState(!!badge);

  const cost = COSTS.post + (photo ? COSTS.photo : 0);
  const affordable = mana >= cost;
  const canPublish = affordable && text.trim().length > 0;

  return (
    <form action={createPost} className="pad">
      <input type="hidden" name="has_image" value={photo ? "true" : "false"} />
      {badge ? <input type="hidden" name="badge" value={badge.slug} /> : null}

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/" className="btn btn-sm">
          ✕ CLOSE
        </Link>
        <div className="spacer" />
        <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
          THIS WILL COST
        </div>
        <div
          className="px"
          style={{ fontSize: 14, color: affordable ? "var(--blu-soft)" : "var(--mag)" }}
        >
          -{cost}
        </div>
      </div>

      {badge ? (
        <div className="tile" style={{ padding: 12 }}>
          <div className="px" style={{ fontSize: 11, color: "var(--pur-soft)" }}>
            BADGE REQUEST · {badge.title.toUpperCase()}
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--text-3)", marginTop: 4 }}>{badge.how}</div>
          <div style={{ fontSize: 12, lineHeight: 1.45, color: "var(--muted)", marginTop: 4 }}>
            This post is marked as a request. When a witch likes it, the badge is yours.
          </div>
        </div>
      ) : null}

      <textarea
        name="body" aria-label="Your post"
        className="textarea"
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="say something"
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className={`btn${photo ? " btn-mag" : ""}`}
          onClick={() => setPhoto((p) => !p)}
        >
          ▣ ATTACH IMAGE <Cost n={COSTS.photo} />
        </button>
        <button type="submit" formAction={voiceLocked} className="btn" style={{ color: "var(--muted)" }}>
          ♪ VOICE — LOCKED
        </button>
      </div>

      {photo ? <Placeholder label="YOUR IMAGE GOES HERE" height={120} /> : null}

      {affordable ? null : (
        <div
          className="tile"
          style={{ padding: "11px 12px", fontSize: 12, lineHeight: 1.55, color: "var(--muted)" }}
        >
          Not enough mana for this yet. The Well is accepting poems, photographs and two minutes of your silence.
        </div>
      )}

      <button
        type="submit"
        className={`btn btn-lg btn-block${canPublish ? " btn-mag" : ""}`}
        aria-disabled={!canPublish}
      >
        {canPublish
          ? (
            <>
              PUBLISH <Cost n={cost} />
            </>
          )
          : !affordable
            ? "REST FIRST"
            : "WRITE SOMETHING"}
      </button>
    </form>
  );
}
