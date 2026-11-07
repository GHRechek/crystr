import Link from "next/link";
import { Cost } from "@/components/mana";
import { getMotions, type Motion } from "@/lib/data";
import { castVote, voteAgain } from "@/lib/actions";
import { KeyedVote } from "@/components/keyed-vote";
import { ago, closesIn, corrupt, COSTS } from "@/lib/crystr";

/** The motion board, as a tab of the Ball: what is open to vote on, and what has been decided.
 *  `showPast` picks which; `base` is the Ball address the two views hang off. */
export async function MotionBoard({
  showPast,
  isWitch,
  keyed,
  mana,
  decay,
  base,
}: {
  showPast: boolean;
  isWitch: boolean;
  /** A Forsaken: each vote goes in with a witch's key, scanned. */
  keyed?: boolean;
  mana: number;
  decay: number;
  base: string;
}) {
  const { open, past } = await getMotions();

  return (
    <>
      {isWitch ? (
        <div className="witchbar">
          <span className="px" style={{ fontSize: 11, color: "var(--pur-pale)" }}>
            WITCH ACCESS
          </span>
          <span className="spacer" />
          <Link href="/vote/new" className="btn btn-sm btn-purple" style={{ minHeight: 40 }}>
            ＋ CREATE A MOTION
          </Link>
        </div>
      ) : (
        <div className="notice">
          Only witches create motions. If you want one on the board, argue for it in an
          op-ed and make it hard to ignore.
        </div>
      )}

      <div className="seg">
        <Link href={base} data-on={!showPast}>
          OPEN · {open.length}
        </Link>
        <Link href={`${base}&show=past`} data-on={showPast}>
          DECIDED · {past.length}
        </Link>
      </div>

      {showPast ? (
        past.length ? (
          past.map((m) => <Decided key={m.id} motion={m} decay={decay} />)
        ) : (
          <div className="empty">NOTHING HAS BEEN DECIDED YET</div>
        )
      ) : (
        <>
          {open.map((m) => (
            <Open key={m.id} motion={m} mana={mana} decay={decay} keyed={keyed} />
          ))}
          {open.length === 0 ? (
            <div className="empty">
              THE BOARD IS EMPTY
              <br />
              <span style={{ color: "var(--muted)" }}>
                {isWitch ? "CREATE SOMETHING." : "NOTHING TO BE ANNOYED ABOUT. YET."}
              </span>
            </div>
          ) : null}
          <div className="notice">
            Witches create motions, and never without a briefing attached. Reading is
            free; being counted is three.
          </div>
        </>
      )}
    </>
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
        borderRadius: 0,
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

export function Open({ motion, mana, decay, keyed }: { motion: Motion; mana: number; decay: number; keyed?: boolean }) {
  const total = motion.votes_for + motion.votes_against;
  const pct = total ? Math.round((motion.votes_for / total) * 100) : 0;
  const closes = closesIn(motion.closes_at);
  const urgent = closes.endsWith("M") || (closes.endsWith("H") && parseInt(closes) <= 6);

  return (
    <div className="card" style={{ gap: 10, background: "var(--blk-motion)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="px" style={{ fontSize: 11, color: "var(--dim)", marginBottom: 5 }}>
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
            {corrupt(motion.title, decay)}
          </div>
        </div>
        <div
          className="px"
          style={{
            fontSize: 11,
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
          {corrupt(motion.blurb, decay)}
        </div>
      ) : null}

      {motion.briefing_id ? (
        <Link
          href={`/ball/${motion.briefing_id}`}
          className="btn btn-sm"
          style={{ alignSelf: "flex-start", fontSize: 11, color: "var(--pur-pale)" }}
        >
          ◉ READ THE BRIEFING
        </Link>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <Tally motion={motion} height={10} />
        <div
          className="px"
          style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}
        >
          <span style={{ color: "var(--mag-soft)" }}>YAY {total ? `${pct}%` : "—"}</span>
          <span style={{ color: "var(--muted)" }}>
            {total ? `${total} CAST` : "NO VOTES YET"}
          </span>
          <span style={{ color: "var(--blu-mid)" }}>
            {total ? `${100 - pct}%` : "—"} NAY
          </span>
        </div>
      </div>

      {motion.my_side ? (
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, display: "flex" }}>
          <div
            className="px"
            style={{
              flex: 1,
              minHeight: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "var(--px-r)",
              fontSize: 11,
              background:
                motion.my_side === "for" ? "rgba(224,57,138,.12)" : "rgba(76,125,240,.12)",
              boxShadow: `inset 0 0 0 1px ${
                motion.my_side === "for" ? "var(--mag-edge)" : "var(--blu-edge)"
              }`,
              color: motion.my_side === "for" ? "var(--mag-pale)" : "var(--blu-pale)",
            }}
          >
            YOU SAID {motion.my_side === "for" ? "YAY" : "NAY"}{motion.my_votes > 1 ? " · TWICE" : ""}
          </div>
          </div>
          {/* Once more, the same way: it counts twice. */}
          {motion.my_votes < 2 && keyed ? (
            <div style={{ flex: 1, display: "flex" }}>
              <KeyedVote motionId={motion.id} again cost={COSTS.voteAgain} dim={mana < COSTS.voteAgain} label="VOTE AGAIN" className={`btn btn-block ${motion.my_side === "for" ? "btn-mag" : "btn-blue"}`} />
            </div>
          ) : motion.my_votes < 2 ? (
            <form action={voteAgain} style={{ flex: 1, display: "flex" }}>
              <input type="hidden" name="motion_id" value={motion.id} />
              <button
                type="submit"
                className={`btn btn-block ${motion.my_side === "for" ? "btn-mag" : "btn-blue"}`}
                style={{ minHeight: 40, fontSize: 11, opacity: mana >= COSTS.voteAgain ? 1 : 0.5 }}
              >
                VOTE AGAIN <Cost n={COSTS.voteAgain} />
              </button>
            </form>
          ) : null}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          {(["for", "against"] as const).map((side) => keyed ? (
            <div key={side} style={{ flex: 1, display: "flex" }}>
              <KeyedVote motionId={motion.id} side={side} cost={COSTS.vote} dim={mana < COSTS.vote} label={side === "for" ? "YAY" : "NAY"} className={`btn btn-block ${side === "for" ? "btn-mag" : "btn-blue"}`} />
            </div>
          ) : (
            <form key={side} action={castVote} style={{ flex: 1, display: "flex" }}>
              <input type="hidden" name="motion_id" value={motion.id} />
              <input type="hidden" name="side" value={side} />
              <button
                type="submit"
                className={`btn btn-block ${side === "for" ? "btn-mag" : "btn-blue"}`}
                style={{ minHeight: 44, fontSize: 11, opacity: mana >= COSTS.vote ? 1 : 0.5 }}
              >
                {side === "for" ? "YAY" : "NAY"} <Cost n={COSTS.vote} />
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}

function Decided({ motion, decay }: { motion: Motion; decay: number }) {
  const total = motion.votes_for + motion.votes_against;
  const pct = total ? Math.round((motion.votes_for / total) * 100) : 0;
  const passed = motion.votes_for > motion.votes_against;

  return (
    <div className="card" style={{ padding: 12, gap: 8, background: "var(--blk-motion)" }}>
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
          {corrupt(motion.title, decay)}
        </div>
        <div className={`pill ${passed ? "pill-passed" : "pill-failed"}`} style={{ fontSize: 11 }}>
          {total === 0 ? "NO QUORUM" : passed ? "PASSED" : "FAILED"}
        </div>
      </div>

      <Tally motion={motion} height={6} />

      <div className="px" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
        <span style={{ color: "var(--mag-soft)" }}>
          {total ? `${pct} / ${100 - pct}` : "—"}
        </span>
        <span className="spacer" />
        <span style={{ color: motion.my_side ? "var(--pur-pale)" : "var(--muted)" }}>
          {motion.my_side ? `YOU SAID ${motion.my_side === "for" ? "YAY" : "NAY"}${motion.my_votes > 1 ? " TWICE" : ""}` : "DID NOT VOTE"}
        </span>
        <span style={{ color: "var(--dim)" }}>{ago(motion.closes_at)}</span>
      </div>
    </div>
  );
}
