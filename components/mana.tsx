"use client";

import { useEffect, useRef, useState } from "react";

/** The mana potion, in the app's colours. It sits inline with text; a screen reader says "mana". */
export function ManaIcon({ big }: { big?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/mana.png"
      alt="mana"
      title="Mana"
      width={big ? 26 : 13}
      height={big ? 26 : 13}
      className={big ? "mana-icon mana-icon-lg" : "mana-icon"}
    />
  );
}

/** The potion with a number inside it. The bottle is one sheet (magenta for what you spend,
 *  blue for what you get back); the number is a mask over it painted in the surrounding text
 *  colour, so it always matches the button it sits in. */
function Bottle({ n, gain }: { n: number; gain?: boolean }) {
  if (!Number.isInteger(n) || n < 0 || n > 20) return <span>{n}</span>;
  return (
    <span aria-hidden className={gain ? "mana-bottle mana-bottle-gain" : "mana-bottle"}>
      <span className="mana-digits" style={{ ["--x" as string]: `-${n * 11}px` } as React.CSSProperties} />
    </span>
  );
}

/** A price, at the end of the button that takes it: "-" and the potion with the cost inside. */
export function Cost({ n }: { n: number }) {
  return (
    <span className="cost" role="img" aria-label={`costs ${n} mana`} title={`${n} mana`}>
      -<Bottle n={n} />
    </span>
  );
}

/** A reward: "+" and the potion with the amount inside. */
export function Gain({ n }: { n: number }) {
  return (
    <span className="cost" role="img" aria-label={`restores ${n} mana`} title={`${n} mana`}>
      +<Bottle n={n} gain />
    </span>
  );
}

/** The potion beside the mana count in the header. Tap it and it says what it is. */
export function ManaButton() {
  const [shown, setShown] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function tap() {
    setShown(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShown(false), 1800);
  }

  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        onClick={tap}
        aria-label="Mana"
        style={{ background: "none", border: 0, padding: 4, minHeight: 40, minWidth: 40, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mana.png" alt="" width={26} height={26} className="mana-icon mana-icon-lg" />
      </button>
      {shown ? (
        <span
          role="status"
          className="px"
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            zIndex: 20,
            padding: "6px 9px",
            fontSize: 11,
            background: "var(--raised)",
            boxShadow: "0 0 0 1px var(--edge)",
            color: "var(--text)",
            whiteSpace: "nowrap",
          }}
        >
          MANA
        </span>
      ) : null}
    </span>
  );
}
