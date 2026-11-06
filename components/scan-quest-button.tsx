"use client";

import { useState } from "react";
import { QrScanner } from "@/components/qr-scanner";

/** COMPLETE, for a quest that needs scanning: opens the camera, and shows only this quest for whoever they scan. */
export function ScanQuestButton({ slug }: { slug: string }) {
  const [on, setOn] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-sm btn-purple" onClick={() => setOn(true)} style={{ flex: "none", minHeight: 36, padding: "0 10px", fontSize: 10 }}>
        COMPLETE
      </button>
      {on ? <QrScanner mode="quest" only={slug} onClose={() => setOn(false)} /> : null}
    </>
  );
}
