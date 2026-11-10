"use client";

import { setSpriteOverrides, type SpriteOverride } from "@/lib/sprites";

/** Hands the override list to the client-side picture helpers, during render so every picture drawn after
 *  it in the tree already knows. Rendered first thing in the app layout. */
export function SpriteOverrides({ list }: { list: SpriteOverride[] }) {
  setSpriteOverrides(list);
  return null;
}
