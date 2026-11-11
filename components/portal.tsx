"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Renders its children straight into the body. A full-screen scene inside the page sat under the header
 *  and the status bar and was clipped by the scroll area; from the body, position: fixed means the viewport. */
export function BodyPortal({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return null;
  return createPortal(children, document.body);
}
