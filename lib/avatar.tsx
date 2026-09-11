// The portrait builder. Original artwork, drawn as layered SVG on a 64×64
// grid with integer coordinates and crispEdges, so every edge lands on a
// pixel boundary and the whole thing reads 16-bit rather than smooth.
//
// Framed head-and-shoulders: the head fills most of the box and the body is
// only a collar, because these are worn at 28px in a whisper list.

export type AvatarConfig = {
  bg: number;
  skin: number;
  ears: number;
  hair: number;
  hairColor: number;
  brows: number;
  eyes: number;
  eyeColor: number;
  nose: number;
  mouth: number;
  mark: number;
  horns: number;
  extra: number;
  collar: number;
};

export const DEFAULT_AVATAR: AvatarConfig = {
  bg: 0, skin: 2, ears: 0, hair: 1, hairColor: 0, brows: 0, eyes: 0,
  eyeColor: 0, nose: 0, mouth: 0, mark: 0, horns: 0, extra: 0, collar: 0,
};

// ------------------------------------------------------------------ palettes

export const BG = [
  "#2a2146", "#1b1d29", "#3a1b34", "#1b2b3a", "#2b3320", "#3a2b1b", "#20203a",
];
export const SKIN = [
  "#f3d3c0", "#e8bb9b", "#d19a74", "#a9714d", "#7b4b32", "#4f2f20",
  "#c9d8c5", "#b9a7d8", "#8fb7c9",
];
export const HAIR = [
  "#2a2230", "#4a3524", "#8a5a33", "#c98b4b", "#e6d3a3", "#b6bdc9",
  "#e0398a", "#9184d9", "#4c7df0", "#3fae86", "#d94a3a", "#f0a6c6",
];
export const EYE = ["#3a2a20", "#4c7df0", "#3fae86", "#9184d9", "#a8641f", "#c9c9d4", "#e0398a"];

const LINE = "#1a1622";

export const OPTION_COUNTS = {
  bg: BG.length,
  skin: SKIN.length,
  ears: 2,
  hair: 9,
  hairColor: HAIR.length,
  brows: 5,
  eyes: 6,
  eyeColor: EYE.length,
  nose: 4,
  mouth: 6,
  mark: 6,
  horns: 5,
  extra: 5,
  collar: 5,
} as const;

function wrap(n: number, max: number) {
  return ((n % max) + max) % max;
}

export function normalize(raw: unknown): AvatarConfig {
  const c = (raw ?? {}) as Partial<AvatarConfig>;
  const out = { ...DEFAULT_AVATAR };
  (Object.keys(OPTION_COUNTS) as (keyof AvatarConfig)[]).forEach((k) => {
    const v = c[k];
    out[k] = typeof v === "number" && Number.isFinite(v) ? wrap(Math.floor(v), OPTION_COUNTS[k]) : out[k];
  });
  return out;
}

/** A portrait from an id, for anyone who hasn't built one. */
export function avatarFromId(id: string): AvatarConfig {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const pick = (n: number, salt: number) => Math.floor((((h >>> salt) ^ (h * (salt + 3))) >>> 0) % n);
  return normalize({
    bg: pick(BG.length, 1),
    skin: pick(SKIN.length, 3),
    ears: pick(2, 5),
    hair: pick(9, 7),
    hairColor: pick(HAIR.length, 9),
    brows: pick(5, 11),
    eyes: pick(6, 13),
    eyeColor: pick(EYE.length, 15),
    nose: pick(4, 17),
    mouth: pick(6, 19),
    mark: pick(6, 21),
    horns: pick(5, 2),
    extra: pick(5, 4),
    collar: pick(5, 6),
  });
}

// -------------------------------------------------------------------- layers

const R = (x: number, y: number, w: number, h: number, fill: string, key?: string) => (
  <rect key={key} x={x} y={y} width={w} height={h} fill={fill} />
);

// The skull occupies x 20–44, y 14–44. Hair sits on it with real volume:
// the cap overlaps the crown by several pixels rather than floating above it,
// and side panels start below the temple so they read as hair, not sideburns.
function Hair({ style, color, skin }: { style: number; color: string; skin: string }) {
  const dark = shade(color, -0.3);
  const lit = shade(color, 0.18);

  // Crown common to most styles: a 9px cap that eats into the forehead.
  const cap = (
    <>
      {R(19, 11, 26, 10, color)}
      {R(19, 11, 26, 2, lit)}
    </>
  );

  switch (style) {
    case 0: // shaved to the scalp
      return (
        <>
          {R(20, 13, 24, 4, color)}
          {R(20, 13, 24, 1, lit)}
        </>
      );
    case 1: // short crop
      return (
        <>
          {cap}
          {R(17, 15, 3, 9, color)}
          {R(44, 15, 3, 9, color)}
          {R(21, 19, 9, 2, dark)}
        </>
      );
    case 2: // long, past the shoulders
      return (
        <>
          {cap}
          {R(15, 15, 5, 33, color)}
          {R(44, 15, 5, 33, color)}
          {R(15, 15, 2, 33, lit)}
          {R(21, 19, 22, 2, dark)}
        </>
      );
    case 3: // heavy fringe
      return (
        <>
          {cap}
          {R(20, 21, 24, 4, color)}
          {R(17, 15, 3, 12, color)}
          {R(44, 15, 3, 12, color)}
          {R(23, 21, 4, 4, dark)}
          {R(33, 21, 4, 4, dark)}
        </>
      );
    case 4: // topknot
      return (
        <>
          {cap}
          {R(27, 4, 10, 9, color)}
          {R(29, 2, 6, 3, lit)}
          {R(26, 10, 12, 3, dark)}
        </>
      );
    case 5: // bob
      return (
        <>
          {cap}
          {R(16, 15, 5, 19, color)}
          {R(43, 15, 5, 19, color)}
          {R(16, 32, 5, 2, dark)}
          {R(43, 32, 5, 2, dark)}
        </>
      );
    case 6: // swept to one side
      return (
        <>
          {cap}
          {R(19, 21, 15, 4, color)}
          {R(19, 21, 15, 1, lit)}
          {R(44, 15, 3, 13, color)}
        </>
      );
    case 7: // spikes
      return (
        <>
          {cap}
          {R(20, 5, 5, 8, color)}
          {R(28, 3, 5, 10, color)}
          {R(37, 5, 5, 8, color)}
          {R(21, 5, 2, 6, lit)}
          {R(29, 3, 2, 8, lit)}
        </>
      );
    default: // wrapped in cloth, the way the seawall watch wear it
      return (
        <>
          {R(17, 9, 30, 12, color)}
          {R(17, 9, 30, 2, lit)}
          {R(15, 17, 4, 27, color)}
          {R(45, 17, 4, 27, color)}
          {R(19, 19, 26, 2, dark)}
          {R(22, 21, 20, 1, shade(skin, -0.2))}
        </>
      );
  }
}

function Eyes({ style, color }: { style: number; color: string }) {
  const white = "#f2f2f6";
  const L = 24;
  const Rt = 36;

  switch (style) {
    case 0: // open, round
      return (
        <>
          {[L, Rt].map((x) => (
            <g key={x}>
              {R(x, 30, 5, 4, white)}
              {R(x + 1, 31, 3, 3, color)}
              {R(x + 2, 32, 1, 1, LINE)}
            </g>
          ))}
        </>
      );
    case 1: // narrow
      return (
        <>
          {[L, Rt].map((x) => (
            <g key={x}>
              {R(x, 31, 5, 2, white)}
              {R(x + 1, 31, 2, 2, color)}
            </g>
          ))}
        </>
      );
    case 2: // wide
      return (
        <>
          {[L - 1, Rt].map((x) => (
            <g key={x}>
              {R(x, 29, 6, 6, white)}
              {R(x + 1, 30, 4, 4, color)}
              {R(x + 2, 31, 2, 2, LINE)}
            </g>
          ))}
        </>
      );
    case 3: // closed / content
      return (
        <>
          {R(L, 32, 5, 1, LINE)}
          {R(Rt, 32, 5, 1, LINE)}
        </>
      );
    case 4: // glowing — no sclera, all iris
      return (
        <>
          {R(L, 30, 5, 4, color)}
          {R(Rt, 30, 5, 4, color)}
          {R(L + 1, 31, 3, 2, shade(color, 0.5))}
          {R(Rt + 1, 31, 3, 2, shade(color, 0.5))}
        </>
      );
    default: // one eye covered
      return (
        <>
          {R(L, 30, 5, 4, white)}
          {R(L + 1, 31, 3, 3, color)}
          {R(Rt, 32, 5, 1, LINE)}
        </>
      );
  }
}

function Brows({ style, color }: { style: number; color: string }) {
  switch (style) {
    case 0:
      return (
        <>
          {R(24, 27, 5, 1, color)}
          {R(36, 27, 5, 1, color)}
        </>
      );
    case 1: // thick
      return (
        <>
          {R(23, 26, 6, 2, color)}
          {R(36, 26, 6, 2, color)}
        </>
      );
    case 2: // raised one
      return (
        <>
          {R(24, 27, 5, 1, color)}
          {R(36, 25, 5, 1, color)}
        </>
      );
    case 3: // angry
      return (
        <>
          {R(24, 26, 3, 1, color)}
          {R(27, 27, 2, 1, color)}
          {R(36, 27, 2, 1, color)}
          {R(38, 26, 3, 1, color)}
        </>
      );
    default:
      return null;
  }
}

function Mouth({ style, skin }: { style: number; skin: string }) {
  const lip = shade(skin, -0.45);
  switch (style) {
    case 0: // flat
      return R(29, 41, 6, 1, lip);
    case 1: // small smile
      return (
        <>
          {R(29, 41, 6, 1, lip)}
          {R(28, 40, 1, 1, lip)}
          {R(35, 40, 1, 1, lip)}
        </>
      );
    case 2: // open
      return (
        <>
          {R(29, 40, 6, 3, LINE)}
          {R(30, 41, 4, 1, "#c96b8a")}
        </>
      );
    case 3: // frown
      return (
        <>
          {R(29, 41, 6, 1, lip)}
          {R(28, 42, 1, 1, lip)}
          {R(35, 42, 1, 1, lip)}
        </>
      );
    case 4: // painted
      return (
        <>
          {R(28, 40, 8, 2, "#e0398a")}
          {R(29, 42, 6, 1, shade("#e0398a", -0.3))}
        </>
      );
    default: // smirk
      return (
        <>
          {R(29, 41, 5, 1, lip)}
          {R(34, 40, 2, 1, lip)}
        </>
      );
  }
}

function Mark({ style }: { style: number }) {
  switch (style) {
    case 1: // freckles
      return (
        <>
          {R(23, 36, 1, 1, "#b9805e")}
          {R(26, 37, 1, 1, "#b9805e")}
          {R(38, 36, 1, 1, "#b9805e")}
          {R(41, 37, 1, 1, "#b9805e")}
        </>
      );
    case 2: // scar over one eye
      return (
        <>
          {R(26, 26, 1, 10, "#b9805e")}
          {R(25, 28, 3, 1, "#b9805e")}
        </>
      );
    case 3: // sigil on the brow
      return (
        <>
          {R(31, 22, 2, 2, "#9184d9")}
          {R(29, 24, 6, 1, "#9184d9")}
          {R(31, 25, 2, 2, "#9184d9")}
        </>
      );
    case 4: // war paint across the eyes
      return (
        <>
          {R(21, 29, 8, 6, "rgba(224,57,138,.55)")}
          {R(35, 29, 8, 6, "rgba(224,57,138,.55)")}
        </>
      );
    case 5: // scales on the cheeks
      return (
        <>
          {R(21, 34, 2, 2, "rgba(76,125,240,.5)")}
          {R(24, 37, 2, 2, "rgba(76,125,240,.5)")}
          {R(39, 34, 2, 2, "rgba(76,125,240,.5)")}
          {R(42, 37, 2, 2, "rgba(76,125,240,.5)")}
        </>
      );
    default:
      return null;
  }
}

function Horns({ style, color }: { style: number; color: string }) {
  const tip = shade(color, 0.3);
  switch (style) {
    case 1: // curled ram, rooted at the temples
      return (
        <>
          {R(16, 15, 5, 5, color)}
          {R(12, 18, 5, 6, color)}
          {R(12, 23, 6, 4, color)}
          {R(16, 25, 4, 3, tip)}
          {R(43, 15, 5, 5, color)}
          {R(47, 18, 5, 6, color)}
          {R(46, 23, 6, 4, color)}
          {R(44, 25, 4, 3, tip)}
        </>
      );
    case 2: // straight, rising out of the skull
      return (
        <>
          {R(21, 8, 4, 8, color)}
          {R(21, 4, 3, 5, tip)}
          {R(39, 8, 4, 8, color)}
          {R(40, 4, 3, 5, tip)}
        </>
      );
    case 3: // antlers
      return (
        <>
          {R(22, 6, 3, 9, color)}
          {R(18, 8, 4, 2, color)}
          {R(18, 3, 3, 6, color)}
          {R(23, 2, 3, 5, tip)}
          {R(39, 6, 3, 9, color)}
          {R(42, 8, 4, 2, color)}
          {R(43, 3, 3, 6, color)}
          {R(38, 2, 3, 5, tip)}
        </>
      );
    case 4: // a circlet, worn over the hair
      return (
        <>
          {R(18, 18, 28, 3, "#c9a24b")}
          {R(18, 18, 28, 1, "#e6cd8a")}
          {R(29, 13, 6, 6, "#c9a24b")}
          {R(30, 14, 4, 4, "#4c7df0")}
        </>
      );
    default:
      return null;
  }
}

function Extra({ style }: { style: number }) {
  switch (style) {
    case 1: // round spectacles
      return (
        <>
          {R(22, 29, 8, 1, LINE)}
          {R(22, 34, 8, 1, LINE)}
          {R(22, 30, 1, 4, LINE)}
          {R(29, 30, 1, 4, LINE)}
          {R(34, 29, 8, 1, LINE)}
          {R(34, 34, 8, 1, LINE)}
          {R(34, 30, 1, 4, LINE)}
          {R(41, 30, 1, 4, LINE)}
          {R(30, 31, 4, 1, LINE)}
        </>
      );
    case 2: // eyepatch
      return (
        <>
          {R(34, 28, 9, 7, LINE)}
          {R(18, 30, 25, 1, LINE)}
        </>
      );
    case 3: // earrings
      return (
        <>
          {R(17, 34, 2, 2, "#c9a24b")}
          {R(45, 34, 2, 2, "#c9a24b")}
        </>
      );
    case 4: // a veil across the mouth
      return (
        <>
          {R(22, 38, 20, 8, "rgba(145,132,217,.75)")}
          {R(22, 38, 20, 1, "#b5abfc")}
        </>
      );
    default:
      return null;
  }
}

function Collar({ style, skin }: { style: number; skin: string }) {
  const cloth = ["#2b2e3d", "#7a2450", "#3b5aa8", "#5d5294", "#4a3524"][style] ?? "#2b2e3d";
  return (
    <>
      {R(26, 46, 12, 6, shade(skin, -0.12))}
      {R(14, 50, 36, 14, cloth)}
      {R(26, 50, 12, 4, shade(cloth, -0.3))}
      {R(24, 50, 2, 8, shade(cloth, 0.2))}
      {R(38, 50, 2, 8, shade(cloth, 0.2))}
    </>
  );
}

// ------------------------------------------------------------------ the face

/** Renders the portrait's contents. Wrap it in your own <svg viewBox="0 0 64 64">. */
export function AvatarArt({ config }: { config: AvatarConfig }) {
  const c = config;
  const skin = SKIN[c.skin];
  const hair = HAIR[c.hairColor];
  const eye = EYE[c.eyeColor];
  const shadow = shade(skin, -0.18);

  return (
    <g shapeRendering="crispEdges">
      {R(0, 0, 64, 64, BG[c.bg])}

      {/* Horns grow from behind the skull; the circlet is worn over the hair
          and so is drawn again after it. */}
      <Horns style={c.horns === 4 ? 0 : c.horns} color={shade(skin, -0.5)} />
      <Collar style={c.collar} skin={skin} />

      {/* ears — round or pointed */}
      {c.ears === 0 ? (
        <>
          {R(17, 32, 3, 5, skin)}
          {R(44, 32, 3, 5, skin)}
        </>
      ) : (
        <>
          {R(17, 30, 3, 7, skin)}
          {R(15, 26, 3, 6, skin)}
          {R(44, 30, 3, 7, skin)}
          {R(46, 26, 3, 6, skin)}
        </>
      )}

      {/* head */}
      {R(20, 14, 24, 30, skin)}
      {R(22, 44, 20, 3, skin)}
      {R(20, 14, 24, 2, shade(skin, 0.12))}
      {R(20, 40, 24, 4, shadow)}
      {R(22, 44, 20, 3, shadow)}

      <Hair style={c.hair} color={hair} skin={skin} />
      {c.horns === 4 ? <Horns style={4} color={shade(skin, -0.5)} /> : null}
      <Brows style={c.brows} color={shade(hair, -0.25)} />
      <Eyes style={c.eyes} color={eye} />

      {/* nose */}
      {c.nose === 0 ? R(31, 35, 2, 3, shadow) : null}
      {c.nose === 1 ? R(31, 36, 3, 2, shadow) : null}
      {c.nose === 2 ? (
        <>
          {R(31, 34, 2, 4, shadow)}
          {R(30, 37, 1, 1, shadow)}
        </>
      ) : null}
      {c.nose === 3 ? R(32, 37, 1, 1, shadow) : null}

      <Mouth style={c.mouth} skin={skin} />
      <Mark style={c.mark} />
      <Extra style={c.extra} />
    </g>
  );
}

export function AvatarSvg({
  config,
  size = 64,
  className,
}: {
  config: AvatarConfig;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="portrait"
      style={{ display: "block", imageRendering: "pixelated" }}
    >
      <AvatarArt config={config} />
    </svg>
  );
}

// ------------------------------------------------------------------- helpers

/** Lighten (t > 0) or darken (t < 0) a hex colour. */
function shade(hex: string, t: number): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const to = t < 0 ? 0 : 255;
  const amt = Math.abs(t);
  const parts = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16);
    return Math.round(v + (to - v) * amt)
      .toString(16)
      .padStart(2, "0");
  });
  return `#${parts.join("")}`;
}
