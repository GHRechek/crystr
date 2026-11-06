"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { setMood } from "@/lib/actions";

/** The portrait's size, and how tall the banner is when it carries the shown badges: a row of
 *  badges (63 pixels), a gap, and the thought below them, clear of the portrait. */
const FACE = 104;
const BANNER_WITH_BADGES = 136;

/** The banner, the portrait and the thought hanging in the air above it.
 *  Tapping the portrait offers what you can change about a face: what it looks like, what it's
 *  thinking, which of your badges are on show, and the rest of the profile. */
export function ProfileHead({
  src,
  handle,
  mood,
  banner,
}: {
  src: string;
  handle: string;
  mood: string | null;
  /** The banner's CSS, from bannerStyle(). */
  banner: CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  return (
    <>
      <div style={{ position: "relative" }}>
                <div style={{ height: 112, ...banner }} />

        {/* The thought floats in the banner, tail stepping down to the face. */}
        {!editing ? (
          <button
            type="button"
            className="thought"
            onClick={() => {
              setOpen(true);
              setEditing(true);
            }}
            style={{ position: "absolute", left: FACE + 28, right: 16, bottom: 30 }}
          >
            <span>{mood || "…"}</span>
          </button>
        ) : null}
      </div>

      <div
        style={{
          padding: "0 16px",
          marginTop: -FACE * 0.5,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          // The banner is a positioned box, so it would paint over a portrait
          // that only overlaps it by flow order. This puts the face in front.
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 11, position: "relative" }}>
          <button
            type="button"
            onClick={() => {
              setOpen((o) => !o);
              setEditing(false);
            }}
            aria-expanded={open}
            aria-label="Change your face or ask for help"
            style={{
              width: FACE,
              height: FACE,
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
            <img src={src} alt="" width={FACE} height={FACE} style={{ imageRendering: "pixelated" }} />
          </button>

          <div style={{ paddingBottom: 14, minWidth: 0, flex: 1 }}>
            <h1 className="px" style={{ fontSize: 16, fontWeight: 400, lineHeight: 1.5, overflowWrap: "anywhere" }}>{handle}</h1>
          </div>

          {/* Hangs off the portrait rather than sitting in the flow, so
              opening it doesn't shove the whole profile down the screen. */}
          {open && !editing ? (
            <div className="face-menu" role="menu">
              <Link href="/me/avatar" className="face-menu-item" role="menuitem">
                <span aria-hidden="true">◉</span> CHANGE YOUR FACE
              </Link>
              <button
                type="button"
                className="face-menu-item"
                role="menuitem"
                onClick={() => setEditing(true)}
              >
                <span aria-hidden="true">◔</span> ASK FOR HELP
              </button>
              <Link href="/me?quests=1" className="face-menu-item" role="menuitem">
                <span aria-hidden="true">★</span> PICK QUESTS
              </Link>
              <Link href="/me/edit" className="face-menu-item" role="menuitem">
                <span aria-hidden="true">▤</span> EDIT PROFILE
              </Link>
            </div>
          ) : null}
        </div>


        {editing ? (
          <form action={setMood} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <textarea
              name="mood"
              aria-label="What you need help with"
              className="textarea"
              defaultValue={mood ?? ""}
              maxLength={120}
              rows={3}
              autoFocus
              placeholder="What do you need help with? Someone to water the plants, a second opinion, a ride to the airport."
              style={{ fontSize: 12.5, minHeight: 76 }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ flex: 1, fontSize: 11.5, lineHeight: 1.4, color: "var(--muted)" }}>
                Costs 5 mana, and goes on the wall for everyone to see.
              </span>
              <button type="submit" className="btn btn-sm btn-purple" style={{ flex: "none" }}>
                GET HELP
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </>
  );
}
