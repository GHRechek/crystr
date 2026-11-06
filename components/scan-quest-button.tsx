"use client";

import { useState } from "react";
import { QrScanner } from "@/components/qr-scanner";

/** The way to ask someone about a quest: open the camera, scan their code, and see the quests you can do with them. */
export function ScanQuestButton() {
  const [on, setOn] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-sm btn-purple" onClick={() => setOn(true)} style={{ minHeight: 40, alignSelf: "flex-start" }}>
        SCAN A CODE →
      </button>
      {on ? <QrScanner mode="quest" onClose={() => setOn(false)} /> : null}
    </>
  );
}
