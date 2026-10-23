"use client";

import { useEffect, useRef, useState } from "react";
import { createReply } from "@/lib/actions";
import { COSTS } from "@/lib/crystr";
import { Cost } from "@/components/mana";

/** The reply box. Costs what a post costs, and says so before you commit. */
export function ReplyForm({
  parent,
  mana,
  focus,
}: {
  parent: number;
  mana: number;
  focus: boolean;
}) {
  const [text, setText] = useState("");
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (focus) box.current?.focus();
  }, [focus]);

  const cost = COSTS.post;
  const affordable = mana >= cost;
  const ready = affordable && text.trim().length > 0;

  return (
    <form action={createReply} id="reply" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input type="hidden" name="parent_id" value={parent} />
      <textarea
        ref={box}
        name="body" aria-label="Your reply"
        className="textarea"
        rows={3}
        maxLength={500}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Say it back."
        style={{ fontSize: 14, lineHeight: 1.5 }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div className="spacer" />
        <button
          type="submit"
          className={`btn${ready ? " btn-mag" : ""}`}
          aria-disabled={!ready}
          disabled={!ready}
        >
          {affordable ? (
            <>
              REPLY <Cost n={cost} />
            </>
          ) : (
            "REST FIRST"
          )}
        </button>
      </div>
    </form>
  );
}
