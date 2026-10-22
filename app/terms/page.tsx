import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { acceptTerms } from "@/lib/actions";
import { TERMS_PARAGRAPHS, TERMS_VERSION } from "@/lib/terms";

export const dynamic = "force-dynamic";

/** The terms. A new arrival has to agree before they go any further; anyone can
 *  come back to read them. Lives outside the (app) group so the gate there cannot
 *  loop. */
export default async function TermsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: accepted } = await supabase
    .from("tos_acceptances")
    .select("version")
    .eq("user_id", user.id)
    .eq("version", TERMS_VERSION)
    .maybeSingle();

  return (
    <div className="stage">
      <div className="frame">
        <div className="statusbar">
          <span>--:--</span>
          <span className="where">THE CITY · THE GATE</span>
          <span aria-hidden>▓▓▓░</span>
        </div>

        <main className="screen">
          <div className="pad" style={{ gap: 14 }}>
            <div>
              <div className="screen-title">BEFORE YOU COME IN</div>
              <div className="screen-intro">
                {accepted
                  ? "The terms you agreed to."
                  : "A few words about how we treat each other here. Please read them through."}
              </div>
            </div>

            <div className="card" style={{ gap: 11 }}>
              <div className="px" style={{ fontSize: 8.5, color: "var(--mag)" }}>
                TERMS OF SERVICE
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-2)" }}>
                By agreeing to these terms of service you state that you have read and understand
                the following:
              </div>
              {TERMS_PARAGRAPHS.map((p, i) => (
                <div key={i} style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-2)" }}>
                  {p}
                </div>
              ))}
            </div>

            {accepted ? (
              <Link href="/me" className="btn btn-lg btn-block">
                ← BACK
              </Link>
            ) : (
              <form action={acceptTerms} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, lineHeight: 1.5 }}>
                  <input type="checkbox" name="agree" required style={{ marginTop: 3, width: 18, height: 18 }} />
                  <span>I have read and understand the above.</span>
                </label>
                <button type="submit" className="btn btn-lg btn-mag btn-block">
                  I AGREE · COME IN
                </button>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
