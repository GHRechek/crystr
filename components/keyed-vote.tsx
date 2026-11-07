"use client";

import { useCallback, useState, useTransition } from "react";
import { Cost } from "@/components/mana";
import { WitchKeyScanner } from "@/components/witch-key-scanner";
import { castVote, voteAgain } from "@/lib/actions";

/** A Forsaken's vote button. Like the registry, a vote needs a licensed witch: tap, scan the
 *  witch's key, and the vote goes in with it. */
export function KeyedVote({ motionId, side, again, cost, dim, className, label }: { motionId: number; side?: "for" | "against"; again?: boolean; cost: number; dim: boolean; className: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const onKey = useCallback(
    (key: string) => {
      setOpen(false);
      const fd = new FormData();
      fd.set("motion_id", String(motionId));
      if (side) fd.set("side", side);
      fd.set("key", key);
      start(() => (again ? voteAgain(fd) : castVote(fd)));
    },
    [motionId, side, again],
  );
  return (
    <>
      <button type="button" className={className} disabled={pending} onClick={() => setOpen(true)} style={{ minHeight: again ? 40 : 44, fontSize: 11, opacity: dim || pending ? 0.5 : 1, flexDirection: "column", gap: 2 }}>
        <span>{label} <Cost n={cost} /></span>
        <span style={{ fontSize: 8.5, opacity: 0.85 }}>⚿ WITCH&apos;S KEY</span>
      </button>
      {open ? (
        <WitchKeyScanner
          title={`${label}: WITCH'S KEY`}
          why="The Forsaken vote with a licensed witch. Ask one to show you the QR code on their profile, and point the camera at it."
          onKey={onKey}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
