// Shared between the server action that sets a toast and the client component
// that renders it, so neither has to import the other's runtime.

export type Flash = { k: string; t: string; e: string };

export const FLASH_COOKIE = "cr_flash";

export const EDGE = {
  mag: "#e0398a",
  blue: "#4c7df0",
  purple: "#9184d9",
} as const;
