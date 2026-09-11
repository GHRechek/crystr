"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <main>
      <h1>CRYSTR</h1>
      <p className="muted">
        Sign in with Google. If you already use it on VLVT, you&apos;ll land
        here as a brand-new CRYSTR profile — the two apps don&apos;t share
        any data.
      </p>
      <button className="button" onClick={signInWithGoogle}>
        Sign in with Google
      </button>
    </main>
  );
}
