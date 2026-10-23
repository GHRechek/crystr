import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMe, getThread, getVouchesBetween } from "@/lib/data";
import { Avatar } from "@/components/bits";
import { claimVouch } from "@/lib/actions";
import { Bubble, snippet } from "@/components/whisper-bubble";
import { WhisperComposer } from "./composer";
import { ReportButton } from "@/components/report-button";
import { corrupt, COSTS, decayLevel } from "@/lib/crystr";
import type { Vouch } from "@/lib/data";

export default async function ThreadPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reply?: string }>;
}) {
  const params = await props.params;
  const query = await props.searchParams;
  const { userId, profile } = await requireMe();
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const thread = await getThread(id, userId);
  if (!thread) notFound();

  const vouches = await getVouchesBetween(userId, thread.other.id);
  const broke = profile.mana < COSTS.whisper;
  const decay = decayLevel(profile.mana);
  const wanted = Number(query?.reply);
  const replyTarget = Number.isFinite(wanted) ? thread.messages.find((m) => m.id === wanted && !m.unsent) : undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <div
        style={{
          flex: "none",
          padding: "11px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderBottom: "1px solid var(--rule)",
          background: "var(--device)",
          position: "sticky",
          top: 0,
          zIndex: 2,
        }}
      >
        <Link href="/whispers" className="btn btn-sm" style={{ padding: "0 9px" }}>
          ←
        </Link>
        <Link
          href={`/u/${thread.other.handle}`}
          style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, color: "inherit", textDecoration: "none" }}
        >
          <Avatar person={thread.other} size={28} />
          <h1 style={{ fontSize: 13.5, fontWeight: 500 }}>{thread.other.handle}</h1>
        </Link>
        <div className="spacer" />
        <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
          {COSTS.whisper}/MSG
        </div>
      </div>

      <div
        style={{
          flex: 1,
          padding: "14px 16px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 9,
        }}
      >
        {thread.messages.map((m) => (
          <Bubble
            key={m.id}
            m={m}
            mine={m.sender_id === userId}
            thread={id}
            decay={decay}
            other={thread.other.handle}
            quoted={m.reply_to ? thread.messages.find((x) => x.id === m.reply_to) : undefined}
            quotedWho={(q) => (q.sender_id === userId ? "you" : thread.other.handle)}
          />
        ))}

        {thread.messages.length === 0 ? (
          <div className="empty">NOTHING HAS BEEN SAID HERE YET</div>
        ) : null}

        {broke ? (
          <div
            className="px"
            style={{
              alignSelf: "center",
              fontSize: 11,
              color: "var(--mag)",
              textAlign: "center",
              lineHeight: 1.8,
              padding: "8px 0",
            }}
          >
            REST FIRST — YOUR MESSAGE IS WAITING
            <br />
            <span style={{ color: "var(--muted)" }}>A LITTLE TIME AT THE WELL, THEN TRY AGAIN.</span>
          </div>
        ) : null}
      </div>

      <div style={{ flex: "none", padding: "8px 16px 0" }}>
        <ReportButton kind="whisper" target={id} back={`/whispers/${id}`} label="REPORT THIS CONVERSATION" />
      </div>

      <Said thread={id} other={thread.other} me={userId} vouches={vouches} />

      <WhisperComposer
        key={thread.messages[thread.messages.length - 1]?.id ?? 0}
        threadId={id}
        cost={COSTS.whisper}
        replyTo={replyTarget?.id ?? null}
        replyLine={replyTarget ? `${replyTarget.sender_id === userId ? "you" : thread.other.handle}: ${snippet(replyTarget)}` : null}
        closeReplyHref={`/whispers/${id}`}
      />
    </div>
  );
}

/** Say that something happened between you two. The other person confirms from
 *  the banner at the top of their screen; one yes is enough. */
function Said({
  thread,
  other,
  me,
  vouches,
}: {
  thread: number;
  other: { id: string; handle: string };
  me: string;
  vouches: Vouch[];
}) {
  const find = (kind: Vouch["kind"], mine?: boolean) =>
    vouches.find((v) => v.kind === kind && (mine === undefined || (v.claimant === me) === mine));
  const met = find("meetup");
  const helpedThem = find("helped", true);

  const rows: { key: string; text: string; ask?: { kind: string; label: string } }[] = [];

  if (met?.status === "confirmed") rows.push({ key: "m", text: `You and ${other.handle} met up. ✓` });
  else if (met?.claimant === me) rows.push({ key: "m", text: `Waiting for ${other.handle} to confirm you met up.` });
  else if (met) rows.push({ key: "m", text: `${other.handle} says you met up. The note is at the top of your screen.` });
  else rows.push({ key: "m", text: "", ask: { kind: "meetup", label: "WE MET UP" } });

  if (helpedThem?.status === "confirmed") rows.push({ key: "h", text: `${other.handle} confirmed you helped them. ✓` });
  else if (helpedThem) rows.push({ key: "h", text: `Waiting for ${other.handle} to confirm you helped them.` });
  else rows.push({ key: "h", text: "", ask: { kind: "helped", label: "I HELPED THEM" } });

  return (
    <div style={{ flex: "none", padding: "8px 16px 0", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <span className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
        SAY WHAT HAPPENED
      </span>
      {rows.map((r) =>
        r.ask ? (
          <form key={r.key} action={claimVouch}>
            <input type="hidden" name="thread_id" value={thread} />
            <input type="hidden" name="other_id" value={other.id} />
            <input type="hidden" name="kind" value={r.ask.kind} />
            <button type="submit" className="btn btn-sm" style={{ minHeight: 40, fontSize: 11 }}>
              {r.ask.label}
            </button>
          </form>
        ) : (
          <span key={r.key} style={{ fontSize: 12, color: "var(--muted)" }}>
            {r.text}
          </span>
        ),
      )}
    </div>
  );
}
