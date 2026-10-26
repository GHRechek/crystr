"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** The first time someone opens the wiki with little mana: a low-mana page blurs and eats
 *  letters, which makes the wiki hard to read, so the Well comes first. Shown once per
 *  person on this device. */
export function WellHint({ userId, mana, registered }: { userId: string; mana: number; registered: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (mana > 10) return;
    const key = `crystr.well-hint.${userId}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      // No storage: show it anyway, once per visit.
    }
    setShow(true);
  }, [userId, mana]);

  if (!show) return null;
  return (
    <div className="banner-note banner-purple" role="status">
      <div className="px" style={{ fontSize: 11, marginBottom: 4 }}>
        FILL THE WELL FIRST
      </div>
      With {mana} mana the City is hard to read: the page blurs and letters go missing. You will
      read the wiki far better after a visit to the Well.
      {registered ? (
        <>
          {" "}
          <Link href="/well" style={{ color: "var(--pur-pale)", textDecoration: "underline" }}>
            GO TO THE WELL
          </Link>
        </>
      ) : (
        " The Well opens as soon as you have finished the registry."
      )}
      <button
        type="button"
        className="btn btn-sm"
        onClick={() => setShow(false)}
        style={{ display: "block", marginTop: 8, minHeight: 40 }}
      >
        GOT IT
      </button>
    </div>
  );
}
