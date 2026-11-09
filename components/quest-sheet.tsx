"use client";

import Link from "next/link";
import { useState } from "react";
import { BadgeFace } from "@/components/badge-chooser";
import { QrScanner } from "@/components/qr-scanner";
import type { ShownBadge } from "@/lib/badges";
import { targetLabel } from "@/lib/species";

/** Where each system badge is done, for the ones that have a place to go. */
export const WHERE: Record<string, [string, string]> = {
  "top-five-full": ["/me/top-six", "PICK YOUR TOP 5"],
  "first-bio": ["/me/edit", "EDIT YOUR PROFILE"],
  "token-made": ["/me/token", "MAKE YOUR PROOF"],
  "visit-the-well": ["/well", "GO TO THE WELL"],
  "vote-on-a-motion": ["/ball?tab=motions", "SEE THE MOTIONS"],
  "publish-an-op-ed": ["/ball", "GO TO THE BALL"],
  "first-trade": ["/me/historikals", "YOUR HISTORIKALS"],
};

/** Quests the system counts for you: how to go about it, and where to go. */
const CUSTOM: Record<string, { text: string; link?: [string, string] }> = {
  "first-friend": {
    text: "Go to Side Quests, tap WITH SOMEONE, and find a Friend quest, like Human Friend or Elf Friend. Tap it, then scan their QR code from there. Any one of them counts.",
    link: ["/quests?mode=with#side-quests", "GO TO SIDE QUESTS"],
  },
  "first-words": { text: "Make a post from the Feed. Any post counts.", link: ["/post", "MAKE A POST"] },
  "show-and-tell": { text: "Make a post with a picture on it.", link: ["/post", "MAKE A POST"] },
  "a-helping-hand": { text: "Help someone with their problem, then tap I'm a Helper at the top of your Quests and scan their QR to confirm.", link: ["/quests", "GO TO YOUR QUESTS"] },
  "registered-plaintiff": { text: "Fill in the registration form. It asks who you are, where you live and your species.", link: ["/welcome", "OPEN THE FORM"] },
  "visit-the-well": { text: "Go to the Mana Well and answer one of its quests.", link: ["/well", "GO TO THE WELL"] },
  "ask-for-help": { text: "Go to your profile, tap your picture, choose ASK FOR HELP, and say what you need.", link: ["/me", "GO TO YOUR PROFILE"] },
  "top-five-in": { text: "Nothing to fill in: it happens when someone puts you in their Top 5. Meet people, whisper, make friends.", link: ["/people", "FIND PEOPLE"] },
  "got-token": { text: "Win someone's Proof: put yours up in a battle, and if they put theirs up too and you win, a copy of theirs is yours.", link: ["/people", "FIND PEOPLE"] },
  "gift-badge": { text: "Offer one of your Historikals to someone and ask for nothing back.", link: ["/me/historikals", "YOUR HISTORIKALS"] },
  "max-fifty": { text: "Your max mana grows with every badge you earn. Keep earning.", link: ["/quests", "GO TO YOUR QUESTS"] },
  "all-eight": { text: "Earn each of the first eight badges: the ones everyone starts with. Check what is still undone in Side Quests.", link: ["/quests#side-quests", "GO TO SIDE QUESTS"] },
  "tier-three": { text: "Keep going on a badge that has steps, like First Words or Visit the Mana Well, until you reach its third step.", link: ["/quests#side-quests", "GO TO SIDE QUESTS"] },
  "joined-in": { text: "Reply on posts in the Feed, five different ones. It counts from when you pick it.", link: ["/", "GO TO THE FEED"] },
  "whisper-web": { text: "Whisper to five different people. It counts from when you pick it.", link: ["/whispers", "GO TO WHISPERS"] },
  "a-voice-in-council": { text: "Vote on five motions in the Ball. It counts from when you pick it.", link: ["/ball?tab=motions", "SEE THE MOTIONS"] },
  "three-days": { text: "Post every day for five days in a row. It counts from when you pick it.", link: ["/post", "MAKE A POST"] },
  "first-like-given": { text: "Like a post every day for five days in a row.", link: ["/", "GO TO THE FEED"] },
  "first-like-got": { text: "Post something people like: ten likes on a single post.", link: ["/post", "MAKE A POST"] },
  "got-replied": { text: "Write a post that gets five replies.", link: ["/post", "MAKE A POST"] },
  "first-spend": { text: "Spend 200 mana in total, on whispers, posts and the like. Mana comes back at sunrise and from the Well.", link: ["/", "GO TO THE FEED"] },
  "full-well": { text: "Be at full mana when the day starts at 6 am, five days running. Don't spend it all.", link: ["/well", "GO TO THE WELL"] },
  "picture-wall": { text: "Post a picture on five different days.", link: ["/post", "MAKE A POST"] },
  "well-regular": { text: "Answer a Well quest on five different days.", link: ["/well", "GO TO THE WELL"] },
  "daily-whisper": { text: "Send a whisper every day for five days in a row.", link: ["/whispers", "GO TO WHISPERS"] },
  "pen-pal": { text: "Keep a whisper going with one person until you have traded twenty messages.", link: ["/whispers", "GO TO WHISPERS"] },
  "open-hand": { text: "Help someone on five different days, and scan their QR on I'm a Helper each time.", link: ["/quests", "GO TO YOUR QUESTS"] },
  "town-talk": { text: "Reply to posts from ten different people.", link: ["/", "GO TO THE FEED"] },
  "spread-the-love": { text: "Like posts from ten different people.", link: ["/", "GO TO THE FEED"] },
  "conversation-starter": { text: "Write three posts that each get three replies.", link: ["/post", "MAKE A POST"] },
  "keep-talking": { text: "Reply to a post every day for five days in a row.", link: ["/", "GO TO THE FEED"] },
};

const article = (t: string) => (/^[aeiou]/i.test(t) ? "an" : "a");

/** One quest in a list. Tap it (the badge or the name) and a tooltip opens in the middle of the screen
 *  saying how it is earned, with a button to scan a code if it needs one. A quest that needs scanning
 *  has a badge that trembles every few seconds. */
export function QuestRow({ b, face, rest, scan, bare }: { b: ShownBadge; face: React.ReactNode; rest: React.ReactNode; scan?: boolean; bare?: boolean }) {
  const [tip, setTip] = useState(false);
  const [scanning, setScanning] = useState(false);
  const slug = b.key.slice(2);
  const custom = CUSTOM[slug];
  const where = custom?.link ?? WHERE[slug];
  const kind = b.target ? `${article(targetLabel(b.target))} ${targetLabel(b.target).toLowerCase()}` : null;
  const delay = (Array.from(slug).reduce((n, c) => n + c.charCodeAt(0), 0) % 7) * 0.9;
  const open = () => setTip(true);
  // Helping never runs out: every confirmed help brings a Historikal, so it can always be scanned.
  const again = b.key === "a:a-helping-hand";
  // A side quest done before: ready to do again (a find draw, no new badge), or waiting out the month.
  const readyAgain = !!b.again?.ready;
  const canScan = !!scan && (b.locked || again || readyAgain);
  const againOn = b.again && !readyAgain ? new Date(b.again.at).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : null;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, width: bare ? undefined : "100%" }}>
        <button type="button" onClick={open} aria-label={`${b.title}: how to earn it`} className={scan && b.locked ? "tremble" : undefined} style={{ flex: "none", padding: 0, border: 0, background: "none", cursor: "pointer", lineHeight: 0, animationDelay: `${delay}s` }}>
          {face}
        </button>
        <button type="button" onClick={open} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, padding: 0, background: "none", border: 0, cursor: "pointer", color: "inherit", font: "inherit", textAlign: "left" }}>
          {rest}
        </button>
      </div>

      {tip ? (
        <div role="dialog" aria-label={b.title} onClick={() => setTip(false)} style={{ position: "fixed", inset: 0, zIndex: 85, background: "rgba(0,0,0,.6)", display: "grid", placeItems: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(340px, 100%)", background: "var(--blk)", border: 0, borderRadius: "var(--px-r)", padding: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
            <BadgeFace b={b} size={64} />
            <div className="px" style={{ fontSize: 12, lineHeight: 1.5, color: "var(--text)" }}>{b.title}</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--muted)" }}>{b.line}</div>
            {b.again ? (
              <div className="px" style={{ fontSize: 10, lineHeight: 1.6, color: readyAgain ? "var(--blu-soft)" : "var(--muted)" }}>
                {readyAgain ? "READY TO DO AGAIN · A FIND DRAW, NO NEW BADGE" : `AGAIN FROM ${againOn?.toUpperCase()} · A FIND DRAW EACH MONTH`}
              </div>
            ) : null}
            {b.locked || canScan || (readyAgain && b.request) ? (
              <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)" }}>
                {canScan
                  ? again
                    ? "Scan the code of the person you helped. It opens on their phone, and they have thirty seconds to give you the key. Every help brings a Historikal."
                    : `${kind ? `It has to be ${kind}. ` : ""}Scan ${kind ? `${kind}'s` : "their"} code. It opens on their phone, and they have thirty seconds to give you the key. They show their code from ME: tap their picture.`
                  : b.request
                    ? "Make a post that shows it. It is marked as a badge request, and when a witch likes it, the badge is yours."
                    : custom
                      ? custom.text
                      : b.auto
                        ? "You get this one on your own, the moment it is true."
                        : null}
              </div>
            ) : null}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 4 }}>
              {canScan ? (
                <button type="button" className="btn btn-purple" onClick={() => { setTip(false); setScanning(true); }} style={{ minHeight: 44 }}>
                  SCAN A CODE
                </button>
              ) : null}
              {(b.locked || readyAgain) && !scan && b.request ? (
                <Link href={`/post?badge=${slug}`} className="btn btn-purple" style={{ minHeight: 44, display: "inline-flex", alignItems: "center" }}>
                  MAKE THE POST →
                </Link>
              ) : null}
              {b.locked && !scan && !b.request && where ? (
                <Link href={where[0]} className="btn" style={{ minHeight: 44, display: "inline-flex", alignItems: "center" }}>
                  {where[1]} →
                </Link>
              ) : null}
              <button type="button" className="btn" onClick={() => setTip(false)} style={{ minHeight: 44 }}>
                CLOSE
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {scanning ? <QrScanner mode="quest" only={slug} title={b.title} how={b.line} onClose={() => setScanning(false)} /> : null}
    </>
  );
}
