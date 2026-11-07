/** The reactions a whisper can get. Six, and the database accepts only these. */
export const REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "🔥"] as const;

/** The safety word on a whisper: "this caused off-game discomfort". Stored as a reaction. */
export const TOO_MUCH = "too-much";

/** Largest picture a whisper can carry, in bytes (the bucket enforces the same). */
export const WHISPER_IMAGE_MAX = 5 * 1024 * 1024;
export const WHISPER_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
