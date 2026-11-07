import { EmojiImg } from "@/components/emoji-img";
import { PIXEL_EMOJI_RE, UNICODE_TO_PIXEL } from "@/lib/emoji-map";

/** Text with any emoji the app has drawn swapped for its pixel version (in the writer's skin, for the
 *  yellow ones). Emoji the set does not have stay as they are. */
export function EmojiText({ text, skin, size = 20 }: { text: string; skin?: string | null; size?: number }) {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(PIXEL_EMOJI_RE)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const key = UNICODE_TO_PIXEL[m[1]];
    out.push(key ? <EmojiImg key={at} e={key} skin={skin} size={size} style={{ display: "inline-block", verticalAlign: "-0.25em" }} /> : m[0]);
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
