import Link from "next/link";
import { requireMe, getMotions, type Motion } from "@/lib/data";
import { castVote } from "@/lib/actions";
import { ago, closesIn, COSTS } from "@/lib/crystr";

export default async function VotePage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const { profile } = await requireMe();
  const { open, past } = await getMotions();
  const showPast = searchParams.tab === "past";

  return (
    <div className="pad" style={{ gap: 13 }}>
      <div>
        <div className="screen-title">THE MOTION BOARD</div>
        <div className="screen-intro">
          Three mana a vote. The charge is deliberate: opinions people pay for are held
          slightly better than opinions they don&apos;t.
        </div>
      </div>

      {profile.is_witch ? (
        <div className="witchbar">
          <span className="px" style={{ fontSize: 8.5, color: "var(--pur-pale)" }}>
            WITCH ACCESS
          </span>
          <span className="spacer" />
          <Link href="/vote/new" className="btn btn-sm btn-purple" style={{ minHeight: 36 }}>
            ＋ TABLE A MOTION
          </Link>
        </div>
      ) : (
        <div className="notice">
          Only witches table motions. If you want one on the board, argue for it in an
          op-ed on the Ball and make it hard to ignore.
        </div>
      )}

      <div className="seg">
        <Link href="/vote" data-on={!showPast}>
          OPEN · {open.length}
        </Link>
        <Link href="/vote?tab=past" data-on={showPast}>
          DECIDED · {past.length}
        </Link>
      </div>

      {showPast ? (
        past.length ? (
          past.map((m) => <Decided key={m.id} motion={m} />)
        ) : (
          <div className="empty">NOTHING HAS BEEN DECIDED YET</div>
        )
      ) : (
        <>
          {open.map((m) => (
            <Open key={m.id} motion={m} mana={profile.mana} />
          ))}
          {open.length === 0 ? (
            <div className="empty">
              THE BOARD IS EMPTY
              <br />
              <span style={{ color: "var(--muted)" }}>
                {profile.is_witch ? "TABLE SOMETHING." : "NOTHING TO BE ANNOYED ABOUT. YET."}
              </span>
            </div>
          ) : null}
          <div className="notice">
            Witches table motions, and never without a briefing attached. Reading is
            free; being counted is three.
          </div>
        </>
      )}
    </div>
  );
}

function Tally({ motion, height }: { motion: Motion; height: number }) {
  const total = motion.votes_for + motion.votes_against;
  const pct = total ? Math.round((motion.votes_for / total) * 100) : 0;
  return (
    <div
      style={{
        display: "flex",
        height,
        borderRadius: 2,
        overflow: "hidden",
        background: "var(--track)",
        boxShadow: height > 8 ? "inset 0 0 0 1px var(--edge)" : undefined,
      }}
    >
      <div style={{ background: "var(--mag)", width: `${total ? pct : 0}%` }} />
      <div style={{ background: "var(--blu)", width: `${total ? 100 - pct : 0}%` }} />
    </div>
  );
}

function Open({ motion, mana }: { motion: Motion; mana: number }) {
  const total = motion.votes_for + motion.votes_against;
  const pct = total ? Math.round((motion.votes_for / total) * 100) : 0;
  const closes = closesIn(motion.closes_at);
  const urgent = closes.endsWith("M") || (closes.endsWith("H") && parseInt(closes) <= 6);

  return (
    <div className="card" style={{ gap: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="px" style={{ fontSize: 8, color: "var(--dim)", marginBottom: 5 }}>
            {motion.kicker}
          </div>
          <div
            style={{
              fontSize: 14.5,
              fontWeight: 500,
              lineHeight: 1.3,
              letterSpacing: "-.01em",
              textWrap: "pretty",
            }}
          >
            {motion.title}
          </div>
        </div>
        <div
          className="px"
          style={{
            fontSize: 8.5,
            color: urgent ? "var(--mag-soft)" : "var(--dim)",
            flex: "none",
            textAlign: "right",
            lineHeight: 1.6,
          }}
        >
          CLOSES
          <br />
          {closes}
        </div>
      </div>

      {motion.blurb ? (
        <div style={{ fontSize: 12, lineHeight: 1.55, color: "var(--dim)", textWrap: "pretty" }}>
          {motion.blurb}
        </div>
      ) : null}

      {motion.briefing_id ? (
        <Link
          href={`/ball/${motion.briefing_id}`}
          className="btn btn-sm"
          style={{ alignSelf: "flex-start", fontSize: 8.5, color: "var(--pur-pale)" }}
        >
          ◉ READ THE BRIEFING
        </Link>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <Tally motion={motion} height={10} />
        <div
          className="px"
          style={{ display: "flex", justifyContent: "space-between", fontSize: 8.5 }}
        >
          <span style={{ color: "var(--mag-soft)" }}>FOR {total ? `${pct}%` : "—"}</span>
          <span style={{ color: "var(--muted)" }}>
            {total ? `${total} CAST` : "NO VOTES YET"}
          </span>
          <span style={{ color: "var(--blu-mid)" }}>
            {total ? `${100 - pct}%` : "—"} AGAINST
          </span>
        </div>
      </div>

      {motion.my_side ? (
        <div
          className="px"
          style={{
            minHeight: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "var(--px-r)",
            fontSize: 9,
            background:
              motion.my_side === "for" ? "rgba(224,57,138,.12)" : "rgba(76,125,240,.12)",
            boxShadow: `inset 0 0 0 1px ${
              motion.my_side === "for" ? "var(--mag-edge)" : "var(--blu-edge)"
            }`,
            color: motion.my_side === "for" ? "var(--mag-pale)" : "var(--blu-pale)",
          }}
        >
          YOU VOTED {motion.my_side.toUpperCase()} · {COSTS.vote} MANA SPENT
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          {(["for", "against"] as const).map((side) => (
            <form key={side} action={castVote} style={{ flex: 1, display: "flex" }}>
              <input type="hidden" name="motion_id" value={motion.id} />
              <input type="hidden" name="side" value={side} />
              <button
                type="submit"
                className={`btn btn-block ${side === "for" ? "btn-mag" : "btn-blue"}`}
                style={{ minHeight: 44, fontSize: 10, opacity: mana >= COSTS.vote ? 1 : 0.5 }}
              >
                {side.toUpperCase()} · -{COSTS.vote}
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}

function Decided({ motion }: { motion: Motion }) {
  const total = motion.votes_for + motion.votes_against;
  const pct = total ? Math.round((motion.votes_for / total) * 100) : 0;
  const passed = motion.votes_for > motion.votes_against;

  return (
    <div className="card" style={{ padding: 12, gap: 8 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 13.5,
            fontWeight: 500,
            lineHeight: 1.35,
            textWrap: "pretty",
          }}
        >
          {motion.title}
        </div>
        <div className={`pill ${passed ? "pill-passed" : "pill-failed"}`} style={{ fontSize: 8 }}>
          {total === 0 ? "NO QUORUM" : passed ? "PASSED" : "FAILED"}
        </div>
      </div>

      <Tally motion={motion} height={6} />

      <div className="px" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 8 }}>
        <span style={{ color: "var(--mag-soft)" }}>
          {total ? `${pct} / ${100 - pct}` : "—"}
        </span>
        <span className="spacer" />
        <span style={{ color: motion.my_side ? "var(--pur-pale)" : "var(--muted)" }}>
          {motion.my_side ? `YOU VOTED ${motion.my_side.toUpperCase()}` : "DID NOT VOTE"}
        </span>
        <span style={{ color: "var(--dim)" }}>{ago(motion.closes_at)}</span>
      </div>
    </div>
  );
}
