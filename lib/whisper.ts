/** The reactions a whisper can get. Six, and the database accepts only these. */
export const REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "🔥"] as const;

/** Pixel emoji reactions (the Pixelmeadow pack): stored as "pm-<n>", drawn from /emoji/pm-<n>.png. The quick row
 *  under a held whisper shows six; + opens all seventy. */
export const PIXEL_EMOJI = Array.from({ length: 70 }, (_, i) => `pm-${i + 1}`);
export const QUICK_PIXEL = ["pm-54", "pm-65", "pm-46", "pm-37", "pm-8", "pm-6"];
export const isPixelEmoji = (e: string) => /^pm-([1-9]|[1-6][0-9]|70)$/.test(e);

/** The safety word on a whisper: "this caused off-game discomfort". Stored as a reaction. */
export const TOO_MUCH = "too-much";

/** Off until the database accepts it (migration 20261108340000_too_much.sql). */
export const TOO_MUCH_ON = true;

/** Pixel reactions are off until the database accepts them (migration 20261108360000). Until then the old six show. */
export const PIXEL_REACTS_ON = true;

/** Largest picture a whisper can carry, in bytes (the bucket enforces the same). */
export const WHISPER_IMAGE_MAX = 5 * 1024 * 1024;
export const WHISPER_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
