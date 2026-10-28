// The override: a witch's key against the registry, for the people the form cannot take.
// The key travels as a QR code pointing at /override/<code>; that route puts the code in a
// cookie and sends the person to /breach, where (signed in) it is spent. The cookie is what
// carries the key through the sign-in and the terms, so the page they come back to is the
// breach and not the form. The rules are in
// supabase/migrations/20261028080000_registry_override.sql.

export const BREACH_COOKIE = "crystr.breach";

/** What a key looks like: 32 hex characters from the database. */
export const KEY_PATTERN = /^[0-9a-f]{32}$/;

/** How long a scanned key waits in the cookie for the person to sign in. */
export const BREACH_MINUTES = 30;

/** The address a witch's QR code holds. */
export function overrideUrl(origin: string, code: string): string {
  return `${origin}/override/${code}`;
}
