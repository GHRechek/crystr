import { avatarSvg, avatarSvgForSeed, normalize } from "@/lib/avatar";
import type { Author } from "@/lib/data";

/** The portrait. A built one if they've made it, otherwise one derived from
 *  their id so everyone has a face from the moment they arrive. */
export function Avatar({
  person,
  size = 34,
  fill = false,
  bg,
  glyph,
}: {
  person?: (Author & { avatar_config?: unknown }) | null;
  size?: number;
  /** Fill the grid cell it sits in rather than a fixed size. */
  fill?: boolean;
  /** For the Ball's own byline, which isn't a person. */
  bg?: string;
  glyph?: string;
}) {
  const box = fill
    ? ({ width: "100%", aspectRatio: "1" } as const)
    : ({ width: size, height: size } as const);

  if (glyph) {
    return (
      <div
        className="avatar"
        style={{ ...box, background: bg, fontSize: Math.round(size * 0.35) }}
      >
        {glyph}
      </div>
    );
  }

  const svg = person?.avatar_config
    ? avatarSvg(normalize(person.avatar_config), size)
    : avatarSvgForSeed(person?.id ?? "nobody", size);

  return (
    <div className="avatar" style={box} dangerouslySetInnerHTML={{ __html: svg }} />
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
