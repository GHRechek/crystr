"use client";

import { useState } from "react";
import { QrScanner } from "@/components/qr-scanner";

/** A little ! on the right of a quest that needs scanning, for a quest that needs scanning: opens the camera, and shows only this quest for whoever they scan. */
export function ScanQuestButton({ slug }: { slug: string }) {
  const [on, setOn] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-sm btn-purple" onClick={() => setOn(true)} aria-label="Complete this quest: scan a code" title="Complete: scan a code" style={{ flex: "none", width: 32, height: 32, minHeight: 32, padding: 0, display: "grid", placeItems: "center", fontSize: 15, lineHeight: 1 }}>
        <span className="px" aria-hidden>!</span>
      </button>
      {on ? <QrScanner mode="quest" only={slug} onClose={() => setOn(false)} /> : null}
    </>
  );
}
