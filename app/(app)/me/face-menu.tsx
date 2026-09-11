"use client";

import Link from "next/link";
import { useState } from "react";
import { setMood } from "@/lib/actions";

/** The portrait is the control: tap it and it offers the two things you can
 *  change about your face — what it looks like, and what it's thinking. */
export function FaceMenu({
  svg,
  handle,
  joined,
  mood,
}: {
  svg: string;
  handle: string;
  joined: string;
  mood: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 11 }}>
        <button
          type="button"
          onClick={() => {
            setOpen((o) => !o);
            setEditing(false);
          }}
          aria-expanded={open}
          aria-label="Change your face or your mood"
          style={{
            width: 64,
            height: 64,
            flex: "none",
            padding: 0,
            border: 0,
            cursor: "pointer",
            background: "transparent",
            borderRadius: "var(--px-r)",
            boxShadow: open
              ? "0 0 0 3px var(--device), 0 0 0 5px var(--pur)"
              : "0 0 0 3px var(--device)",
            overflow: "hidden",
            lineHeight: 0,
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />

        <div style={{ paddingBottom: 4, minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 19, fontWeight: 500, letterSpacing: "-.02em" }}>{handle}</div>
          <div className="px" style={{ fontSize: 8.5, color: "var(--muted)" }}>
            {joined}
          </div>
        </div>
      </div>

      {open && !editing ? (
        <div style={{ display: "flex", gap: 7, marginTop: 10, flexWrap: "wrap" }}>
          <Link href="/me/avatar" className="btn btn-sm btn-purple">
            ◉ CHANGE YOUR FACE
          </Link>
          <button type="button" className="btn btn-sm" onClick={() => setEditing(true)}>
            ◔ CHANGE YOUR MOOD
          </button>
        </div>
      ) : null}

      {editing ? (
        <form
          action={setMood}
          style={{ display: "flex", gap: 7, marginTop: 10, alignItems: "center" }}
        >
          <input
            name="mood"
            className="input"
            defaultValue={mood ?? ""}
            maxLength={80}
            autoFocus
            placeholder="owed a favour, unsure by whom"
            style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}
          />
          <button type="submit" className="btn btn-sm btn-purple">
            THINK IT
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="thought"
          onClick={() => {
            setOpen(true);
            setEditing(true);
          }}
        >
          {mood || "…"}
        </button>
      )}
    </div>
  );
}
