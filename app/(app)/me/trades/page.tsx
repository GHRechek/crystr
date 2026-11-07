import { redirect } from "next/navigation";

/** The old offers page. Trades happen face to face now (scan, TRADE), so this just leads to your Historikals. */
export default function TradesPage() {
  redirect("/me/historikals");
}
