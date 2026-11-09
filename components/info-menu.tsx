"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { GAME_BLURB, LOCATION } from "@/lib/info";
import { MoreIcon } from "@/components/icons";

/** The three dots at the top right of the header. Opens a sheet over the app with the things
 *  that are about the game rather than about you: what it is, where it is, and the
 *  terms people agreed to. */
export function InfoMenu({ isWitch = false, isEditor = false }: { isWitch?: boolean; isEditor?: boolean }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const q = useSearchParams();
  const here = q.toString();

  // Following a link, or going back, closes it (a change of query counts: the viewing-as
  // switch only changes that).
  useEffect(() => setOpen(false), [path, here]);

  // For a witch: the Ball as a witch sees it, or as a player does (a player cannot switch the
  // other way). It keeps whichever tab of the Ball they were on.
  const onBall = path === "/ball";
  const tab = onBall && (q.get("tab") === "oped" || q.get("tab") === "motions") ? q.get("tab") : "news";
  const asPlayer = onBall && q.get("as") === "player";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const paragraphs = GAME_BLURB.trim().split(/\n\s*\n/);

  return (
    <>
      <button
        type="button"
        className="btn btn-sm dots-btn"
        aria-label="About the game"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{ minHeight: 40, minWidth: 40, padding: "0 9px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
      >
        <MoreIcon />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="About the game"
          style={{ position: "absolute", inset: 0, zIndex: 60, display: "flex", justifyContent: "flex-end" }}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            style={{ flex: 1, border: 0, background: "rgba(5,5,12,.6)", cursor: "default" }}
          />
          <div
            style={{
              width: "min(320px, 88%)",
              overflowY: "auto",
              background: "var(--device)",
              boxShadow: "-1px 0 0 var(--edge), -12px 0 36px rgba(0,0,0,.5)",
              padding: "14px 16px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <div className="px" style={{ fontSize: 12, color: "var(--pur-soft)" }}>
                THE GAME
              </div>
              <div className="spacer" />
              <button type="button" className="btn btn-sm" onClick={() => setOpen(false)} style={{ minHeight: 40, padding: "0 9px" }}>
                ✕
              </button>
            </div>

            {isWitch ? (
              <section>
                <div className="px" style={{ fontSize: 11, color: "var(--mag)", marginBottom: 8 }}>
                  VIEWING THE BALL AS
                </div>
                <div role="group" aria-label="Viewing the Ball as" style={{ display: "flex", gap: 6 }}>
                  <Link
                    href={`/ball?tab=${tab}`}
                    prefetch={false}
                    aria-pressed={!asPlayer}
                    className={`btn${asPlayer ? "" : " btn-purple"}`}
                    style={{ flex: 1, minHeight: 44 }}
                  >
                    WITCH
                  </Link>
                  <Link
                    href={`/ball?tab=${tab}&as=player`}
                    prefetch={false}
                    aria-pressed={asPlayer}
                    className={`btn${asPlayer ? " btn-mag" : ""}`}
                    style={{ flex: 1, minHeight: 44 }}
                  >
                    PLAYER
                  </Link>
                </div>
                <Link href="/me/badges" className="btn btn-block" style={{ minHeight: 44, marginTop: 8 }}>
                  EDIT BADGES
                </Link>
              </section>
            ) : null}

            {isEditor ? (
              <section>
                <div className="px" style={{ fontSize: 11, color: "var(--mag)", marginBottom: 8 }}>
                  EDITOR
                </div>
                <Link href="/creatures" className="btn btn-block" style={{ minHeight: 44 }}>
                  CREATURE EDITOR
                </Link>
              </section>
            ) : null}

            {/* The two calls everyone should know, first: how to ease things off, and how to bring magic in. */}
            <section>
              <div className="px" style={{ fontSize: 11, color: "var(--mag)", marginBottom: 8 }}>
                SAY IT OUT LOUD
              </div>
              {(
                [
                  ["TOO MUCH!", "If things get too intense, say “Too much!” and they’ll ease up. No questions asked."],
                  ["REALLY REALLY", "Someone suggesting story or using magic says “Really really.” Lean into it, or ease it with “Too much!”"],
                ] as [string, string][]
              ).map(([k, t]) => (
                <div key={k} style={{ marginBottom: 10 }}>
                  <div className="px" style={{ fontSize: 12, color: "var(--text)" }}>{k}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--text-2)", textWrap: "pretty" }}>{t}</div>
                </div>
              ))}
            </section>

            <section>
              <div className="px" style={{ fontSize: 11, color: "var(--mag)", marginBottom: 8 }}>
                ABOUT
              </div>
              {paragraphs.map((p, i) => (
                <p key={i} style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-2)", margin: "0 0 10px", textWrap: "pretty" }}>
                  {p}
                </p>
              ))}
              <Link href="/info" className="btn btn-block" style={{ minHeight: 40 }}>
                GAME INFO
              </Link>
            </section>

            <section>
              <div className="px" style={{ fontSize: 11, color: "var(--mag)", marginBottom: 8 }}>
                WHERE
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--text-2)" }}>{LOCATION}</div>
            </section>

            <section>
              <div className="px" style={{ fontSize: 11, color: "var(--mag)", marginBottom: 8 }}>
                THE RULES WE KEEP
              </div>
              <Link href="/terms" className="btn btn-block" style={{ minHeight: 40 }}>
                TERMS OF SERVICE
              </Link>
            </section>

            <section>
              <div className="px" style={{ fontSize: 11, color: "var(--mag)", marginBottom: 8 }}>
                SOMETHING BROKEN?
              </div>
              <Link href={`/bug?from=${encodeURIComponent(path)}`} className="btn btn-block" style={{ minHeight: 40 }}>
                REPORT A BUG
              </Link>
            </section>
          </div>
        </div>
      ) : null}
    </>
  );
}
