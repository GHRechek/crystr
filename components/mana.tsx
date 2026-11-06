"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

/** How hard the potion shakes, 0 to 4, from how full the meter is: still above half, a
 *  gentle pulse below, and a constant rattle when it is nearly empty. */
export function shakeLevel(mana: number, cap: number): 0 | 1 | 2 | 3 | 4 {
  if (mana <= 0) return 4;
  const f = mana / Math.max(1, cap);
  if (f <= 0.12) return 3;
  if (f <= 0.25) return 2;
  if (f <= 0.5) return 1;
  return 0;
}

/** The potion beside the mana count in the header, and the way to the Well: tap it to go and
 *  refill. It shakes harder the lower the meter gets. */
export function ManaButton({ mana, cap, closed }: { mana: number; cap: number; closed?: boolean }) {
  const path = usePathname();
  const here = path.startsWith("/well");
  const level = shakeLevel(mana, cap);
  // Before registering the Well is shut: the potion is just a potion.
  if (closed) {
    return (
      <span aria-label={`${mana} of ${cap} mana`} className="mana-well" data-shake={level} style={{ minHeight: 40, minWidth: 40, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mana.png" alt="" width={26} height={26} className="mana-icon mana-icon-lg" />
      </span>
    );
  }
  return (
    <Link
      href="/well"
      prefetch={false}
      aria-label={`The Well. You have ${mana} of ${cap} mana.`}
      title="The Well"
      className="mana-well"
      data-shake={level}
      data-here={here}
      style={{ minHeight: 40, minWidth: 40, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/mana.png" alt="" width={26} height={26} className="mana-icon mana-icon-lg" />
    </Link>
  );
}
