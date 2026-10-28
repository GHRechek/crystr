"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { breachRegistry } from "@/lib/actions";
import { corrupt } from "@/lib/crystr";

/** What the break-in says, line by line. */
function script(witch: string): string[] {
  return [
    "CONNECTING TO CITY RECORDS",
    "HANDSHAKE ACCEPTED",
    "REGISTRY LOCK FOUND: FORM 7-A",
    `KEY FROM ${witch.toUpperCase()}: VALID`,
    "SPECIES FIELD: ████████",
    "DISTRICT FIELD: ████████",
    "WRITING ONBOARDED = TRUE",
    "COVERING TRACKS",
    "ACCESS GRANTED",
  ];
}

const STEP_MS = 520;

/** The break-in. The lines come up one at a time with the screen going haywire, and when
 *  the last one lands the key in the cookie is spent for real (breachRegistry), which
 *  sends them into the City. SKIP spends it now. If the key died in between, it says so. */
export function Breach({ witch }: { witch: string }) {
  const lines = script(witch);
  const [shown, setShown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fired = useRef(false);

  const go = () => {
    if (fired.current) return;
    fired.current = true;
    setShown(lines.length);
    start(async () => {
      const r = await breachRegistry();
      if (r && !r.ok) {
        setError(r.message ?? "Something went wrong.");
        fired.current = false;
      }
    });
  };

  useEffect(() => {
    if (shown >= lines.length) {
      const t = setTimeout(go, 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShown((n) => n + 1), STEP_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);

  const done = shown >= lines.length;
  const fill = Math.round((Math.min(shown, lines.length) / lines.length) * 24);

  return (
    <div className="pad" style={{ gap: 12 }}>
      <div
        className={`tile${done || error ? "" : " haywire"}`}
        style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10, minHeight: 300 }}
        aria-live="polite"
      >
        <div className="px" style={{ fontSize: 11, color: "var(--mag-soft)", letterSpacing: ".07em" }}>
          {done ? "OVERRIDE" : corrupt("OVERRIDE", 2)}
        </div>
        <div className="px" style={{ fontSize: 11, lineHeight: 2, color: "var(--text)", whiteSpace: "pre-wrap" }}>
          {lines.slice(0, shown).map((line, i) => {
            const last = i === shown - 1 && !done;
            return (
              <div key={i} style={{ color: i === lines.length - 1 ? "var(--mag-soft)" : undefined }}>
                {"> "}
                {last ? corrupt(line, 1) : line}
              </div>
            );
          })}
          {!done ? <div style={{ color: "var(--muted)" }}>{"> _"}</div> : null}
        </div>
        <div aria-hidden style={{ display: "flex", gap: 2, marginTop: "auto" }}>
          {Array.from({ length: 24 }, (_, i) => (
            <span
              key={i}
              style={{ flex: 1, height: 7, background: i < fill ? "var(--mag)" : "var(--edge)" }}
            />
          ))}
        </div>
        {error ? (
          <div className="banner-note banner-mag" role="alert">
            {error}
          </div>
        ) : null}
      </div>

      {error ? (
        <a href="/welcome" className="btn btn-block" style={{ minHeight: 42 }}>
          THE REGISTRY
        </a>
      ) : (
        <button type="button" className="btn btn-block btn-mag" style={{ minHeight: 42 }} onClick={go} disabled={pending || done}>
          {pending || done ? "GETTING IN…" : "SKIP"}
        </button>
      )}
    </div>
  );
}
