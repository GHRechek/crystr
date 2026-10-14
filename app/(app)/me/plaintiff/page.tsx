import Link from "next/link";
import { requireMe, getPlaintiffSince } from "@/lib/data";
import { registerPlaintiff } from "@/lib/actions";
import { PLAINTIFF_FORM_EMBED, PLAINTIFF_FORM_URL } from "@/lib/plaintiff";
import { ago } from "@/lib/crystr";

/** Become a Registered Plaintiff: fill in the form, then say so. */
export default async function PlaintiffPage() {
  const { userId } = await requireMe();
  const since = await getPlaintiffSince(userId);

  return (
    <div className="pad" style={{ gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/me" className="btn btn-sm">
          ← ME
        </Link>
        <div className="spacer" />
        {since ? (
          <span className="px" style={{ fontSize: 9, color: "var(--blu-soft)" }}>
            ✓ REGISTERED
          </span>
        ) : null}
      </div>

      <div>
        <div className="screen-title">REGISTERED PLAINTIFF</div>
        <div className="screen-intro">
          {since
            ? `You have been a Registered Plaintiff since ${ago(since)}. Thank you. There is nothing more to do here.`
            : "Fill in the form below to go on the City's books as a Registered Plaintiff. When you have sent it in, come back and tell us, and the title is yours."}
        </div>
      </div>

      {since ? null : (
        <>
          <div className="tile" style={{ padding: 0, overflow: "hidden" }}>
            <iframe
              title="Registered Plaintiff form"
              src={PLAINTIFF_FORM_EMBED}
              style={{ width: "100%", height: 640, border: 0, background: "#fff", display: "block" }}
              loading="lazy"
            >
              Loading…
            </iframe>
          </div>

          <a
            href={PLAINTIFF_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm"
            style={{ alignSelf: "flex-start" }}
          >
            FORM NOT SHOWING? OPEN IT IN A NEW TAB ↗
          </a>

          <form action={registerPlaintiff} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button type="submit" className="btn btn-lg btn-purple btn-block">
              I HAVE SENT IN THE FORM
            </button>
            <div style={{ fontSize: 11, lineHeight: 1.5, color: "var(--muted)" }}>
              Only press this once you have sent the form in. We take your word for it.
            </div>
          </form>
        </>
      )}
    </div>
  );
}
