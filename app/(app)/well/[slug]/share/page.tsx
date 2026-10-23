import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMe, getShareable } from "@/lib/data";
import { shareQuest } from "@/lib/actions";

/** Right after handing something in at the Well: would you like it on the feed? */
export default async function SharePage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const { userId } = await requireMe();
  const item = await getShareable(userId, slug);
  // Nothing to show (the sit-still quest, say): straight back to the feed.
  if (!item || (!item.image_url && !item.note)) redirect("/");

  const wroteIt = !item.image_url && !!item.note;

  return (
    <form action={shareQuest} className="pad" style={{ gap: 14 }}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="submission" value={item.id} />

      <div>
        <h1 className="screen-title">WANT TO SHOW IT OFF?</h1>
        <div className="screen-intro">
          The Well has it, and the mana is yours. If you like, it can go on the feed too, for the
          whole City to see. Sharing costs you nothing.
        </div>
      </div>

      <div className="card" style={{ gap: 10 }}>
        <div className="px" style={{ fontSize: 11, color: "var(--mag-soft)" }}>
          FROM THE WELL · {item.quest_title.toUpperCase()}
        </div>
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt="What you handed in"
            style={{ display: "block", width: "100%", maxHeight: 420, objectFit: "contain", borderRadius: 4, background: "var(--inset)" }}
          />
        ) : null}
        {wroteIt ? (
          <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", color: "var(--text-2)" }}>{item.note}</div>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="caption">SAY SOMETHING ABOUT IT (OPTIONAL)</label>
        <textarea
          id="caption"
          name="caption"
          className="textarea"
          rows={3}
          maxLength={500}
          placeholder={item.image_url ? "A line about what you made, or how it felt." : "A line to go with it."}
        />
      </div>

      <button type="submit" className="btn btn-lg btn-block btn-purple">
        POST IT TO THE FEED
      </button>
      <button type="submit" name="skip" value="1" formNoValidate className="btn btn-lg btn-block">
        NO THANKS, KEEP IT PRIVATE
      </button>
      <Link href="/" className="sr-only">
        Back to the feed
      </Link>
    </form>
  );
}
