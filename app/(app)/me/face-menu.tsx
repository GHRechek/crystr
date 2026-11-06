"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { setMood } from "@/lib/actions";
import { BadgeChooser } from "@/components/badge-chooser";
import { ShownBadges } from "@/components/shown-badges";
import type { ShownBadge } from "@/lib/badges";

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
  joined,
  mood,
  banner,
  badgeOptions,
  shown,
}: {
  src: string;
  handle: string;
  joined: string;
  mood: string | null;
  /** The banner's CSS, from bannerStyle(). */
  banner: CSSProperties;
  /** The badges that could be shown (earned or held), and the ones that are. */
  badgeOptions: ShownBadge[];
  shown: ShownBadge[];
}) {
  const [open, setOpen] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [editing, setEditing] = useState(false);

  return (
    <>
      <div style={{ position: "relative" }}>
        {/* Taller when badges are on show, so they sit on the banner with the thought below them. */}
        <div style={{ height: shown.length ? BANNER_WITH_BADGES : 112, ...banner }} />

        {/* The shown badges, centred on the banner both ways. The thought sits low and may come close. */}
        {shown.length ? (
          <div style={{ position: "absolute", inset: 0, padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: "100%" }}>
              <ShownBadges shown={shown} />
            </div>
          </div>
        ) : null}

        {/* The thought floats in the banner, tail stepping down to the face. */}
        {!editing ? (
          <button
            type="button"
            className="thought"
            onClick={() => {
              setOpen(true);
              setEditing(true);
            }}
            style={{ position: "absolute", left: FACE + 28, right: 16, bottom: 3 }}
          >
            <span>{mood || "…"}</span>
          </button>
        ) : null}
      </div>

      <div
        style={{
          padding: "0 16px",
          marginTop: -FACE * 0.42,
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
            aria-label="Change your face or your status"
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

          <div style={{ paddingBottom: 4, minWidth: 0, flex: 1 }}>
            <h1 style={{ fontSize: 19, fontWeight: 500, letterSpacing: "-.02em" }}>{handle}</h1>
            <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
              {joined}
            </div>
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
                <span aria-hidden="true">◔</span> CHANGE YOUR STATUS
              </button>
              <button
                type="button"
                className="face-menu-item"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  setChoosing(true);
                }}
              >
                <span aria-hidden="true">◈</span> DISPLAY BADGES
              </button>
              <Link href="/me/edit" className="face-menu-item" role="menuitem">
                <span aria-hidden="true">▤</span> EDIT PROFILE
              </Link>
            </div>
          ) : null}
        </div>

        {choosing ? <BadgeChooser options={badgeOptions} current={shown.map((b) => b.key)} onClose={() => setChoosing(false)} /> : null}

        {editing ? (
          <form action={setMood} style={{ display: "flex", gap: 7, alignItems: "center" }}>
            <input
              name="mood" aria-label="What you are thinking"
              className="input"
              defaultValue={mood ?? ""}
              maxLength={40}
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
