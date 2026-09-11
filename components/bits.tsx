import { faceFromId, normalizeFace, packFace } from "@/lib/faces/core";
import type { Author } from "@/lib/data";

/** The portrait. A built face if they've made one, otherwise one derived from
 *  their id so everyone has a face the moment they arrive. The image itself is
 *  composed by /face/<packed>.png and cached forever. */
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

  const config = person?.avatar_config
    ? normalizeFace(person.avatar_config)
    : faceFromId(person?.id ?? "nobody");

  return (
    <div className="avatar" style={box}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/face/${packFace(config)}.png`} alt="" width={size} height={size} />
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
