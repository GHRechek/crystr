"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [busy, setBusy] = useState(false);

  async function signInWithGoogle() {
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="stage">
      <div className="frame">
        <div className="statusbar">
          <span>--:--</span>
          <span className="where">THE CITY · THE GATE</span>
          <span aria-hidden>▓▓▓░</span>
        </div>

        <main
          className="screen"
          style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}
        >
          <div className="pad" style={{ gap: 18 }}>
            <div>
              <div className="wordmark" style={{ fontSize: 30 }}>
                CRYSTR
              </div>
              <div
                className="px"
                style={{ fontSize: 8.5, color: "var(--dim)", marginTop: 8, lineHeight: 1.8 }}
              >
                THE CITY · THE NEW WORLD
              </div>
            </div>

            <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--text-3)" }}>
              Everything here costs mana. Posts, whispers, votes, opinions. The well
              refills for proof that you did something with your hands, your mouth, or
              two minutes of silence.
            </div>

            <div className="notice">
              Signing in with Google makes you a new arrival in The City. Nothing from
              any other app comes with you.
            </div>

            <button
              className="btn btn-lg btn-mag btn-block"
              onClick={signInWithGoogle}
              disabled={busy}
            >
              {busy ? "OPENING THE GATE…" : "SIGN IN WITH GOOGLE"}
            </button>

            <div className="empty" style={{ paddingTop: 0 }}>
              THE WELL DOES NOT DO CREDIT
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
