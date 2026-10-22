/** Why the gate sent someone back to /login. The address carries only the code; the
 *  sentence shown for it lives here, so nobody can make the login page say
 *  something of their own. */
export type LoginProblem = "provider" | "nocode" | "exchange";

export const LOGIN_PROBLEMS: Record<LoginProblem, string> = {
  provider: "The sign-in was turned away before it reached us. Try once more; if it keeps happening, tell an organizer.",
  nocode:
    "The gate sent you back without a code. If you run this app, check that its /auth/callback URL is in the Supabase redirect allow-list.",
  exchange: "The gate could not finish signing you in. Try once more; if it keeps happening, tell an organizer.",
};
