import Link from "next/link";
import { requireMe, getBadges, getPeopleKinds, getQuests, getQuestWaiting } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { answerBadgeClaim } from "@/lib/actions";
import { untilReady, ago } from "@/lib/crystr";
import { resolveWorking, finishedWorking, goalGrid, questGrid } from "@/lib/badges";
import { WorkingOn } from "@/components/working-on";
import { QuestBrowser } from "@/components/quest-browser";

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
  const [badges, people, well] = await Promise.all([getBadges(userId), getPeopleKinds(userId), getQuests(userId)]);
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

      <WorkingOn
        key={sp.pick === "1" ? "pick" : "view"}
        openAtStart={sp.pick === "1"}
        isWitch={profile.is_witch}
        editable
        finished={finishedWorking(profile.working_on, badges)}
        items={resolveWorking(profile.working_on, badges, [], progress)}
        all={goalGrid(badges, progress)}
      />

      {waitingCount ? (
        <div>
          {head("WAITING", "var(--pur-soft)", <span className="px" style={{ fontSize: 11, color: "var(--muted)" }}>{waitingCount}</span>)}
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

      <div>
        {head("DAILY", "var(--blu-soft)", <Link href="/well" className="px" style={{ fontSize: 11, color: "var(--pur-pale)" }}>THE WELL →</Link>)}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {well.map((q) => {
            const wait = !!q.ready_at;
            return (
              <Link key={q.slug} href={`/well/${q.slug}`} className="rowcard" style={{ padding: 11, minHeight: 56, gap: 11 }}>
                <div className="avatar" style={{ width: 32, height: 32, background: q.chip, fontSize: 12, opacity: wait ? 0.5 : 1 }}>{q.glyph}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{q.title}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.4 }}>{q.sub}</div>
                </div>
                <div className="px" style={{ fontSize: wait ? 9 : 12, color: wait ? "var(--dim)" : "var(--blu-soft)", flex: "none", textAlign: "right" }}>
                  {wait ? `IN ${untilReady(q.ready_at!)}` : `+${q.reward}`}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        {head("QUESTS", "var(--mag-soft)", <span className="px" style={{ fontSize: 11, color: "var(--muted)" }}>{quests.filter((b) => !b.locked).length} / {quests.length}</span>)}
        <QuestBrowser items={quests} people={people} pending={pending} />
      </div>

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
    </div>
  );
}
