import { answerVouch } from "@/lib/actions";
import type { Vouch } from "@/lib/data";

/** Under the header when someone has said something about you that is waiting
 *  for a yes. One at a time, answered right there; it goes away when answered. */
export function VouchBanner({ vouches }: { vouches: Vouch[] }) {
  const v = vouches[0];
  if (!v) return null;
  const who = v.who?.handle ?? "Someone";
  const line =
    v.kind === "meetup"
      ? `${who} says you two met up. Is that right?`
      : `${who} says they helped you with something. Is that right?`;

  return (
    <form action={answerVouch} className="setup-banner" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <input type="hidden" name="id" value={v.id} />
      <span style={{ fontSize: 12, lineHeight: 1.4, flex: "1 1 160px" }}>{line}</span>
      <button type="submit" name="answer" value="yes" className="btn btn-sm btn-purple" style={{ minHeight: 32 }}>
        YES
      </button>
      <button type="submit" name="answer" value="no" className="btn btn-sm" style={{ minHeight: 32 }}>
        NOT QUITE
      </button>
      {vouches.length > 1 ? (
        <span className="px" style={{ fontSize: 8, color: "var(--muted)" }}>
          +{vouches.length - 1} MORE
        </span>
      ) : null}
    </form>
  );
}
