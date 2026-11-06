import Link from "next/link";
import { requireMe, getBadges, getPeopleKinds, getQuestWaiting } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { answerBadgeClaim } from "@/lib/actions";
import { ago } from "@/lib/crystr";
import { resolveWorking, finishedWorking, goalGrid, questGrid } from "@/lib/badges";
import { WorkingOn } from "@/components/working-on";
import { QuestBrowser } from "@/components/quest-browser";
import { HubTabs } from "@/components/hub-tabs";
import { BadgeViewer } from "@/components/badge-viewer";
import { achievementGrid, resolveShown } from "@/lib/badges";
import { getBadgeItems } from "@/lib/data";

const head = (text: string, colour: string, aside?: React.ReactNode) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
    <div className="px" style={{ fontSize: 12, color: colour }}>{text}</div>
    <span className="spacer" />
    {aside}
  </div>
);

/** Every quest in one place: the epic ones you are working on, what is waiting, the Well's daily ones,
 *  and all the rest. */
export default async function QuestsPage(props: { searchParams: Promise<{ pick?: string }> }) {
  const sp = await props.searchParams;
  const { userId, profile } = await requireMe();
  await createClient().rpc("cr_check_badges");
  const { data: progressData } = await createClient().rpc("cr_goal_progress");
  const progress = (progressData ?? {}) as Record<string, number>;
  const [badges, people, items] = await Promise.all([getBadges(userId), getPeopleKinds(userId), getBadgeItems(userId)]);
  const tradable = items.filter((i) => i.kind === "tradable");
  const shown = resolveShown(profile.shown_badges, badges, items, profile.handle);
  const heldCount = badges.filter((b) => b.earned_at).length + tradable.length;
  const waiting = await getQuestWaiting(userId, profile.is_witch, new Set(badges.filter((b) => b.earned_at).map((b) => b.slug)));

  const pending: Record<string, string> = {};
  for (const r of waiting.requests) pending[r.slug] = "WAITING FOR A WITCH";
  for (const c of waiting.askedOut) pending[c.slug] = `WAITING FOR ${c.to.toUpperCase()}`;
  const waitingCount = waiting.asked.length + waiting.askedOut.length + waiting.requests.length + waiting.vouches.length;
  const quests = questGrid(badges);

  return (
    <div className="pad" style={{ gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/me" className="btn btn-sm">← ME</Link>
        <h1 className="px" style={{ fontSize: 13, color: "var(--pur-soft)", fontWeight: 400 }}>QUESTS</h1>
      </div>

      <HubTabs
        heldCount={heldCount}
        held={
          <BadgeViewer
            inline
            editable
            earned={achievementGrid(badges.filter((b) => b.earned_at))}
            tradable={resolveShown(tradable.map((i) => `i:${i.id}`), badges, items, profile.handle, 10000)}
            current={shown.map((b) => b.key)}
            aside={
              <Link href="/me/trades" className="px" style={{ fontSize: 11, color: "var(--pur-pale)", whiteSpace: "nowrap" }}>
                TRADES →
              </Link>
            }
          />
        }
        quests={
          <>
      <WorkingOn
        key={sp.pick === "1" ? "pick" : "view"}
        openAtStart={sp.pick === "1"}
        isWitch={profile.is_witch}
        editable
        people={people}
        finished={finishedWorking(profile.working_on, badges)}
        items={resolveWorking(profile.working_on, badges, [], progress)}
        all={goalGrid(badges, progress)}
      />

      {waitingCount ? (
        <div>
          {head("ACTIVE QUESTS", "var(--pur-soft)", <span className="px" style={{ fontSize: 11, color: "var(--muted)" }}>{waitingCount}</span>)}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {waiting.asked.map((c) => (
              <div key={`in${c.id}`} className="tile" style={{ padding: 12 }}>
                <div className="px" style={{ fontSize: 11, color: "var(--text)", lineHeight: 1.5 }}>{c.from.toUpperCase()} ASKS YOU</div>
                <div style={{ fontSize: 12, lineHeight: 1.45, color: "var(--muted)", margin: "3px 0 8px" }}>Did &ldquo;{c.title}&rdquo; happen with you?</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["yes", "no"] as const).map((a) => (
                    <form key={a} action={answerBadgeClaim} style={{ flex: 1 }}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="answer" value={a} />
                      <input type="hidden" name="thread" value="0" />
                      <button type="submit" className={`btn btn-sm btn-block${a === "yes" ? " btn-purple" : ""}`} style={{ minHeight: 40 }}>{a === "yes" ? "YES" : "NO"}</button>
                    </form>
                  ))}
                </div>
              </div>
            ))}
            {waiting.askedOut.map((c) => (
              <Link key={`out${c.id}`} href={`/u/${c.to}`} className="rowcard" style={{ minHeight: 48, padding: "8px 11px" }}>
                <div style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>
                  {c.title} <span style={{ color: "var(--muted)" }}>· asked {c.to}</span>
                </div>
                <span className="px" style={{ fontSize: 9.5, color: "var(--pur-pale)" }}>WAITING</span>
              </Link>
            ))}
            {waiting.requests.map((r) => (
              <Link key={`req${r.id}`} href={`/thread/${r.id}`} className="rowcard" style={{ minHeight: 48, padding: "8px 11px" }}>
                <div style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>
                  {r.title} <span style={{ color: "var(--muted)" }}>· posted for a witch</span>
                </div>
                <span className="px" style={{ fontSize: 9.5, color: "var(--pur-pale)" }}>WAITING</span>
              </Link>
            ))}
            {waiting.vouches.map((v) => (
              <Link key={`v${v.id}`} href={`/u/${v.to}`} className="rowcard" style={{ minHeight: 48, padding: "8px 11px" }}>
                <div style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>
                  {v.kind === "meetup" ? "We met up" : "I helped them"} <span style={{ color: "var(--muted)" }}>· {v.to}</span>
                </div>
                <span className="px" style={{ fontSize: 9.5, color: "var(--pur-pale)" }}>WAITING</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {profile.is_witch ? (
        <div>
          {head("BADGE REQUESTS", "var(--mag)", <span className="px" style={{ fontSize: 11, color: "var(--muted)" }}>{waiting.queue.length} WAITING</span>)}
          {waiting.queue.length === 0 ? (
            <div className="empty">NOTHING IS WAITING FOR A WITCH</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {waiting.queue.map((r) => (
                <Link key={r.id} href={`/thread/${r.id}`} className="rowcard" style={{ minHeight: 52, padding: "8px 11px" }}>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>
                    {r.title} <span style={{ color: "var(--muted)" }}>· {r.who} · {ago(r.created_at)}</span>
                  </div>
                  <span className="px" style={{ fontSize: 9.5, color: "var(--pur-pale)" }}>LIKE TO APPROVE →</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div>
        {head("ALL QUESTS", "var(--mag-soft)", <span className="px" style={{ fontSize: 11, color: "var(--muted)" }}>{quests.filter((b) => !b.locked).length} / {quests.length}</span>)}
        <QuestBrowser items={quests} people={people} pending={pending} />
      </div>

          </>
        }
      />
    </div>
  );
}
