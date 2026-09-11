"use client";

import Link from "next/link";
import { useState } from "react";
import { setMood } from "@/lib/actions";

/** The banner, the portrait and the thought hanging in the air above it.
 *  Tapping the portrait offers the two things you can change about a face:
 *  what it looks like, and what it's thinking. */
export function ProfileHead({
  src,
  handle,
  joined,
  mood,
}: {
  src: string;
  handle: string;
  joined: string;
  mood: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  return (
    <>
      <div style={{ position: "relative" }}>
        <div
          style={{
            height: 112,
            backgroundColor: "var(--inset)",
            backgroundImage: "repeating-linear-gradient(135deg,#2a2146 0 8px,#1b1d29 8px 16px)",
          }}
        />

        {/* The thought floats in the banner, tail stepping down to the face. */}
        {!editing ? (
          <button
            type="button"
            className="thought"
            onClick={() => {
              setOpen(true);
              setEditing(true);
            }}
            style={{ position: "absolute", left: 92, right: 16, bottom: 30 }}
          >
            {mood || "…"}
          </button>
        ) : null}
      </div>

      <div
        style={{
          padding: "0 16px",
          marginTop: -26,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          // The banner is a positioned box, so it would paint over a portrait
          // that only overlaps it by flow order. This puts the face in front.
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 11 }}>
          <button
            type="button"
            onClick={() => {
              setOpen((o) => !o);
              setEditing(false);
            }}
            aria-expanded={open}
            aria-label="Change your face or your status"
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
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" width={64} height={64} style={{ imageRendering: "pixelated" }} />
          </button>

          <div style={{ paddingBottom: 4, minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 19, fontWeight: 500, letterSpacing: "-.02em" }}>{handle}</div>
            <div className="px" style={{ fontSize: 8.5, color: "var(--muted)" }}>
              {joined}
            </div>
          </div>
        </div>

        {open && !editing ? (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            <Link href="/me/avatar" className="btn btn-sm btn-purple">
              ◉ CHANGE YOUR FACE
            </Link>
            <button type="button" className="btn btn-sm" onClick={() => setEditing(true)}>
              ◔ CHANGE YOUR STATUS
            </button>
          </div>
        ) : null}

        {editing ? (
          <form action={setMood} style={{ display: "flex", gap: 7, alignItems: "center" }}>
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
        ) : null}
      </div>
    </>
  );
}
