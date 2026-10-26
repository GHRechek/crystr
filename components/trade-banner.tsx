import Link from "next/link";

/** Under the header when someone has offered you a badge trade. Goes to the offers. */
export function TradeBanner({ who }: { who: string[] }) {
  if (who.length === 0) return null;
  const rest = who.length - 1;
  const line =
    rest === 0
      ? `${who[0]} has offered you a badge trade.`
      : `${who[0]} and ${rest} ${rest === 1 ? "other" : "others"} have offered you badge trades.`;

  return (
    <Link href="/me/trades" className="setup-banner" style={{ gap: 10, alignItems: "center" }}>
      <span style={{ fontSize: 12, lineHeight: 1.4, flex: "1 1 160px" }}>{line}</span>
      <span className="px" style={{ fontSize: 11 }}>
        SEE IT →
      </span>
    </Link>
  );
}
