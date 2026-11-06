"use client";

import { useEffect } from "react";

/** iOS Safari ignores user-scalable=no, so the pinch and double-tap gestures are stopped here too. */
export function ZoomLock() {
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    let last = 0;
    const touchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - last < 300) e.preventDefault();
      last = now;
    };
    const touchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener("gesturestart", stop);
    document.addEventListener("gesturechange", stop);
    document.addEventListener("gestureend", stop);
    document.addEventListener("touchend", touchEnd, { passive: false });
    document.addEventListener("touchmove", touchMove, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", stop);
      document.removeEventListener("gesturechange", stop);
      document.removeEventListener("gestureend", stop);
      document.removeEventListener("touchend", touchEnd);
      document.removeEventListener("touchmove", touchMove);
    };
  }, []);
  return null;
}
