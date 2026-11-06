"use client";

import { useState } from "react";
import { QrScanner } from "@/components/qr-scanner";

/** A quest that needs scanning: its badge trembles every few seconds, and tapping the badge or the
 *  name opens the camera for that quest. */
export function ScanRow({ slug, title, how, face, rest }: { slug: string; title: string; how: string; face: React.ReactNode; rest: React.ReactNode }) {
  const [on, setOn] = useState(false);
  // So a list of them does not all shake at the same moment.
  const delay = (Array.from(slug).reduce((n, c) => n + c.charCodeAt(0), 0) % 7) * 0.9;
  const open = () => setOn(true);
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
        <button type="button" onClick={open} aria-label={`${title}: scan a code to complete`} className="tremble" style={{ flex: "none", padding: 0, border: 0, background: "none", cursor: "pointer", lineHeight: 0, animationDelay: `${delay}s` }}>
          {face}
        </button>
        <button type="button" onClick={open} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, padding: 0, background: "none", border: 0, cursor: "pointer", color: "inherit", font: "inherit" }}>
          {rest}
        </button>
      </div>
      {on ? <QrScanner mode="quest" only={slug} title={title} how={how} onClose={() => setOn(false)} /> : null}
    </>
  );
}
