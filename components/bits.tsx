import { avatarBg, initial } from "@/lib/crystr";
import { AvatarSvg, normalize, type AvatarConfig } from "@/lib/avatar";
import type { Author } from "@/lib/data";

export function Avatar({
  person,
  you = false,
  size = 34,
  bg,
  glyph,
}: {
  person?: (Author & { avatar_config?: unknown }) | null;
  you?: boolean;
  size?: number;
  bg?: string;
  glyph?: string;
}) {
  // A built portrait wins; then a photo from the sign-in; then the letter
  // tile the prototype used.
  if (person?.avatar_config && !glyph) {
    return (
      <div className="avatar" style={{ width: size, height: size }}>
        <AvatarSvg config={normalize(person.avatar_config) as AvatarConfig} size={size} />
      </div>
    );
  }

  const background = bg ?? avatarBg(person?.id ?? "?", you);
  const label = glyph ?? initial(person?.handle);

  return (
    <div
      className="avatar"
      style={{ width: size, height: size, background, fontSize: Math.round(size * 0.35) }}
    >
      {person?.avatar_url && !glyph ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={person.avatar_url} alt="" />
      ) : (
        label
      )}
    </div>
  );
}

/** Every image in the prototype is a striped tile with a monospace label —
 *  kept as-is until there's somewhere to upload real ones. */
export function Placeholder({ label, height }: { label: string; height: number }) {
  return (
    <div className="placeholder" style={{ height }}>
      <span>{label}</span>
    </div>
  );
}
