"use client";

import { applyPatches, type CreaturePatch } from "@/lib/catalogue";

/** Brings the creature editor's changes to the browser's copy of the catalogue. It sits first in the app's
 *  layout and applies them as it renders, so everything after it (cards, battles, the list) draws the edited
 *  creature. Renders nothing. */
export function CatalogueSync({ patches }: { patches: CreaturePatch[] }) {
  applyPatches(patches);
  return null;
}
