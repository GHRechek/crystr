"use client";

import Link from "next/link";
import { useState } from "react";
import { createPost, voiceLocked } from "@/lib/actions";
import { COSTS } from "@/lib/crystr";
import { Placeholder } from "@/components/bits";

export function Composer({ mana }: { mana: number }) {
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState(false);

  const cost = COSTS.post + (photo ? COSTS.photo : 0);
  const affordable = mana >= cost;
  const canPublish = affordable && text.trim().length > 0;

  return (
    <form action={createPost} className="pad">
      <input type="hidden" name="has_image" value={photo ? "true" : "false"} />

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/" className="btn btn-sm">
          ✕ CLOSE
        </Link>
        <div className="spacer" />
        <div className="px" style={{ fontSize: 9, color: "var(--muted)" }}>
          THIS WILL COST
        </div>
        <div
          className="px"
          style={{ fontSize: 14, color: affordable ? "var(--blu-soft)" : "var(--mag)" }}
        >
          -{cost}
        </div>
      </div>

      <textarea
        name="body"
        className="textarea"
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="say something the well would consider worth five mana"
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className={`btn${photo ? " btn-mag" : ""}`}
          onClick={() => setPhoto((p) => !p)}
        >
          ▣ ATTACH IMAGE +{COSTS.photo}
        </button>
        <button type="submit" formAction={voiceLocked} className="btn" style={{ color: "var(--muted)" }}>
          ♪ VOICE — LOCKED
        </button>
      </div>

      {photo ? <Placeholder label="YOUR IMAGE GOES HERE" height={120} /> : null}

      <div
        className="tile"
        style={{ padding: "11px 12px", fontSize: 11.5, lineHeight: 1.55, color: "var(--muted)" }}
      >
        {affordable
          ? `You have ${mana}. After this, ${mana - cost}. The well does not do credit.`
          : `You need ${cost} and have ${mana}. The well is accepting poems, photographs and two minutes of your silence.`}
      </div>

      <button
        type="submit"
        className={`btn btn-lg btn-block${canPublish ? " btn-mag" : ""}`}
        aria-disabled={!canPublish}
      >
        {canPublish
          ? `PUBLISH · -${cost}`
          : !affordable
            ? "NOT ENOUGH MANA"
            : "WRITE SOMETHING"}
      </button>
    </form>
  );
}
