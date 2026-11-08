import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireMe, getTopFriends, getBadges, getBadgeItems, getToken, getPlaintiffSince, getProfileByHandle, getAllTokens, countHelps } from "@/lib/data";
import { openThread } from "@/lib/actions";
import { Avatar } from "@/components/bits";
import { TokenImage } from "@/components/badges";
import { AboutBadges } from "@/components/about-badges";
import { ProofMark } from "@/components/proof-mark";
import { ProfileDetails, type DetailKind } from "@/components/profile-details";
import { WorkingOn } from "@/components/working-on";
import { achievementGrid, resolveShown, resolveWorking, helpingRow, questGrid, firstStepGrid, firstStepsDone } from "@/lib/badges";
import { WitchFace } from "@/components/witch-face";
import { ago, corrupt, decayLevel, capOf, BADGE_MANA } from "@/lib/crystr";
import { bannerOf, bannerStyle } from "@/lib/banner";
import { formatBirthday } from "@/lib/birthday";
import { tokenTitle } from "@/lib/token";

/** Someone else's profile: who they are, what they say about themselves, who they
 *  rank, what they've earned and what they hold that could be traded. Their mana,
 *  ledger and anything private stays theirs. Your own handle sends you to your own
 *  page, where you can change things. */

export default async function PersonPage(props: { params: Promise<{ handle: string }> }) {
  const { handle: raw } = await props.params;
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

  const [top, badges, items, token, plaintiffSince, helps] = await Promise.all([
    getTopFriends(person.id),
    getBadges(person.id),
    getBadgeItems(person.id),
    getToken(person.id),
    getPlaintiffSince(person.id),
    countHelps(person.id),
  ]);
  const earned = badges.filter((b) => b.earned_at);
  const shown = resolveShown(person.shown_badges, badges, items, person.handle);
  const decay = decayLevel(me.mana, capOf(me));

  const days = Math.max(1, Math.round((Date.now() - new Date(person.created_at).getTime()) / 86_400_000));
  const details: { kind: DetailKind; value: string }[] = (
    [
      ["birthday", formatBirthday(person.birthday)],
      ["likes", person.likes],
      ["dislikes", person.dislikes],
      ["food", person.food],
      ["obsession", person.obsession],
    ] as [DetailKind, string | null | undefined][]
  ).flatMap(([kind, value]) => (value?.trim() ? [{ kind, value: value.trim() }] : []));

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* The banner, and their thought floating in it with its tail stepping down to the face, as on your own. */}
      <div style={{ position: "relative" }}>
        <div style={{ height: 112, ...bannerStyle(bannerOf(person)) }} />
        {person.mood ? (
          <div className="thought thought-still" style={{ position: "absolute", left: 104 + 28, right: 16, bottom: 30 }}>
            <span>{corrupt(person.mood, decay)}</span>
          </div>
        ) : null}
      </div>

      <div style={{ padding: "0 16px", marginTop: -52, position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
          {me.is_witch ? (
            <WitchFace person={person} species={person.species} quests={questGrid(badges).filter((b) => b.locked)} />
          ) : (
            <div style={{ width: 104, height: 104, flex: "none" }}>
              <Avatar person={person} size={104} />
            </div>
          )}
          <div style={{ minWidth: 0, flex: 1, marginBottom: -6 }}>
            <AboutBadges
                compact
                shown={shown}
                earned={achievementGrid(earned)}
                tradable={resolveShown(items.filter((i) => i.kind === "tradable").map((i) => `i:${i.id}`), badges, items, person.handle, 10000)}
              />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/" className="btn btn-sm" style={{ minHeight: 40 }}>
            ← BACK
          </Link>
          <form action={openThread} style={{ flex: 1 }}>
            <input type="hidden" name="other_id" value={person.id} />
            <button type="submit" className="btn btn-blue btn-block" style={{ minHeight: 40 }}>
              WHISPER
            </button>
          </form>
        </div>

        <div>
          {/* Their name, then their Proof beside it, as on your own profile. */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 className="px" style={{ fontSize: 21, fontWeight: 400, lineHeight: 1.4, overflowWrap: "anywhere", minWidth: 0 }}>
              {person.handle}
            </h1>
            {token?.design ? (
              <ProofMark design={token.design} title={tokenTitle(person.display_name, person.handle).toUpperCase()} line={token.how?.trim() || `Ask ${person.handle} what would make them risk it.`} />
            ) : null}
          </div>
          {person.display_name ? (
            <div className="px" style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5, overflowWrap: "anywhere" }}>
              {person.display_name}
            </div>
          ) : null}
          {person.pronouns ? (
            <div className="px" style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5, overflowWrap: "anywhere" }}>{person.pronouns}</div>
          ) : null}
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--text-3)", textWrap: "pretty" }}>
          {corrupt(person.bio || "Nothing written here yet.", decay)}
        </div>
        <ProfileDetails rows={details.map((d) => ({ kind: d.kind, value: corrupt(d.value, decay) }))} />

        {top.length ? (
          <div>
            <div className="px" style={{ fontSize: 12, color: "var(--blu-soft)", marginBottom: 8 }}>
              TOP 5
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 6 }}>
              {top.slice(0, 5).map((f) => (
                <Link
                  key={f.id}
                  href={`/u/${f.handle}`}
                  style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "center", color: "inherit", textDecoration: "none" }}
                >
                  <div style={{ width: "100%" }}>
                    <Avatar person={f} size={72} fill />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                    {f.handle}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {plaintiffSince ? (
          <div className="tile" style={{ padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <div className="px" style={{ fontSize: 11, color: "var(--blu-soft)" }}>
              ✓ REGISTERED PLAINTIFF
            </div>
            <span className="spacer" />
            <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
              SINCE {ago(plaintiffSince).toUpperCase()}
            </div>
          </div>
        ) : null}

        {helpingRow(badges, helps) ? <WorkingOn bare person={{ id: person.id, handle: person.handle }} items={[helpingRow(badges, helps)!]} /> : null}
        {firstStepsDone(badges) ? (
          <WorkingOn person={{ id: person.id, handle: person.handle }} items={resolveWorking(person.working_on, badges, person.working_on?.some((k) => k.startsWith("t:")) ? await getAllTokens(person.id) : [])} />
        ) : (
          // Still on their first steps: that is what they are working on.
          <WorkingOn person={{ id: person.id, handle: person.handle }} heading="FIRST STEPS" total={firstStepGrid(badges).length} items={firstStepGrid(badges)} />
        )}

      </div>
    </div>
  );
}
