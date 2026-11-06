"use client";

import { useState } from "react";
import { QrScanner } from "@/components/qr-scanner";

/** A quest's badge, for a quest that needs scanning: it trembles gently every so often, and tapping it opens the camera. */
export function ScanQuestButton({ slug, children }: { slug: string; children: React.ReactNode }) {
  const [on, setOn] = useState(false);
  // So a list of them does not all shake at the same moment.
  const delay = (Array.from(slug).reduce((n, c) => n + c.charCodeAt(0), 0) % 7) * 0.9;
  return (
    <>
      <button
        type="button"
        onClick={() => setOn(true)}
        aria-label="Complete this quest: scan a code"
        title="Scan a code to complete this"
        className="tremble"
        style={{ flex: "none", padding: 0, border: 0, background: "none", cursor: "pointer", lineHeight: 0, animationDelay: `${delay}s` }}
      >
        {children}
      </button>
      {on ? <QrScanner mode="quest" only={slug} onClose={() => setOn(false)} /> : null}
    </>
  );
}
