import Link from "next/link";
import { requireMe } from "@/lib/data";
import { reportBug } from "@/lib/actions";

/** Tell the organizers something is broken. Where you came from rides along. */
export default async function BugPage(props: { searchParams: Promise<{ from?: string }> }) {
  await requireMe();
  const { from } = await props.searchParams;
  const back = from && from.startsWith("/") && !from.startsWith("//") ? from.slice(0, 200) : "/";

  return (
    <form action={reportBug} className="pad" style={{ gap: 14 }}>
      <input type="hidden" name="from" value={back} />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href={back} className="btn btn-sm">
          ← BACK
        </Link>
      </div>

      <div>
        <h1 className="screen-title">REPORT A BUG</h1>
        <div className="screen-intro">
          Something not working, or not looking right? Tell us what you did and what happened. The
          page you were on and the kind of phone or browser you are using come along on their own.
        </div>
      </div>

      <div className="field">
        <label htmlFor="body">WHAT WENT WRONG</label>
        <textarea
          id="body"
          name="body"
          className="textarea"
          rows={7}
          required
          maxLength={1000}
          placeholder="I tapped … and expected … but instead …"
        />
      </div>

      <button type="submit" className="btn btn-lg btn-block btn-purple">
        SEND TO THE ORGANIZERS
      </button>
    </form>
  );
}
