// The rules of the City, in one place. The prices here are for display and
// for disabling buttons — the database charges them for real (see the cr_*
// functions), so nothing in this file is load-bearing for the economy.

export const MANA_CAP = 60;
export const OPENING_GRANT = 20;

export const COSTS = {
  post: 5,
  photo: 3,
  like: 1,
  whisper: 2,
  vote: 3,
  oped: 6,
  topEight: 4,
} as const;

/** Below eleven the feed starts to smear; at zero it is barely legible. */
export function decayLevel(mana: number): 0 | 1 | 2 | 3 {
  if (mana === 0) return 3;
  if (mana < 5) return 2;
  if (mana < 11) return 1;
  return 0;
}

export const DECAY_FILTER = [
  "none",
  "saturate(.85) contrast(.97)",
  "saturate(.6) contrast(.92) blur(.2px)",
  "saturate(.28) contrast(.85) blur(.5px)",
] as const;

export const SCAN_OPACITY = [0, 0.14, 0.3, 0.5] as const;

export const DECAY_NOTE = [
  "",
  "Below eleven. Things will begin to smear. Consider going outside before it gets embarrassing.",
  "Below five. Characters are starting to go. This is not a bug, it is an invoice.",
  "You are out of mana. The feed is still here, technically. Legibility is a premium feature.",
] as const;

const BLOCKS = ["█", "▓", "▒", "░"];

/** Eats characters at a rate set by the decay level — deterministically, so
 *  the server and the client agree on which ones went. */
export function corrupt(text: string, level: number): string {
  if (!level) return text;
  const rate = level === 1 ? 0.05 : level === 2 ? 0.16 : 0.34;
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const h = (text.charCodeAt(i) * 31 + i * 17) % 100;
    out += c !== " " && h < rate * 100 ? BLOCKS[(i + text.charCodeAt(i)) % 4] : c;
  }
  return out;
}

export function wellLine(mana: number): string {
  if (mana === 0) return "The well is dry. So are you.";
  if (mana < 11) return "Running low. The well is right there.";
  return "Enough for a few sincere thoughts.";
}

export function manaColor(mana: number): string {
  if (mana === 0) return "var(--mag)";
  if (mana < 11) return "var(--mag-soft)";
  return "var(--text)";
}

// ------------------------------------------------------------------ people

const AVATAR_COLORS = [
  "#e0398a",
  "#4c7df0",
  "#9184d9",
  "#f0a6c6",
  "#7ea6ff",
  "#b5abfc",
  "#c86fa8",
];

export const YOU_GRADIENT = "linear-gradient(135deg,#e0398a,#9184d9)";

/** Everyone gets a colour off the bi palette, picked from their id so it
 *  never changes under them. */
export function avatarBg(id: string, isYou = false): string {
  if (isYou) return YOU_GRADIENT;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function initial(handle: string | null | undefined): string {
  const h = (handle || "?").trim();
  return (h[0] || "?").toUpperCase();
}

// -------------------------------------------------------------------- time

/** The prototype's clock: 12M, 4H, YDAY, 6D. */
export function ago(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (mins < 1) return "NOW";
  if (mins < 60) return `${mins}M`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}H`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "YDAY";
  return `${days}D`;
}

/** The countdown on an open motion, as the board prints it. */
export function closesIn(iso: string): string {
  const mins = Math.floor((new Date(iso).getTime() - Date.now()) / 60000);
  if (mins <= 0) return "CLOSED";
  if (mins < 60) return `${mins}M`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}H`;
  return `${Math.floor(hours / 24)}D`;
}

export function untilReady(iso: string): string {
  const mins = Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 60000));
  if (mins < 60) return `${mins}M`;
  return `${Math.round(mins / 60)}H`;
}

export function readTime(body: string): string {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} MIN`;
}

export function paragraphs(body: string): string[] {
  return body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

/** "THE WELLWITCH · 2H" — the byline format the Ball uses. */
export function byline(
  handle: string,
  status: string,
  createdAt: string,
  publishedAt: string | null,
): string {
  const who = handle.toUpperCase();
  if (status === "published") return `${who} · ${ago(publishedAt || createdAt)}`;
  if (status === "pending") return `${who} · AWAITING A WITCH`;
  if (status === "returned") return `${who} · RETURNED`;
  return `${who} · UNPUBLISHED`;
}
