import { seeTopSix } from "@/lib/actions";

/** Under the header when someone has put you in their Top 5. Says who, once, and
 *  goes away when you've seen it. */
export function TopSixBanner({ who }: { who: string[] }) {
  if (who.length === 0) return null;
  const rest = who.length - 1;
  const line =
    rest === 0
      ? `${who[0]} put you in their Top 5.`
      : rest === 1
        ? `${who[0]} and ${who[1]} put you in their Top 5.`
        : `${who[0]}, ${who[1]} and ${rest - 1} ${rest - 1 === 1 ? "other" : "others"} put you in their Top 5.`;

  return (
    <form action={seeTopSix} className="setup-banner" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, lineHeight: 1.4, flex: "1 1 160px" }}>{line}</span>
      <button type="submit" className="btn btn-sm btn-purple" style={{ minHeight: 40 }}>
        NICE
      </button>
    </form>
  );
}
