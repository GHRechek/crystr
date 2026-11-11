/** The reactions a whisper can get. Six, and the database accepts only these. */
export const REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "🔥"] as const;

/** Pixel emoji reactions: stored as "pm-<n>" (the pictures now mostly from the icon pack, see scripts/pack-emoji.py), drawn from
 *  /emoji/pm-<n>.png. The quick row under a held whisper shows six; + opens all seventy. */
export const PIXEL_EMOJI = Array.from({ length: 70 }, (_, i) => `pm-${i + 1}`);
export const QUICK_PIXEL = ["pm-41", "pm-6", "pm-5", "pm-3", "pm-54", "pm-59"];

/** What each pixel emoji is, for screen readers and tooltips. */
export const PIXEL_NAMES: string[] = ["Angry Face with Horns", "Beaming Face with Smiling Eyes", "Downcast Face with Sweat", "Face Blowing a Kiss", "Face Screaming in Fear", "Face with Tears of Joy", "Flushed Face", "Grimacing Face", "Grinning Face", "Grinning Face with Big Eyes", "Grinning Face with Smiling Eyes", "Grinning Face with Sweat", "Grinning Squinting Face", "Hot Face", "Kissing Face", "Nauseated Face", "Nerd Face", "Pouting Face", "Rolling on the Floor Laughing", "Saluting Face", "Slightly Smiling Face", "Smiling Face with Heart-Eyes", "Smiling Face with Hearts", "Smiling Face with Horns", "Smiling Face with Smiling Eyes", "Smiling Face with Sunglasses", "Upside-Down Face", "Zany Face", "Black Heart", "Blue Heart", "Broken Heart", "Check Mark Button", "Green Heart", "Heart with Arrow", "High Voltage", "Hundred Points", "Orange Heart", "Party Popper", "Pile of Poo", "Purple Heart", "Red Heart", "Sparkles", "Two Hearts", "Yellow Heart", "Clapping Hands", "Flexed Biceps", "Folded Hands", "Handshake", "Heart Hands", "OK Hand", "Raising Hands", "Sign of the Horns", "Thumbs Down", "Thumbs Up", "Waving Hand", "Alien", "Cat Face", "Eyes", "Fire", "Herb", "Rainbow", "See-No-Evil Monkey", "Skull", "Alien Monster", "Collision", "Joystick", "Kiss Mark", "Money Bag", "Peach", "Rocket"];
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
