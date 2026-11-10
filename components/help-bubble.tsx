"use client";

import { useState } from "react";
import { HelpMark } from "@/components/help-mark";
import { QrScanner } from "@/components/qr-scanner";

/** Someone else's call for help, in their banner. Tap it to open the scanner: point it at their code to say
 *  you helped them, and the help counts for you. */
export function HelpBubble({ text, handle }: { text: string; handle: string }) {
  const [scanning, setScanning] = useState(false);
  return (
    <>
      <button type="button" className="thought" onClick={() => setScanning(true)} aria-label={`${handle} asks: ${text}. Tap to scan their code once you have helped.`} style={{ position: "absolute", left: 104 + 28, right: 16, bottom: 30 }}>
        <HelpMark />
        <span>{text}</span>
      </button>
      {scanning ? <QrScanner mode="quest" only="a-helping-hand" title="I'm a Helper" how={`Helped ${handle}? Scan their code to say so. Every help brings a Historikal.`} onClose={() => setScanning(false)} /> : null}
    </>
  );
}
