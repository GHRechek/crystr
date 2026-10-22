/** The reactions a whisper can get. Six, and the database accepts only these. */
export const REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "🔥"] as const;

/** Largest picture a whisper can carry, in bytes (the bucket enforces the same). */
export const WHISPER_IMAGE_MAX = 5 * 1024 * 1024;
export const WHISPER_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
