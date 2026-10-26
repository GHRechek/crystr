import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireMe, getBadgeItems, getToken, getProfileByHandle } from "@/lib/data";
import { tokenReadyAt } from "@/lib/badges";
import { TradeForm } from "./form";

/** Offer this person a trade: one of your badges or your token, for one of theirs or for
 *  nothing. */
export default async function TradePage(props: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ give?: string }>;
}) {
  const { handle: raw } = await props.params;
  const { give } = await props.searchParams;
  const { userId, profile: me } = await requireMe();

  let handle = "";
  try {
    handle = decodeURIComponent(raw).toLowerCase();
  } catch {
    notFound();
  }
  if (!/^[a-z0-9_.-]{1,40}$/.test(handle)) notFound();
  const person = await getProfileByHandle(handle);
  if (!person) notFound();
  if (person.id === userId) redirect("/me");

  const [mine, theirs, token] = await Promise.all([getBadgeItems(userId), getBadgeItems(person.id), getToken(userId)]);
  const ready = tokenReadyAt(token?.last_given_at);

  return (
    <div className="pad" style={{ gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href={`/u/${person.handle}`} className="btn btn-sm">
          ← {person.handle.toUpperCase()}
        </Link>
      </div>

      <div>
        <h1 className="screen-title">TRADE WITH {person.handle.toUpperCase()}</h1>
        <div className="screen-intro">
          Pick what you give and what you want back. They see the offer at the top of their screen and
          nothing moves until they say yes. A badge for a badge, or a badge for nothing.
        </div>
      </div>

      <TradeForm
        toId={person.id}
        toHandle={person.handle}
        mine={mine}
        theirs={theirs}
        myToken={token ? { design: token.design, readyAt: ready ? ready.toISOString() : null } : null}
        me={{ displayName: me.display_name, handle: me.handle }}
        preselectToken={give === "token"}
      />
    </div>
  );
}
